import { create } from 'zustand';
import { getPredictions } from '../api/predict';
import { getSchema } from '../api/schema';
import { getMetrics, getSamplePatients } from '../api/metrics';
import { DEFAULT_CAMERA, VESSEL_CONFIGS } from '../config/vessels';

let debounceTimeout = null;

// Monotonic request id: rapid slider drags can resolve out of order, so late
// responses must not overwrite newer intent.
let predictionRequestId = 0;
let initPromise = null;

const DEFAULT_SAMPLE_KEY = 'high';

function pickInitialSample(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  // The live backend returns `sample-high`; the bundled mock uses `patient-high`.
  // Match on either so the app boots on the intended archetype in both modes.
  const preferred = samples.find(
    (s) => s.id === 'sample-high' || s.id === 'patient-high'
  );
  return preferred || samples[0];
}

export const useStore = create((set, get) => ({
  // Core state
  features: {},
  schema: null,
  metrics: null,
  samplePatients: [],
  selectedSampleId: '',

  // Predictions output
  predictions: null,
  isSimulation: false,
  loading: false,
  error: null,
  
  // Navigation view mode
  viewMode: 'story', // 'story' | 'dashboard'
  setViewMode: (mode) => set({ viewMode: mode }),

  // Interaction & visual state
  selectedTarget: 'LAD', // "cad" | "LAD" | "LCX" | "RCA"
  hoveredVessel: null,   // null | "LAD" | "LCX" | "RCA"
  whatIfMode: true,      // default on for live recoloring feedback
  activeTab: 'summary',  // "summary" | "explain" | "inputs" | "model"
  showRwmaHighlight: true,
  prefersReducedMotion: false,
  
  // Camera state triggers
  cameraPreset: DEFAULT_CAMERA,
  cameraResetNonce: 0,

  // Initialize data. Guarded so StrictMode's double-invoke cannot race two
  // concurrent initializations into a non-deterministic final state.
  initStore: async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        set({ loading: true, error: null });
        const [schemaData, metricsData, samplesData] = await Promise.all([
          getSchema(),
          getMetrics(),
          getSamplePatients(),
        ]);

        // Determine initial features: from selected sample or schema defaults
        const initialSample = pickInitialSample(samplesData);
        const initialFeatures = initialSample ? { ...initialSample.features } : {};

        // Fallback to schema defaults if any missing
        schemaData.groups.forEach((group) => {
          group.fields.forEach((field) => {
            if (initialFeatures[field.key] === undefined) {
              initialFeatures[field.key] = field.default;
            }
          });
        });

        // Check system reduced motion
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        set({
          schema: schemaData,
          metrics: metricsData,
          samplePatients: samplesData,
          selectedSampleId: initialSample ? initialSample.id : '',
          features: initialFeatures,
          prefersReducedMotion: prefersReduced,
        });

        // Execute initial prediction through runPrediction so it shares the
        // same request-sequencing path as every later prediction.
        await get().runPrediction(initialFeatures);
      } catch (err) {
        console.error('Failed to initialize CardioMap store:', err);
        set({ error: err.message, loading: false });
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  },

  // Set single feature with debounced prediction in what-if mode
  setFeature: (key, value) => {
    const updated = { ...get().features, [key]: value };
    set({ features: updated, selectedSampleId: 'custom' });

    if (get().whatIfMode) {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        debounceTimeout = null;
        get().runPrediction(updated);
      }, 300);
    }
  },

  // Update batch features
  setFeatures: (newFeatures) => {
    set({ features: { ...newFeatures } });
    get().runPrediction(newFeatures);
  },

  // Load a sample patient
  loadSamplePatient: (sampleId) => {
    const sample = get().samplePatients.find((s) => s.id === sampleId);
    if (!sample) {
      console.warn(`[CardioMap] sample '${sampleId}' not found.`);
      return;
    }
    // Cancel any pending debounced prediction so it cannot land after this.
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    set({
      selectedSampleId: sampleId,
      features: { ...sample.features },
    });
    get().runPrediction(sample.features);
  },

  // Execute prediction. Stale responses are discarded so the newest slider
  // state always wins regardless of response order.
  runPrediction: async (customFeatures = null) => {
    const feat = customFeatures || get().features;
    const requestId = ++predictionRequestId;
    set({ loading: true });
    try {
      const { data, isSimulation, error } = await getPredictions(feat);
      if (requestId !== predictionRequestId) return;
      set({
        predictions: data,
        isSimulation,
        error: error || null,
        loading: false,
      });
    } catch (err) {
      if (requestId !== predictionRequestId) return;
      set({ error: err.message, loading: false });
    }
  },

  // Vessel / Target selection
  setSelectedTarget: (target) => {
    if (VESSEL_CONFIGS[target]) {
      // Clone the preset so CameraRig's [cameraPreset] effect re-fires on every
      // vessel change, not just the first visit to each one.
      set({
        selectedTarget: target,
        cameraPreset: { ...VESSEL_CONFIGS[target].cameraPreset },
      });
    } else {
      // Closing the selection ('cad') has no vessel preset; snap back to the
      // default view instead of leaving the camera parked on the last vessel.
      set({ selectedTarget: target, cameraPreset: { ...DEFAULT_CAMERA } });
    }
  },

  setHoveredVessel: (vesselId) => set({ hoveredVessel: vesselId }),
  setWhatIfMode: (val) => {
    if (!val && debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    set({ whatIfMode: val });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowRwmaHighlight: (val) => set({ showRwmaHighlight: val }),
  setPrefersReducedMotion: (val) => set({ prefersReducedMotion: val }),

  resetCamera: () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    // Clone so the object identity changes: CameraRig keys its lerp effect on
    // [cameraPreset], and assigning the same DEFAULT_CAMERA reference never
    // re-fired it.
    set((state) => ({
      cameraPreset: { ...DEFAULT_CAMERA },
      cameraResetNonce: state.cameraResetNonce + 1,
      selectedTarget: 'cad',
    }));
  },
}));
