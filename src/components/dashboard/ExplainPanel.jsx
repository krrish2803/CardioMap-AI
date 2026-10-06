import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { VESSEL_CONFIGS } from '../../config/vessels';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ShieldCheck,
  Image as ImageIcon,
  X,
  Layers,
  Activity
} from 'lucide-react';

// Colorblind-safe palette: Amber for risk-elevating (+), Cyan for protective/risk-lowering (-)
const CB_COLORS = {
  elevatesRisk: '#F59E0B',    // Amber
  decreasesRisk: '#00F0FF',   // Cyan
  neutral: '#94A3B8',
};

const FEATURE_CLINICAL_INFO = {
  'Typical Chest Pain': {
    category: 'Symptom',
    normalRange: 'Absent (0)',
    note: 'Carries ~2× weight of next feature (r = +0.995 with CAD risk in beeswarm).',
  },
  'Age': {
    category: 'Demographic',
    normalRange: '< 65 yrs',
    note: 'Vascular age factor (r = +0.917 with CAD risk in beeswarm).',
  },
  'EF-TTE': {
    category: 'Echocardiogram',
    normalRange: '50% - 70%',
    note: 'Preserved EF pushes CAD risk downward (r = -0.764 in beeswarm).',
  },
  'Atypical': {
    category: 'Symptom',
    normalRange: 'Absent (0)',
    note: 'Atypical CP presentation pushes CAD risk downward (r = -0.987 in beeswarm).',
  },
  'Atypical Chest Pain': {
    category: 'Symptom',
    normalRange: 'Absent (0)',
    note: 'Atypical CP presentation pushes CAD risk downward (r = -0.987 in beeswarm).',
  },
  'HTN': {
    category: 'Vascular History',
    normalRange: 'No (0)',
    note: 'Documented hypertension history (r = +0.974 in beeswarm).',
  },
  'BP': {
    category: 'Hemodynamics',
    normalRange: '90 - 130 mmHg',
    note: 'Systolic blood pressure at presentation (r = +0.820 in beeswarm).',
  },
  'LDL': {
    category: 'Lipid Panel',
    normalRange: '< 100 mg/dL',
    note: 'Low-density lipoprotein atherogenic fraction (r = +0.188 in beeswarm).',
  },
  'HDL': {
    category: 'Lipid Panel',
    normalRange: '> 40 mg/dL',
    note: 'High-density lipoprotein fraction.',
  },
  'TG': {
    category: 'Lipid Panel',
    normalRange: '< 150 mg/dL',
    note: 'Circulating triglycerides substrate.',
  },
  'FBS': {
    category: 'Metabolic',
    normalRange: '< 100 mg/dL',
    note: 'Fasting blood glucose.',
  },
  'Current Smoker': {
    category: 'Lifestyle',
    normalRange: 'No (0)',
    note: 'Active tobacco use status.',
  },
  'Diastolic Murmur': {
    category: 'Physical Exam',
    normalRange: 'Absent (0)',
    note: 'Diastolic cardiac murmur finding.',
  },
  'Dyspnea': {
    category: 'Symptom',
    normalRange: 'Absent (0)',
    note: 'Exertional dyspnea presentation.',
  },
  'Region RWMA': {
    category: 'Echocardiogram',
    normalRange: 'None (0)',
    note: 'Input echocardiographic wall motion finding (0=none).',
  },
};

