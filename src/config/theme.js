import * as THREE from 'three';

// Colorblind-safe Risk Gradient: Blue -> Yellow -> Orange -> Magenta (Avoids Red / Green)
export const RISK_GRADIENT_STOPS = [
  { threshold: 0.0, color: '#3B82F6', label: 'Minimal Risk (<20%)', name: 'Minimal' },
  { threshold: 0.25, color: '#FACC15', label: 'Mild Risk (20–45%)', name: 'Mild' },
  { threshold: 0.55, color: '#FB923C', label: 'Moderate Risk (45–70%)', name: 'Moderate' },
  { threshold: 0.80, color: '#D946EF', label: 'Severe Risk (≥70%)', name: 'Severe' },
];

export const SHAP_COLORS = {
  positive: '#00F0FF', // Pushes risk UP (cyan)
  negative: '#F59E0B', // Pushes risk DOWN (amber)
};

export const CLINICAL_THEME = {
  bg: '#070B14',
  surface: '#0D1527',
  surfaceElevated: '#131F37',
  border: '#1E2D4A',
  borderGlow: 'rgba(0, 240, 255, 0.25)',
  cyanAccent: '#00F0FF',
  cyanGlow: '#38BDF8',
  neutralInactive: '#4B5563',
  neutralWireframe: '#1F2937',
};

/**
 * Interpolate hex color based on continuous probability (0.0 to 1.0)
 * Uses standard Three.js Color lerp
 */
export function getRiskColorHex(probability) {
  const p = Math.max(0, Math.min(1, Number(probability) || 0));

  const cBlue = new THREE.Color('#3B82F6');    // 0.0 - 0.20
  const cYellow = new THREE.Color('#FACC15');  // 0.40
  const cOrange = new THREE.Color('#FB923C');  // 0.65
  const cMagenta = new THREE.Color('#D946EF'); // 1.00

  const target = new THREE.Color();

  if (p <= 0.33) {
    target.lerpColors(cBlue, cYellow, p / 0.33);
  } else if (p <= 0.66) {
    target.lerpColors(cYellow, cOrange, (p - 0.33) / 0.33);
  } else {
    target.lerpColors(cOrange, cMagenta, (p - 0.66) / 0.34);
  }

  return '#' + target.getHexString();
}

/**
 * Returns qualitative classification and badge styles
 */
export function getRiskTier(probability) {
  const p = Number(probability) || 0;
  if (p < 0.20) {
    return {
      tier: 'Minimal',
      label: 'Minimal Stenosis Risk',
      color: '#3B82F6',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      description: 'Hemodynamically non-significant lesion probability.',
    };
  }
  if (p < 0.45) {
    return {
      tier: 'Mild',
      label: 'Mild Atherosclerotic Burden',
      color: '#FACC15',
      badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      description: 'Borderline or early subclinical plaque accumulation.',
    };
  }
  if (p < 0.70) {
    return {
      tier: 'Moderate',
      label: 'Moderate Stenosis Likelihood',
      color: '#FB923C',
      badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      description: 'Probable flow-limiting vessel narrowing requiring clinical review.',
    };
  }
  return {
    tier: 'Severe',
    label: 'High / Severe Stenosis Likelihood',
    color: '#D946EF',
    badgeClass: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
    description: 'High confidence probability of ≥50% lumen reduction.',
  };
}
