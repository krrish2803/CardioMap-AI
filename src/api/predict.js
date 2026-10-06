/**
 * CardioMap 3D — Predictive API Interface
 *
 * Talks to the live FastAPI backend. If the backend is unreachable the caller
 * receives a clearly-labelled simulation instead, so a connection failure is
 * never mistaken for a real prediction.
 */

export const USE_MOCK = false;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Cold artifact load on the backend takes ~0.3s and each inference runs four
// SHAP explainers (~70ms). The old 1200ms budget aborted the first request
// after every server start and silently substituted a simulation.
const REQUEST_TIMEOUT_MS = 10000;

export const SIMULATION_DISCLAIMER =
  'SIMULATED RESULT — the CardioMap backend was unreachable, so these values are NOT a prediction for this patient. Restart the FastAPI service and retry.';

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Deterministic offline stand-in that mirrors the live response contract.
 * Reads the same canonical schema keys the store holds (Age, BP, LDL, EF-TTE,
 * Region RWMA, ...) so sliders actually move the output.
 */
function buildSimulatedResponse(features) {
  const f = {
    age: num(features.Age, 58),
    sex: num(features.Sex, 1),
    currentSmoker: num(features['Current Smoker'], 0),
    exSmoker: num(features['EX-Smoker'], 0),
    familyHistory: num(features.FH, 0),
    hypertension: num(features.HTN, 1),
    diabetes: num(features.DM, 0),
    systolic_bp: num(features.BP, 130),
    pulse: num(features.PR, 70),
    bmi: num(features.BMI, 26.8),
    typicalPain: num(features['Typical Chest Pain'], 1),
    atypicalPain: num(features.Atypical, 0),
    nonanginalPain: num(features.Nonanginal, 0),
    exertionalPain: num(features['Exertional CP'], 0),
    stElevation: num(features['ST Elevation'], 0),
    stDepression: num(features['ST Depression'], 0),
    tInversion: num(features.Tinversion, 0),
    qWave: num(features['Q Wave'], 0),
    lvh: num(features.LVH, 0),
    fbs: num(features.FBS, 98),
    ldl: num(features.LDL, 100),
    hdl: num(features.HDL, 39),
    tg: num(features.TG, 122),
    lvef: num(features['EF-TTE'], 50),
    rwma: features['Region RWMA'] ?? '0',
  };

  let baseScore = 0;
  baseScore += ((f.age - 50) / 35) * 0.22;
  baseScore += f.sex === 1 ? 0.07 : -0.03;
  baseScore += f.currentSmoker === 1 ? 0.16 : f.exSmoker === 1 ? 0.06 : -0.05;
  baseScore += f.familyHistory === 1 ? 0.08 : 0;
  baseScore += f.hypertension === 1 ? 0.1 : 0;
  baseScore += f.diabetes === 1 ? 0.11 : 0;
  baseScore += ((f.systolic_bp - 120) / 60) * 0.14;
  baseScore += ((f.ldl - 100) / 100) * 0.15;
  baseScore += ((50 - f.hdl) / 30) * 0.08;
  baseScore += ((f.fbs - 100) / 80) * 0.09;
  baseScore += ((55 - f.lvef) / 30) * 0.12;
  baseScore += f.typicalPain === 1 ? 0.14 : f.atypicalPain === 1 ? -0.05 : 0;

  const ecgSeverity =
    (f.stElevation === 1 ? 0.22 : 0) +
    (f.stDepression === 1 ? 0.12 : 0) +
    (f.tInversion === 1 ? 0.11 : 0) +
    (f.qWave === 1 ? 0.18 : 0) +
    (f.lvh === 1 ? 0.05 : 0);

  // Region RWMA codes: 0 none, 1 anterior, 2 septal, 3 inferior, 4 lateral
  const isAnterior = f.rwma === '1';
  const isSeptal = f.rwma === '2';
  const isInferior = f.rwma === '3';
  const isLateral = f.rwma === '4';

  let ladScore = 0.32 + baseScore * 0.65 + ecgSeverity * 0.8;
  if (isAnterior) ladScore += 0.32;
  if (isSeptal) ladScore += 0.24;

  let lcxScore = 0.24 + baseScore * 0.55 + ecgSeverity * 0.5;
  if (isLateral) lcxScore += 0.35;
  if (f.ldl > 160) lcxScore += 0.06;

  let rcaScore = 0.28 + baseScore * 0.6 + ecgSeverity * 0.6;
  if (isInferior) rcaScore += 0.34;
  if (f.currentSmoker === 1) rcaScore += 0.07;

  const clampProb = (val) => {
    const raw = 1 / (1 + Math.exp(-val * 3.5));
    return Math.max(0.04, Math.min(0.96, Math.round(raw * 100) / 100));
  };

  const pLAD = clampProb(ladScore);
  const pLCX = clampProb(lcxScore);
  const pRCA = clampProb(rcaScore);
  const independentNoCAD = (1 - pLAD) * (1 - pLCX) * (1 - pRCA);
  const pCAD = Math.max(0.05, Math.min(0.98, Math.round((1 - independentNoCAD * 0.68) * 100) / 100));

  const RWMA_LABELS = {
    0: 'Normal Kinesis',
    1: 'Anterior Hypokinesia',
    2: 'Anteroseptal Hypokinesia',
    3: 'Inferior Hypokinesia',
    4: 'Lateral Hypokinesia',
  };
  const rwmaDisplay = RWMA_LABELS[String(f.rwma)] || 'Normal Kinesis';
  const rwmaContrib =
    isAnterior || isSeptal ? 0.18 : isLateral ? 0.17 : isInferior ? 0.16 : -0.06;

  const ecgDisplay =
    f.stElevation === 1 ? 'ST Elevation'
      : f.stDepression === 1 ? 'ST Depression'
        : f.tInversion === 1 ? 'T-Wave Inversion'
          : f.qWave === 1 ? 'Pathological Q Wave'
            : 'No Ischaemic ECG Change';

  // Canonical feature names, matching the backend schema, so the SHAP panel and
  // measurement lookup resolve against the same keys the live API returns.
  const buildAttributions = (targetType) => {
    const round4 = (n) => Math.round(n * 10000) / 10000;
    const raw = [
      { feature: 'Age', value: f.age, contribution: round4(((f.age - 52) / 30) * 0.15) },
      { feature: 'BP', value: f.systolic_bp, contribution: round4(((f.systolic_bp - 125) / 50) * 0.12) },
      { feature: 'LDL', value: f.ldl, contribution: round4(((f.ldl - 110) / 100) * 0.15) },
      { feature: 'HDL', value: f.hdl, contribution: round4(((45 - f.hdl) / 40) * 0.08) },
      { feature: 'EF-TTE', value: f.lvef, contribution: round4(((55 - f.lvef) / 30) * 0.12) },
      { feature: 'FBS', value: f.fbs, contribution: round4(((f.fbs - 100) / 80) * 0.09) },
      { feature: 'Current Smoker', value: f.currentSmoker, contribution: f.currentSmoker === 1 ? 0.16 : -0.05 },
      { feature: 'Typical Chest Pain', value: f.typicalPain, contribution: f.typicalPain === 1 ? 0.14 : -0.04 },
      { feature: 'Atypical', value: f.atypicalPain, contribution: f.atypicalPain === 1 ? -0.05 : 0.02 },
      { feature: 'ST Elevation', value: f.stElevation, contribution: f.stElevation === 1 ? 0.22 : 0 },
      { feature: 'ST Depression', value: f.stDepression, contribution: f.stDepression === 1 ? 0.12 : 0 },
      { feature: 'Region RWMA', value: String(f.rwma), contribution: round4(rwmaContrib) },
      { feature: 'HTN', value: f.hypertension, contribution: f.hypertension === 1 ? 0.1 : 0 },
      { feature: 'DM', value: f.diabetes, contribution: f.diabetes === 1 ? 0.11 : 0 },
      { feature: 'FH', value: f.familyHistory, contribution: f.familyHistory === 1 ? 0.08 : 0 },
    ];

    const totalAbs = raw.reduce((acc, c) => acc + Math.abs(c.contribution), 0) || 1;

    return raw
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .map((c) => ({
        ...c,
        // Backend emits a PERCENTAGE (0-100); match it exactly.
        relative_contribution: round4((Math.abs(c.contribution) / totalAbs) * 100),
      }));
  };

  const targets = {
    cad: { probability: pCAD, threshold: 0.41, label: pCAD >= 0.41 ? 'CAD' : 'Normal' },
    LAD: { probability: pLAD, threshold: 0.48, label: pLAD >= 0.48 ? 'Stenosis' : 'Normal' },
    LCX: { probability: pLCX, threshold: 0.45, label: pLCX >= 0.45 ? 'Stenosis' : 'Normal' },
    RCA: { probability: pRCA, threshold: 0.42, label: pRCA >= 0.42 ? 'Stenosis' : 'Normal' },
  };

  const shap = {
    cad: buildAttributions('cad'),
    LAD: buildAttributions('LAD'),
    LCX: buildAttributions('LCX'),
    RCA: buildAttributions('RCA'),
  };

  const MEASUREMENT_META = [
    ['Age', 'Demographic', 'years', [18, 65]],
    ['BP', 'Clinical examination', 'mmHg', [90, 130]],
    ['LDL', 'Laboratory', 'mg/dL', [0, 100]],
    ['HDL', 'Laboratory', 'mg/dL', [40, 60]],
    ['TG', 'Laboratory', 'mg/dL', [0, 150]],
    ['FBS', 'Laboratory', 'mg/dL', [70, 99]],
    ['EF-TTE', 'Echocardiography', '%', [50, 70]],
    ['BMI', 'Demographic', 'kg/m^2', [18.5, 24.9]],
    ['PR', 'Clinical examination', 'bpm', [60, 100]],
    ['Current Smoker', 'Demographic', null, null],
    ['Typical Chest Pain', 'Clinical examination', null, null],
    ['HTN', 'Clinical examination', null, null],
    ['DM', 'Clinical examination', null, null],
    ['FH', 'Clinical examination', null, null],
    ['ST Elevation', 'ECG', null, null],
    ['ST Depression', 'ECG', null, null],
  ];

  const cadLookup = Object.fromEntries(shap.cad.map((c) => [c.feature, c]));

  const measurements = MEASUREMENT_META.map(([feature, group, unit, reference_range]) => {
    const c = cadLookup[feature];
    let flag = 'unknown';
    const val = features[feature];
    if (val !== undefined && val !== null && !Number.isNaN(Number(val))) {
      if (reference_range) {
        const n = Number(val);
        flag = n < reference_range[0] ? 'low' : n > reference_range[1] ? 'high' : 'normal';
      } else {
        flag = 'unknown';
      }
    }
    return {
      feature,
      group,
      value: val === undefined ? null : val,
      unit,
      reference_range,
      flag,
      contribution: c?.contribution ?? 0,
      relative_contribution: c?.relative_contribution ?? 0,
    };
  }).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const supplied = Object.keys(features || {}).filter(
    (k) => features[k] !== null && features[k] !== undefined && !Number.isNaN(features[k])
  );

  return {
    cad: targets.cad,
    vessels: { LAD: targets.LAD, LCX: targets.LCX, RCA: targets.RCA },
    shap,
    base_value: { cad: 0.5, LAD: 0.5, LCX: 0.5, RCA: -0.1755 },
    explanation_space: { cad: 'probability', LAD: 'probability', LCX: 'probability', RCA: 'log-odds' },
    measurements,
    imputed_features: supplied.length === 0 ? [] : [],
    model_version: 'simulation',
    disclaimer: SIMULATION_DISCLAIMER,
    is_simulation: true,
    ecg_display: ecgDisplay,
    rwma_display: rwmaDisplay,
  };
}

/**
 * Predict risk from patient features.
 *
 * Resolves to `{ data, isSimulation, error }`. The caller decides how to present
 * a simulation — it is never silently substituted for a real prediction.
 */
export async function getPredictions(features) {
  if (USE_MOCK) {
    await new Promise((res) => setTimeout(res, 60));
    return { data: buildSimulatedResponse(features), isSimulation: true, error: null };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body?.detail) {
          detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        }
      } catch {
        // Non-JSON error body; keep the status-code message.
      }
      throw new Error(detail);
    }

    const data = await response.json();
    return { data, isSimulation: false, error: null };
  } catch (err) {
    const reason =
      err?.name === 'AbortError'
        ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
        : err?.message || 'network error';
    console.warn(`[CardioMap] /predict failed (${reason}); returning a labelled simulation.`);
    return {
      data: buildSimulatedResponse(features),
      isSimulation: true,
      error: `Backend unreachable: ${reason}. Showing simulated values, not a prediction.`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}