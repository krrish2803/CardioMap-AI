import { create } from 'zustand';
import { getPredictions } from '../api/predict';
import { getSchema } from '../api/schema';
import { getMetrics, getSamplePatients } from '../api/metrics';
import { DEFAULT_CAMERA, VESSEL_CONFIGS } from '../config/vessels';

let debounceTimeout = null;

// What-If slider drags fire a fast probabilities-only predict (explain: false).
// Once the input settles, a follow-up request recomputes SHAP so the
// explanation panels catch up to the final what-if state.
let explainRefreshTimeout = null;
const EXPLAIN_REFRESH_MS = 1200;

// Monotonic request id: rapid slider drags can resolve out of order, so late
// responses must not overwrite newer intent.
let predictionRequestId = 0;
let initPromise = null;

function clearDebounce() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
  }
}

function clearExplainRefresh() {
  if (explainRefreshTimeout) {
    clearTimeout(explainRefreshTimeout);
    explainRefreshTimeout = null;
  }
}

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
      clearDebounce();
      debounceTimeout = setTimeout(() => {
        debounceTimeout = null;
        get().runPrediction(updated, { explain: false });
      }, 300);

      clearExplainRefresh();
      explainRefreshTimeout = setTimeout(() => {
        explainRefreshTimeout = null;
        get().runPrediction(get().features, { explain: true, silent: true });
      }, EXPLAIN_REFRESH_MS);
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
    clearDebounce();
    clearExplainRefresh();
    set({
      selectedSampleId: sampleId,
      features: { ...sample.features },
    });
    get().runPrediction(sample.features);
  },

  // Execute prediction. Stale responses are discarded so the newest slider
  // state always wins regardless of response order. `explain: false` skips
  // the SHAP pass server-side; the previous explanation is retained so the
  // panels do not blank out mid-drag. `silent` avoids re-triggering the
  // loading indicator for the background explanation refresh.
  runPrediction: async (customFeatures = null, { explain = true, silent = false } = {}) => {
    const feat = customFeatures || get().features;
    const requestId = ++predictionRequestId;
    if (!silent) set({ loading: true });
    try {
      const { data, isSimulation, error } = await getPredictions(feat, { explain });
      if (requestId !== predictionRequestId) return;
      const prev = get().predictions;
      const predictions = explain || !prev
        ? data
        : {
            ...data,
            shap: prev.shap,
            base_value: prev.base_value,
            explanation_space: prev.explanation_space,
            measurements: prev.measurements,
          };
      set({
        predictions,
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
    if (!val) {
      clearDebounce();
      clearExplainRefresh();
    }
    set({ whatIfMode: val });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowRwmaHighlight: (val) => set({ showRwmaHighlight: val }),
  setPrefersReducedMotion: (val) => set({ prefersReducedMotion: val }),

  resetCamera: () => {
    clearDebounce();
    clearExplainRefresh();
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
