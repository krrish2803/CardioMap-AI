import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  Maximize2,
  AlertTriangle,
  X
} from 'lucide-react';

const TARGET_ORDER = ['cad', 'LAD', 'LCX', 'RCA'];
const TARGET_LABELS = {
  cad: 'Overall CAD',
  LAD: 'LAD Model',
  LCX: 'LCX Model',
  RCA: 'RCA Model',
};
const SHORT_TARGET_LABELS = {
  cad: 'CAD',
  LAD: 'LAD',
  LCX: 'LCX',
  RCA: 'RCA',
};

/**
 * metrics.json keys are `cad`/`LAD`/`LCX`/`RCA`, but the Signal baseline table
 * labels its first row `CAD`. Look-ups used to call `.toLowerCase()`, which made
 * `lad`/`lcx`/`rca` miss the store and silently fall back to hardcoded values.
 */
function targetKey(label) {
  return label === 'CAD' ? 'cad' : label;
}

/**
 * The backend exports calibration slope/intercept in no artifact, so these remain
 * a hardcoded reference table from the training run. Everything else in this panel
 * is read live from /metrics (metrics.json).
 */
const CALIBRATION_PARAMS = {
  cad: {
    slope: 1.649,
    intercept: 0.230,
    note: 'Slope 1.65: probabilities compressed toward middle (underconfident); true empirical risk varies across a wider range.',
    errPlot: '/reports/calibration_cad.png',
    hasErrorBars: false,
  },
  LAD: {
    slope: 1.695,
    intercept: -0.063,
    note: 'Slope 1.70: modest compression; empirical probabilities more dispersed than model outputs.',
    errPlot: '/reports/calibration_LAD.png',
    hasErrorBars: false,
  },
  LCX: {
    slope: 3.272,
    intercept: 0.417,
    note: 'Slope 3.27: severe compression into 0.24–0.65 span; top quantile observes 76% vs 65% predicted.',
    errPlot: '/reports/calibration_with_err_LCX.png',
    hasErrorBars: true,
  },
  RCA: {
    slope: 1.814,
    intercept: 0.323,
    note: 'Slope 1.81: upper quantiles (bins 8–9) predict 63–70% but observe 46% true stenosis.',
    errPlot: '/reports/calibration_with_err_RCA.png',
    hasErrorBars: true,
  },
};

function metricValue(metricsBlock, name, fallback = 0) {
  const entry = metricsBlock?.[name];
  if (entry === undefined || entry === null) return fallback;
  if (typeof entry === 'number') return entry;
  return typeof entry.value === 'number' ? entry.value : fallback;
}

function metricCi(metricsBlock, name) {
  const ci = metricsBlock?.[name]?.ci_95;
  return Array.isArray(ci) && ci.length === 2 ? ci : null;
}

function formatCi(metricsBlock, name, digits = 2) {
  const ci = metricCi(metricsBlock, name);
  return ci ? `[${ci[0].toFixed(digits)}, ${ci[1].toFixed(digits)}]` : '[CI n/a]';
}

const SIGNAL_BASELINE_DATA = [
  {
    target: 'CAD',
    devPrevalence: '71.5% (173/242)',
    fullPrevalence: '71.3%',
    majorityAcc: '0.713',
    cvAcc: '0.880',
    prAucVsPrev: '0.968 vs 0.715',
    brierGain: '0.122 vs 0.205',
    status: 'Strong Signal',
    statusColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/40',
  },
  {
    target: 'LAD',
    devPrevalence: '59.1% (143/242)',
    fullPrevalence: '58.4%',
    majorityAcc: '0.584',
    cvAcc: '0.810',
    prAucVsPrev: '0.885 vs 0.591',
    brierGain: '0.166 vs 0.243',
    status: 'Good Signal',
    statusColor: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/40',
  },
  {
    target: 'LCX',
    devPrevalence: '38.4% (93/242)',
    fullPrevalence: '39.3%',
    majorityAcc: '0.607',
    cvAcc: '0.682',
    prAucVsPrev: '0.615 vs 0.384',
    brierGain: '0.207 vs 0.238 (13%)',
    status: 'Modest / Low Conf',
    statusColor: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
  },
  {
    target: 'RCA',
    devPrevalence: '38.8% (94/242)',
    fullPrevalence: '37.6%',
    majorityAcc: '0.624',
    cvAcc: '0.665',
    prAucVsPrev: '0.598 vs 0.388',
    brierGain: '0.215 vs 0.235 (9%)',
    status: 'Modest / Low Conf',
    statusColor: 'text-amber-300 bg-amber-500/15 border-amber-500/40',
  },
];

