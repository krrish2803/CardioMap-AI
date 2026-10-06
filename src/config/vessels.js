import * as THREE from 'three';
import LCX_QUANTILES from './LCX_quantiles.json';
import RCA_QUANTILES from './RCA_quantiles.json';

export const CAD_CONFIG = {
  id: 'cad',
  name: 'Overall CAD Status',
  abbreviation: 'CAD',
  auc: 0.93,
  isWeak: false,
  confidenceLabel: 'High confidence (AUC 0.93)',
  confidenceBadge: null, // Normal coloring
};

export const VESSEL_CONFIGS = {
  LAD: {
    id: 'LAD',
    name: 'Left Anterior Descending',
    abbreviation: 'LAD',
    territory: 'Anterior Wall & Interventricular Septum (The "Widowmaker")',
    clinicalRole: 'Supplies ~45-55% of the left ventricular myocardium. Ischemia here carries high risk of anterior infarction.',
    auc: 0.85,
    isWeak: false,
    confidenceLabel: 'Good confidence (AUC 0.85)',
    confidenceBadge: null, // Normal coloring
    // Control points for CatmullRomCurve3 wrapping the heart surface
    controlPoints: [
      [0.18, 0.75, 0.42],
      [0.32, 0.45, 0.72],
      [0.36, 0.12, 0.82],
      [0.28, -0.32, 0.76],
      [0.22, -0.72, 0.62],
      [0.14, -1.08, 0.38],
    ],
    tubeRadius: 0.038,
    labelOffset: [0.42, 0.15, 0.9],
    cameraPreset: {
      position: [0.6, 0.2, 3.2],
      target: [0.25, -0.2, 0.4],
    },
  },
  LCX: {
    id: 'LCX',
    name: 'Left Circumflex Artery',
    abbreviation: 'LCX',
    territory: 'Lateral & Posterior Left Ventricular Wall',
    clinicalRole: 'Branches from the left main coronary artery to perfuse posterolateral myocardium. Subtle ECG manifestations.',
    auc: 0.75,
    isWeak: true,
    confidenceLabel: 'low-confidence model (AUC 0.75)',
    confidenceBadge: 'low-confidence model (AUC 0.75)',
    controlPoints: [
      [0.22, 0.74, 0.40],
      [0.65, 0.58, 0.36],
      [0.96, 0.32, 0.12],
      [1.08, -0.05, -0.22],
      [0.82, -0.42, -0.52],
      [0.48, -0.78, -0.42],
    ],
    tubeRadius: 0.034,
    labelOffset: [1.12, 0.15, 0.0],
    cameraPreset: {
      position: [3.0, 0.6, -0.5],
      target: [0.65, 0.0, -0.2],
    },
  },
  RCA: {
    id: 'RCA',
    name: 'Right Coronary Artery',
    abbreviation: 'RCA',
    territory: 'Right Ventricle, Inferior LV Wall, SA & AV Nodes',
    clinicalRole: 'Supplies right ventricle and conduction nodal systems. Inter-patient variability in dominance.',
    auc: 0.71,
    isWeak: true,
    confidenceLabel: 'low-confidence model (AUC 0.71)',
    confidenceBadge: 'low-confidence model (AUC 0.71)',
    controlPoints: [
      [-0.22, 0.78, 0.38],
      [-0.68, 0.56, 0.46],
      [-0.94, 0.18, 0.28],
      [-0.98, -0.25, -0.05],
      [-0.72, -0.62, -0.32],
      [-0.32, -0.92, -0.22],
      [-0.08, -1.12, 0.04],
    ],
    tubeRadius: 0.036,
    labelOffset: [-1.08, 0.1, 0.35],
    cameraPreset: {
      position: [-3.0, 0.5, 0.8],
      target: [-0.55, -0.25, 0.1],
    },
  },
};

/**
 * Returns empirical percentile rank (0-100) for weak vessel targets in dataset
 */
export function getDatasetPercentileRank(vesselId, probability) {
  const quantiles =
    vesselId === 'LCX'
      ? LCX_QUANTILES
      : vesselId === 'RCA'
      ? RCA_QUANTILES
      : null;
  if (!quantiles) return null;

  let rank = 0;
  for (let i = 0; i < quantiles.length; i++) {
    if (probability >= quantiles[i]) {
      rank = i;
    } else {
      break;
    }
  }
  return Math.min(Math.max(rank, 1), 99);
}

/**
 * Formats clinical risk display with confidence badges and percentile ranking for modest models
 */
export function formatVesselRiskPresentation(targetId, probability) {
  const prob = Number(probability ?? 0);
  const percent = Math.round(prob * 100);

  if (targetId === 'cad') {
    return {
      targetId: 'cad',
      isWeak: false,
      primaryText: `${percent}%`,
      secondaryText: 'Probability estimate (AUC 0.93)',
      confidenceBadge: null,
      rankText: null,
      auc: 0.93,
    };
  }

  const config = VESSEL_CONFIGS[targetId];
  if (!config) {
    return {
      targetId,
      isWeak: false,
      primaryText: `${percent}%`,
      secondaryText: 'Probability estimate',
      confidenceBadge: null,
      rankText: null,
    };
  }

  if (config.isWeak) {
    const rank = getDatasetPercentileRank(targetId, prob) ?? percent;
    let band = 'Typical risk';
    let bandDesc = 'Typical risk band in this dataset';
    if (rank > 66) {
      band = 'Higher risk';
      bandDesc = `Higher risk than ${rank}% of patients in this dataset`;
    } else if (rank < 33) {
      band = 'Lower risk';
      bandDesc = `Lower risk than typical patients in this dataset (${rank}th percentile)`;
    } else {
      band = 'Typical risk';
      bandDesc = `Typical risk band in this dataset (${rank}th percentile)`;
    }

    return {
      targetId,
      isWeak: true,
      band,
      primaryText: band,
      rank,
      rankText: bandDesc,
      confidenceBadge: config.confidenceBadge,
      auc: config.auc,
      note: 'A ~0.70-0.75 AUC model supports relative risk strata, not precise scalar probabilities.',
    };
  }

  // LAD (Good confidence)
  return {
    targetId,
    isWeak: false,
    band: `${percent}%`,
    primaryText: `${percent}%`,
    secondaryText: 'Probability estimate (AUC 0.85)',
    confidenceBadge: null,
    rankText: null,
    auc: config.auc,
  };
}

export const DEFAULT_CAMERA = {
  position: [0.0, 0.4, 4.2],
  target: [0.0, -0.1, 0.0],
};

/**
 * Build 3D curves from control points
 */
export function createVesselCurve(vesselId) {
  const config = VESSEL_CONFIGS[vesselId];
  if (!config) return null;
  const vectors = config.controlPoints.map(
    ([x, y, z]) => new THREE.Vector3(x, y, z)
  );
  return new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0.5);
}