export function ExplainPanel() {
  const selectedTarget = useStore((s) => s.selectedTarget);
  const setSelectedTarget = useStore((s) => s.setSelectedTarget);
  const predictions = useStore((s) => s.predictions);
  const [showPlotModal, setShowPlotModal] = useState(false);

  const targets = [
    { id: 'cad', label: 'Overall CAD', auc: '0.93' },
    { id: 'LAD', label: 'LAD', auc: '0.85' },
    { id: 'LCX', label: 'LCX', auc: '0.75', isWeak: true },
    { id: 'RCA', label: 'RCA', auc: '0.71', isWeak: true },
  ];

  const currentTarget = selectedTarget || 'cad';
  const currentConfig = VESSEL_CONFIGS[currentTarget];
  const isWeakTarget = currentTarget === 'LCX' || currentTarget === 'RCA';
  const targetShapData = predictions?.shap?.[currentTarget] || [];

  // Transform data for horizontal bar chart
  const chartData = targetShapData.slice(0, 10).map((item) => ({
    name: item.feature,
    value: item.contribution,
    patientValue: item.value,
    isPositive: item.contribution >= 0,
  }));

  const targetTitle =
    currentTarget === 'cad'
      ? 'Overall CAD Risk Drivers'
      : `${currentConfig?.name || currentTarget} Risk Drivers`;

  const populationPlotUrl =
    currentTarget === 'cad'
      ? '/reports/shap_beeswarm_cad.png'
      : `/reports/shap_summary_${currentTarget}.png`;

  // Req 3c: All patient measurements ranked by contribution to overall CAD prediction
  const measurements = predictions?.measurements || [];
  const cadShapList = predictions?.shap?.cad || [];

  return (
    <div className="space-y-4">
      {/* Target Toggle Tabs */}
      <div className="flex p-1 bg-surface-elevated/70 rounded-xl border border-border gap-1">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTarget(t.id)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              currentTarget === t.id
                ? t.isWeak
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t.label}</span>
            <span className="text-[10px] opacity-75 font-mono">({t.auc})</span>
          </button>
        ))}
      </div>

      {/* Target Specific Clinical Callout */}
      {isWeakTarget ? (
        <div className="px-3.5 py-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300 font-mono">
              low-confidence model (AUC {currentConfig?.auc})
            </span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Explanation stability on {currentTarget} is weak (Spearman rank correlation $r_s \approx 0.43$). These feature weights reflect secondary cohort associations rather than localized vascular anatomy.
          </p>
        </div>
      ) : (
        <div className="px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-2.5 text-xs text-cyan-200">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-cyan-300">
              Verified Directionality on Development Set (N=242)
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Typical Chest Pain carries ~2× the statistical weight of any secondary feature ($r = +0.995$ with CAD risk). Preserved LVEF ($r = -0.764$) and Atypical symptoms ($r = -0.987$) push estimated risk downward.
            </p>
          </div>
        </div>
      )}

      {/* Header with clinical disclaimer & Population Beeswarm launcher */}
      <div className="bg-surface/60 border border-border/80 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-bold text-sm text-white">{targetTitle}</h3>
          </div>
          <button
            onClick={() => setShowPlotModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-[11px] text-cyan-300 hover:text-white hover:border-cyan-400/60 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Population Beeswarm</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Additive SHAP values quantify statistical feature weighting in probability space for this patient. Does not represent biological causation.
        </p>
      </div>

      {/* Colorblind-Safe Legend (Cyan & Amber) */}
      <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-900/70 rounded-lg border border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CB_COLORS.elevatesRisk }} />
          <span className="text-amber-300 font-medium">(+) Pushes risk upward</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CB_COLORS.decreasesRisk }} />
          <span className="text-cyan-300 font-medium">(-) Pushes risk downward</span>
        </div>
      </div>

      {/* SHAP Horizontal Bar Chart */}
      <div className="h-64 sm:h-72 w-full bg-surface/30 border border-border/50 rounded-xl p-2.5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[-0.35, 0.35]}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              tickFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
              stroke="#334155"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: '#CBD5E1', fontSize: 11 }}
              stroke="#334155"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs backdrop-blur-md">
                    <p className="font-semibold text-white mb-1">{d.name}</p>
                    <p className="text-slate-400">
                      Patient finding: <strong className="text-cyan-300">{d.patientValue}</strong>
                    </p>
                    <p className="mt-1 font-mono">
                      Contribution:{' '}
                      <strong
                        style={{
                          color: d.isPositive ? CB_COLORS.elevatesRisk : CB_COLORS.decreasesRisk,
                        }}
                      >
                        {d.value > 0 ? `+${d.value}` : d.value}
                      </strong>
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine x={0} stroke="#64748B" strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPositive ? CB_COLORS.elevatesRisk : CB_COLORS.decreasesRisk}
                  fillOpacity={0.88}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Req 3c: Complete Patient Clinical Biomarkers Registry (Tied to Overall CAD Prediction) */}
      <div className="rounded-xl border border-border overflow-hidden bg-surface/50">
        <div className="px-3.5 py-2.5 bg-surface-elevated/70 border-b border-border/70 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-display font-bold text-white">
              Patient Clinical Biomarkers & CAD Attribution (Req 3c)
            </h4>
            <p className="text-[10px] text-slate-400">
              Contributions to Overall CAD Risk • Relative weight (%) across all measurements
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
            {measurements.length > 0 ? `${measurements.length} Measurements` : `${cadShapList.length} Findings`}
          </span>
        </div>

        <div className="divide-y divide-border/40 text-xs max-h-72 overflow-y-auto">
          {(measurements.length > 0 ? measurements : cadShapList).map((item, idx) => {
            const featName = item.feature;
            const contrib = Number(item.contribution ?? 0);
            const isPos = contrib >= 0;
            // Backend and the simulation both emit a PERCENTAGE (0-100) here.
            const relContrib = item.relative_contribution
              ? `${Number(item.relative_contribution).toFixed(1)}%`
              : null;
            const meta = FEATURE_CLINICAL_INFO[featName] || {
              category: item.group || 'Clinical Finding',
              normalRange: item.reference_range ? `${item.reference_range[0]} - ${item.reference_range[1]}` : 'Cohort typical',
              note: 'Statistical risk predictor.',
            };

            const displayValue = item.value !== null && item.value !== undefined ? String(item.value) : 'Measured';

            return (
              <div
                key={idx}
                className="p-2.5 hover:bg-surface-elevated/30 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{featName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                      {item.group || meta.category}
                    </span>
                    {item.unit && (
                      <span className="text-[10px] text-slate-500 font-mono">({item.unit})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono font-bold">
                    {relContrib && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Weight: {relContrib}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {isPos ? (
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span
                        style={{
                          color: isPos ? CB_COLORS.elevatesRisk : CB_COLORS.decreasesRisk,
                        }}
                      >
                        {contrib > 0 ? `+${contrib.toFixed(3)}` : contrib.toFixed(3)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div>
                    Finding: <strong className="text-cyan-300 font-mono">{displayValue} {item.unit || ''}</strong>
                    <span className="mx-2 text-slate-600">•</span>
                    Ref: <span className="text-slate-300">{meta.normalRange}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  {meta.note}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Beeswarm Modal */}
      {showPlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-display font-bold text-white text-base">
                  Empirical Cohort SHAP Distribution ({currentTarget.toUpperCase()})
                </h4>
                <p className="text-xs text-slate-400">
                  Trained tree-based model on development set (N=242, 80% split) • Z-Alizadeh Sani Cohort
                </p>
              </div>
              <button
                onClick={() => setShowPlotModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/40 flex items-center justify-center p-2">
              <img
                src={populationPlotUrl}
                alt={`SHAP population summary for ${currentTarget}`}
                className="max-h-[65vh] w-auto object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/reports/shap_beeswarm_cad.png';
                }}
              />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Interpretation Note:</strong> Each point represents one patient. Red points denote high feature values and blue points denote low feature values. Horizontal position represents positive (elevates risk) or negative (lowers risk) attribution.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