const MODEL_LABELS = {
  logistic_regression: 'Logistic Regression',
  random_forest: 'Random Forest',
  xgboost: 'XGBoost',
};

export function ModelPanel() {
  const metrics = useStore((s) => s.metrics);
  const [activeModelKey, setActiveModelKey] = useState('cad');
  const [modalImage, setModalImage] = useState(null);

  const targets = metrics?.targets;

  if (!targets || Object.keys(targets).length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">Loading statistical validation metrics...</p>
      </div>
    );
  }

  const modelData = targets[activeModelKey];
  if (!modelData) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">No validation metrics available for this model.</p>
      </div>
    );
  }

  const oof = modelData.nested_cv_oof_metrics || {};
  const holdout = modelData.holdout_test_metrics_secondary || {};
  const oofAuc = metricValue(oof, 'roc_auc');
  const oofAccuracy = metricValue(oof, 'accuracy');
  const holdoutAuc = metricValue(holdout, 'roc_auc', null);

  const modelKeys = TARGET_ORDER.filter((k) => targets[k]).map((key) => {
    const auc = metricValue(targets[key].nested_cv_oof_metrics, 'roc_auc');
    const isWeak = auc < 0.80;
    return {
      key,
      label: TARGET_LABELS[key],
      auc,
      isWeak,
      badge: isWeak
        ? `low-conf (AUC ${auc.toFixed(2)})`
        : `AUC ${auc.toFixed(2)}`,
    };
  });

  const currentModelMeta = modelKeys.find((k) => k.key === activeModelKey);
  const baselineRow = SIGNAL_BASELINE_DATA.find(
    (r) => r.target.toLowerCase() === activeModelKey.toLowerCase()
  );
  const majorityAcc = baselineRow ? parseFloat(baselineRow.majorityAcc) : null;
  const accuracyGap = majorityAcc === null ? null : (oofAccuracy - majorityAcc) * 100;
  const calibParam = CALIBRATION_PARAMS[activeModelKey];

  return (
    <div className="space-y-4">
      {/* Target Selector */}
      <div className="flex p-1 bg-surface-elevated/70 rounded-xl border border-border gap-1">
        {modelKeys.map((mk) => (
          <button
            key={mk.key}
            onClick={() => setActiveModelKey(mk.key)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeModelKey === mk.key
                ? mk.isWeak
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div>{mk.label}</div>
            <div className="text-[10px] font-mono opacity-80">{mk.badge}</div>
          </button>
        ))}
      </div>

      {/* Provenance line: everything below is read from /metrics */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2 rounded-xl bg-surface/50 border border-border text-[10px] font-mono text-slate-400">
        <span className="text-slate-500">
          {metrics.validation_strategy || 'Nested cross-validation'}
        </span>
        <span>
          Model:{' '}
          <span className="text-cyan-300">
            {MODEL_LABELS[modelData.selected_model] || modelData.selected_model}
          </span>
        </span>
        <span>
          Threshold: <span className="text-amber-300">{modelData.optimal_threshold}</span>
        </span>
        <span>
          Holdout AUC:{' '}
          <span className="text-slate-300">
            {holdoutAuc === null ? 'n/a' : holdoutAuc.toFixed(3)}
          </span>
        </span>
        <span className="text-slate-600">{metrics.model_version}</span>
      </div>

      {/* Target Specific Methodological Callout */}
      {currentModelMeta?.isWeak ? (
        <div className="px-3.5 py-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300 font-mono">
              low-confidence model (AUC {oofAuc.toFixed(2)})
            </span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            {activeModelKey} accuracy is{' '}
            {accuracyGap === null ? 'not available' : `${Math.abs(accuracyGap).toFixed(1)} points ${accuracyGap >= 0 ? 'above' : 'below'}`}{' '}
            the naive baseline (always guessing negative). We report percentile risk strata rather than headline scalar probabilities.
          </p>
        </div>
      ) : (
        <div className="px-3.5 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-2.5 text-xs text-cyan-200">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-cyan-300">
              Validated Signal vs Majority Baseline ({currentModelMeta.label})
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Discrimination and PR-AUC demonstrate significant signal above naive baseline prevalence on development set (N=242).
            </p>
          </div>
        </div>
      )}

      {/* 1. Core Clinical Benchmark: Signal vs. Naive Baselines Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-surface/50">
        <div className="px-3.5 py-2.5 bg-surface-elevated/70 border-b border-border/70 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-display font-bold text-white">
              Signal vs. Naive Baselines (Dev N=242)
            </h4>
            <p className="text-[10px] text-slate-400">
              5×5 Nested Cross-Validation • Full Cohort N=303 Reference
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
            Empirical Benchmark
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-[10px] text-slate-400 font-mono bg-slate-900/50">
                <th className="p-2.5">Target</th>
                <th className="p-2.5">Dev Prev (N=242)</th>
                <th className="p-2.5">Full Prev (N=303)</th>
                <th className="p-2.5">Majority Acc</th>
                <th className="p-2.5">CV Acc</th>
                <th className="p-2.5">PR-AUC vs Prev</th>
                <th className="p-2.5">Brier vs Const</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-mono">
              {SIGNAL_BASELINE_DATA.map((row) => {
                const isSelected = row.target.toLowerCase() === activeModelKey.toLowerCase();
                return (
                  <tr
                    key={row.target}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/10 text-white font-semibold'
                        : 'text-slate-300 hover:bg-surface-elevated/30'
                    }`}
                  >
                    <td className="p-2.5 flex items-center gap-1.5 font-display">
                      <span>{row.target}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded border ${row.statusColor}`}>
                        {row.target === 'LCX' || row.target === 'RCA' ? 'Modest' : 'Good'}
                      </span>
                    </td>
                    <td className="p-2.5 text-cyan-300">{row.devPrevalence}</td>
                    <td className="p-2.5 text-slate-500">{row.fullPrevalence}</td>
                    <td className="p-2.5 text-slate-400">{row.majorityAcc}</td>
                    <td className="p-2.5 text-cyan-300 font-bold">
                      {(() => {
                        const t = targets[targetKey(row.target)];
                        const a = metricValue(t?.nested_cv_oof_metrics, 'accuracy');
                        return t ? a.toFixed(3) : row.cvAcc;
                      })()}
                    </td>
                    <td className="p-2.5">
                      {(() => {
                        const t = targets[targetKey(row.target)];
                        const p = metricValue(t?.nested_cv_oof_metrics, 'pr_auc');
                        if (!t) return row.prAucVsPrev;
                        return `${p.toFixed(3)} vs ${row.devPrevalence.split(' ')[0]}`;
                      })()}
                    </td>
                    <td className="p-2.5 text-slate-300">
                      {(() => {
                        const t = targets[targetKey(row.target)];
                        const b = metricValue(t?.nested_cv_oof_metrics, 'brier_score');
                        return t ? `${b.toFixed(3)} vs ${row.brierGain.split(' vs ')[1]}` : row.brierGain;
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-slate-900/40 border-t border-border/40 text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Clinical Audit Note:</strong> RCA accuracy is 0.665 vs 0.624 for always predicting "no stenosis". Never headline accuracy for LCX or RCA. Real signal exists in PR-AUC (~1.6× prevalence), but probability quality gain is small (Brier score 9–13% better than a constant predictor).
        </div>
      </div>

      {/* 1b. Classification performance metrics: accuracy, precision, recall, F1, ROC-AUC */}
      <div className="rounded-xl border border-border overflow-hidden bg-surface/50">
        <div className="px-3.5 py-2.5 bg-surface-elevated/70 border-b border-border/70 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-display font-bold text-white">
              Classification Performance
            </h4>
            <p className="text-[10px] text-slate-400">
              Nested cross-validation out-of-fold predictions, N=303
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono">
            Accuracy · Precision · Recall · F1 · ROC-AUC
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-[10px] text-slate-400 font-mono bg-slate-900/50">
                <th className="p-2.5">Target</th>
                <th className="p-2.5">Threshold</th>
                <th className="p-2.5">Accuracy</th>
                <th className="p-2.5">Precision</th>
                <th className="p-2.5">Recall</th>
                <th className="p-2.5">F1</th>
                <th className="p-2.5">ROC-AUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-mono">
              {TARGET_ORDER.map((key) => {
                const t = targets[key];
                if (!t) return null;
                const oof = t.nested_cv_oof_metrics || {};
                const isSelected = key === activeModelKey;
                const num = (name) => metricValue(oof, name).toFixed(3);
                return (
                  <tr
                    key={key}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/10 text-white font-semibold'
                        : 'text-slate-300 hover:bg-surface-elevated/30'
                    }`}
                  >
                    <td className="p-2.5 font-display">{SHORT_TARGET_LABELS[key]}</td>
                    <td className="p-2.5 text-slate-500">
                      {typeof t.optimal_threshold === 'number'
                        ? t.optimal_threshold.toFixed(2)
                        : '—'}
                    </td>
                    <td className="p-2.5 text-cyan-300">{num('accuracy')}</td>
                    <td className="p-2.5">{num('precision')}</td>
                    <td className="p-2.5">{num('recall')}</td>
                    <td className="p-2.5">{num('f1')}</td>
                    <td className="p-2.5 text-cyan-300 font-bold">{num('roc_auc')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-slate-900/40 border-t border-border/40 text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Reading note:</strong> Precision, recall and F1 are
          computed at each model's selected operating threshold (0.41–0.48) and therefore move with
          prevalence; ROC-AUC is threshold-free and is the figure quoted in the headline cards above.
        </div>
      </div>

      {/* 2. Quantile Calibration Diagnostics & Slope/Intercept */}
      <div className="p-3.5 bg-surface/50 border border-border rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-display font-bold text-white">
              Quantile Calibration ({activeModelKey.toUpperCase()})
            </h4>
          </div>
          <button
            onClick={() => setModalImage(calibParam.errPlot)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-elevated border border-border text-[10px] text-amber-300 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Binomial Error Bars</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Calibration Slope</span>
            <span className="text-amber-300 font-bold text-sm">{calibParam.slope.toFixed(3)}</span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Ideal: 1.000</span>
          </div>
          <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Calibration Intercept</span>
            <span className="text-amber-300 font-bold text-sm">
              {calibParam.intercept > 0 ? `+${calibParam.intercept.toFixed(3)}` : calibParam.intercept.toFixed(3)}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Ideal: 0.000</span>
          </div>
        </div>

        {/* Clear plain-language note explaining slope > 1.0 */}
        <p className="text-[11px] text-amber-200/90 leading-relaxed font-mono p-2 rounded bg-amber-500/10 border border-amber-500/25">
          Calibration slope &gt; 1.0 indicates predictions are compressed toward the cohort mean (underconfident); empirical risk varies across a wider range than model scores.
        </p>

        <p className="text-[11px] text-slate-400 italic leading-relaxed">
          {calibParam.note} 10 quantile bins (~24 patients per bin in N=242 development cohort).
        </p>
      </div>

      {/* 3. Holdout Evaluation Integrity & Hanley-McNeil Bounds */}
      <div className="p-3.5 bg-surface/50 border border-border rounded-xl space-y-2">
        <div className="flex items-center gap-1.5 text-slate-200">
          <AlertTriangle className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-display font-bold text-white">
            Holdout Evaluation Limits (N=61 Locked Set)
          </h4>
        </div>
        <div className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
          <p>
            • <strong className="text-slate-300">Sample Size Constraint:</strong> With only 61 patients, the holdout is too small to distinguish or confirm/refute nested CV estimates.
          </p>
          <p>
            • <strong className="text-slate-300">Hanley-McNeil Uncertainty:</strong> Standard error gives approximately <strong className="text-cyan-300 font-mono">±0.09</strong> for CAD and <strong className="text-cyan-300 font-mono">±0.11</strong> for LAD. CAD holdout AUC 0.858 is statistically compatible with CV 0.926; RCA holdout AUC (0.73) beating CV (0.71) is sample variance noise.
          </p>
          <p>
            • <strong className="text-slate-300">Provisional Operating Thresholds:</strong> CAD specificity on holdout is exactly 10 of 18 healthy patients. Decision thresholds are strictly provisional.
          </p>
        </div>
      </div>

      {/* 4. Interactive ROC Curve and Calibration Diagram */}
      <div className="grid grid-cols-1 gap-4">
        {/* ROC Curve */}
        <div className="p-3 bg-surface/40 border border-border rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-slate-200">
              Receiver Operating Characteristic (ROC)
            </h5>
            <span className="text-[10px] text-cyan-400 font-mono font-bold">
              AUC: {oofAuc.toFixed(3)} {formatCi(oof, 'roc_auc')}
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={modelData.roc_curve} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis
                  dataKey="fpr"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  label={{ value: '1 - Specificity (FPR)', position: 'insideBottom', offset: -4, fill: '#64748B', fontSize: 9 }}
                  stroke="#334155"
                />
                <YAxis
                  dataKey="tpr"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  label={{ value: 'Sensitivity (TPR)', angle: -90, position: 'insideLeft', offset: 25, fill: '#64748B', fontSize: 9 }}
                  stroke="#334155"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const pt = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[11px] shadow-lg">
                        <p className="text-slate-300">FPR: {pt.fpr}</p>
                        <p className="text-cyan-300 font-semibold">TPR: {pt.tpr}</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="tpr"
                  stroke="#00F0FF"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#00F0FF' }}
                />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                  stroke="#475569"
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calibration Reliability Curve */}
        <div className="p-3 bg-surface/40 border border-border rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-slate-200">
              Quantile Reliability Curve (10 Bins)
            </h5>
            <span className="text-[10px] text-amber-400 font-mono font-bold">
              Brier: {metricValue(oof, 'brier_score').toFixed(3)} {formatCi(oof, 'brier_score', 3)}
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={modelData.calibration_curve} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis
                  dataKey="pred"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  label={{ value: 'Mean Predicted Prob', position: 'insideBottom', offset: -4, fill: '#64748B', fontSize: 9 }}
                  stroke="#334155"
                />
                <YAxis
                  dataKey="obs"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  label={{ value: 'Observed Fraction', angle: -90, position: 'insideLeft', offset: 25, fill: '#64748B', fontSize: 9 }}
                  stroke="#334155"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const pt = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[11px] shadow-lg">
                        <p className="text-slate-300">Predicted: {pt.pred}</p>
                        <p className="text-amber-300 font-semibold">Observed: {pt.obs}</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="obs"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#F59E0B' }}
                />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                  stroke="#475569"
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Error Bar Plot Modal */}
      {modalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-display font-bold text-white text-base">
                  Quantile Calibration with Binomial Error Bars
                </h4>
                <p className="text-xs text-slate-400">
                  {activeModelKey.toUpperCase()} • 95% Wilson Score Interval per bin (N=242)
                </p>
              </div>
              <button
                onClick={() => setModalImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/40 flex items-center justify-center p-2">
              <img
                src={modalImage}
                alt="Calibration Curve with Error Bars"
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              With ~24 patients per quantile bin, each empirical bin has roughly ±20 points of sampling noise. Vertical error bars denote the 95% binomial confidence bounds around observed fractions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
