/**
 * Regional Wall Motion Abnormality (RWMA) helpers.
 *
 * The canonical schema key is `Region RWMA`, not `rwma`, and its values are the
 * string codes "0".."4":
 *   0 none | 1 anterior | 2 septal | 3 inferior | 4 lateral
 *
 * Components previously read `features.rwma` and compared against
 * 'anteroseptal' / 'lateral' / 'inferior', so the highlight and badge never
 * rendered. Read through these helpers instead.
 */

export const RWMA_FEATURE_KEY = 'Region RWMA';

const RWMA_TERRITORIES = {
  0: null,
  1: { id: 'anterior', label: 'Anterior', vessel: 'LAD' },
  2: { id: 'septal', label: 'Septal', vessel: 'LAD' },
  3: { id: 'inferior', label: 'Inferior', vessel: 'RCA' },
  4: { id: 'lateral', label: 'Lateral', vessel: 'LCX' },
};

/** Normalize "4" | 4 | undefined -> "4" | undefined. */
export function normalizeRwmaCode(value) {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value).trim();
}

/** Territory record for a RWMA code, or null when absent/none/unrecognized. */
export function getRwmaTerritory(value) {
  const code = normalizeRwmaCode(value);
  if (code === undefined) return null;
  return RWMA_TERRITORIES[code] ?? null;
}

/** Human-readable RWMA label, e.g. "Anterior" / "Normal Kinesis". */
export function getRwmaLabel(value) {
  const territory = getRwmaTerritory(value);
  return territory ? territory.label : 'Normal Kinesis';
}

/** Territory read straight off the live feature bag. */
export function getRwmaTerritoryFromFeatures(features) {
  return getRwmaTerritory(features?.[RWMA_FEATURE_KEY]);
}