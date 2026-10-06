import React from 'react';
import { useStore } from '../../store/useStore';
import { VESSEL_CONFIGS, getDatasetPercentileRank } from '../../config/vessels';
import { getRiskColorHex, getRiskTier } from '../../config/theme';
import { Activity, HeartPulse, ChevronRight, AlertCircle } from 'lucide-react';

export function SummaryPanel() {
  const predictions = useStore((s) => s.predictions);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const isSimulation = useStore((s) => s.isSimulation);
  const selectedTarget = useStore((s) => s.selectedTarget);
  const setSelectedTarget = useStore((s) => s.setSelectedTarget);
  const setActiveTab = useStore((s) => s.setActiveTab);

  if (loading && !predictions) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <HeartPulse className="w-8 h-8 text-cyan-400 animate-pulse" />
        <span className="text-sm font-medium">Computing calibrated vascular risk...</span>
      </div>
    );
  }

  if (!predictions) {
    return (
      <div className="p-6 text-center text-slate-400 space-y-2">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-sm">No prediction data available.</p>
        {error && (
          <p className="text-xs font-mono text-red-300 bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2 text-left">
            {error}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Start the backend with <span className="font-mono text-slate-400">make serve</span>.
        </p>
      </div>
    );
  }

  const cadProb = predictions.cad.probability;
  const cadPercent = Math.round(cadProb * 100);
  const cadTier = getRiskTier(cadProb);
  const cadColor = getRiskColorHex(cadProb);

  const vessels = ['LAD', 'LCX', 'RCA'];

  return (
    <div className="space-y-5">
      {/* Simulation / error banner: never let fabricated values read as real */}
      {isSimulation && (
        <div className="px-3.5 py-3 rounded-xl bg-red-950/40 border border-red-500/50 space-y-1.5 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-bold text-red-300 font-mono">SIMULATED VALUES — NOT A PREDICTION</span>
          </div>
          <p className="text-[11px] text-red-200/90 leading-relaxed">
            {error ||
              'The CardioMap backend was unreachable, so the values below are illustrative only.'}{' '}
            Start it with <span className="font-mono text-red-300">make serve</span> and retry.
          </p>
        </div>
      )}

      {/* Overall CAD Status Card */}
      <div
        onClick={() => setSelectedTarget('cad')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedTarget('cad');
          }
        }}
        aria-label={`Overall Coronary Artery Disease risk is ${cadPercent} percent, classification ${cadTier.tier}`}
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${
          selectedTarget === 'cad'
            ? 'bg-surface-elevated/95 border-cyan-400 shadow-glow ring-1 ring-cyan-400/40'
            : 'bg-surface/85 border-border hover:border-slate-600 hover:bg-surface-elevated/70'
        }`}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                Systemic Atherosclerotic Burden
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                High Confidence (AUC 0.93)
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white flex items-center gap-2">
              <span>Overall CAD Probability Estimate</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
              Multi-marker statistical probability estimate of significant coronary disease (&ge;50% stenosis).
            </p>
          </div>

          {/* Large Risk Badge */}
          <div className="text-right shrink-0">
            <span
              className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight"
              style={{ color: cadColor }}
            >
              {cadPercent}%
            </span>
            <div
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border mt-1 inline-block ${cadTier.badgeClass}`}
            >
              {cadTier.tier} Risk Tier
            </div>
          </div>
        </div>

        {/* Probability Bar & Threshold */}
        <div className="space-y-1.5 pt-1">
          <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{
                width: `${cadPercent}%`,
                backgroundColor: cadColor,
              }}
            />
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between font-mono text-[11px]">
            <span>Operating Decision Threshold (Provisional): 0.41</span>
            <span className="text-cyan-300 font-semibold">{cadTier.description}</span>
          </div>
        </div>

        {/* Calibration Compression Plain-Language Note */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 leading-relaxed font-mono">
          <span>Slope 1.65: probabilities are compressed toward cohort mean (underconfident); true empirical risk varies across a wider range.</span>
        </div>
      </div>

      {/* Vessel-Specific Stenosis Risk Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Coronary Branch Risk Stratification
          </h4>
          <span className="text-[11px] text-slate-500">Click card or 3D vessel</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {vessels.map((vId) => {
            const vConfig = VESSEL_CONFIGS[vId];
            const vData = predictions.vessels[vId];
            const vProb = vData?.probability ?? 0;
            const vPercent = Math.round(vProb * 100);
            const vColor = getRiskColorHex(vProb);
            const vTier = getRiskTier(vProb);
            const isSelected = selectedTarget === vId;
            const isWeak = vConfig.isWeak;
            const rank = isWeak ? (getDatasetPercentileRank(vId, vProb) ?? vPercent) : null;

            return (
              <div
                key={vId}
                onClick={() => setSelectedTarget(isSelected ? 'cad' : vId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedTarget(isSelected ? 'cad' : vId);
                  }
                }}
                aria-label={`${vConfig.name} (${vConfig.abbreviation}) risk`}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-surface-elevated border-cyan-400 shadow-glow ring-1 ring-cyan-400/40'
                    : 'bg-surface/70 border-border hover:border-slate-600 hover:bg-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm transition-transform duration-300 mt-1"
                      style={{
                        backgroundColor: vColor,
                        transform: isSelected ? 'scale(1.3)' : 'scale(1.0)',
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm text-slate-100">
                          {vConfig.name}
                        </span>
                        <span className="text-xs font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {vConfig.abbreviation}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block line-clamp-1 mt-0.5">
                        {vConfig.territory}
                      </span>
                    </div>
                  </div>

                  {/* Probability & Rank Block */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      {isWeak ? (
                        /* Weak vessels: Show risk bands with AUC badge instead of precise percentage */
                        <div className="flex flex-col items-end">
                          <span className="text-base sm:text-lg font-display font-bold text-amber-300">
                            {rank > 66 ? 'Higher risk' : rank < 33 ? 'Lower risk' : 'Typical risk'}
                          </span>
                          {/* Visible confidence badge */}
                          <span className="mt-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold tracking-tight">
                            low-confidence model (AUC {vConfig.auc})
                          </span>
                        </div>
                      ) : (
                        /* CAD & LAD: Normal coloring & calibrated percent */
                        <div className="flex flex-col items-end">
                          <span
                            className="text-xl font-display font-bold"
                            style={{ color: vColor }}
                          >
                            {vPercent}%
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {vTier.tier} Risk
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rank explanation line for weak vessels */}
                {isWeak && (
                  <div className="mb-2 px-2.5 py-1.5 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-mono">
                      {rank > 66
                        ? `higher than ~${rank}% of patients in this dataset`
                        : rank < 33
                        ? `lower than typical patients in this dataset`
                        : `typical risk band for this cohort (~${rank}th percentile)`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      Risk strata
                    </span>
                  </div>
                )}

                {/* Probability Bar */}
                <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${vPercent}%`,
                      backgroundColor: isWeak ? '#F59E0B' : vColor,
                    }}
                  />
                </div>

                {/* Click to explain shortcut */}
                {isSelected && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-cyan-300/90 font-mono">
                      Camera focused on {vConfig.abbreviation}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab('explain');
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5 transition-colors"
                    >
                      <span>Inspect SHAP</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Executive Decision Support & Pathways Card */}
      <div className="p-4 rounded-xl bg-surface/90 border border-border/80 space-y-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-200">
              Clinical Decision Support & Next Steps
            </h4>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Advisory Guide
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block font-mono">
              Diagnostic Correlation
            </span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Correlate elevated LAD / composite CAD findings with functional ischemia imaging (Stress Echo / MPI) or anatomical CCTA.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 block font-mono">
              Modifiable Risk Targets
            </span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Primary clinical targets to monitor: LDL, BP control, and smoking cessation status.
            </p>
          </div>
        </div>

        {/* RWMA Echo Finding Note & Imputed Fields Note */}
        <div className="space-y-1.5 pt-1 text-[11px] text-slate-400">
          <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 flex items-start gap-2">
            <span className="text-cyan-400 font-semibold font-mono shrink-0">Echo finding:</span>
            <span>Regional wall motion abnormality (RWMA) is an input echocardiographic observation, not a model output.</span>
          </div>

          {predictions?.imputed_features && predictions.imputed_features.length > 0 && (
            <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 flex items-start gap-2">
              <span className="text-amber-400 font-semibold font-mono shrink-0">Imputed inputs:</span>
              <span>{predictions.imputed_features.join(', ')} were missing and imputed using pipeline defaults.</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/60">
          <span className="text-slate-400 text-[11px]">
            Explore model response under changed inputs (associational What-If):
          </span>
          <button
            onClick={() => setActiveTab('inputs')}
            className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>Launch What-If Analysis →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
