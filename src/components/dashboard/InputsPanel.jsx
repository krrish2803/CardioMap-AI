import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  Users,
  Sliders,
  Sparkles,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Activity,
  Flame,
  Info,
  Cigarette
} from 'lucide-react';

// Read-outs must not echo full float precision (BMI arrives as 28.398718000730252).
function formatNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function InputsPanel() {
  const schema = useStore((s) => s.schema);
  const features = useStore((s) => s.features);
  const setFeature = useStore((s) => s.setFeature);
  const samplePatients = useStore((s) => s.samplePatients);
  const selectedSampleId = useStore((s) => s.selectedSampleId);
  const loadSamplePatient = useStore((s) => s.loadSamplePatient);
  const runPrediction = useStore((s) => s.runPrediction);
  const whatIfMode = useStore((s) => s.whatIfMode);
  const setWhatIfMode = useStore((s) => s.setWhatIfMode);
  const loading = useStore((s) => s.loading);

  const [syncHtnWithBp, setSyncHtnWithBp] = useState(true);
  // Keys must match the group ids emitted by /schema
  // ("Demographic", "Clinical examination", "ECG", "Laboratory", "Echocardiography").
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  if (!schema || !schema.groups) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
        <p className="text-sm">Loading dynamic clinical schema...</p>
      </div>
    );
  }

  const handleBpChange = (newBp) => {
    setFeature('BP', newBp);
    if (syncHtnWithBp) {
      if (newBp < 130 && (features['HTN'] === 1 || features['HTN'] === 'Y')) {
        setFeature('HTN', 0);
      } else if (newBp >= 140 && (features['HTN'] === 0 || features['HTN'] === 'N')) {
        setFeature('HTN', 1);
      }
    }
  };

  const resetCurrentSample = () => {
    // Reset to the highest-risk archetype, matching whichever ID scheme the
    // active data source uses (backend returns `sample-high`, mock `patient-high`).
    const highSample = samplePatients.find(
      (s) => s.id === 'sample-high' || s.id === 'patient-high'
    );
    const targetId =
      highSample?.id ||
      (selectedSampleId && selectedSampleId !== 'custom' ? selectedSampleId : null);
    if (targetId) loadSamplePatient(targetId);
  };

  const isTypicalCpPositive =
    features['Typical Chest Pain'] === 1 ||
    features['Typical Chest Pain'] === '1' ||
    features['Typical Chest Pain'] === 'Y' ||
    features['Typical_Chest_Pain'] === 1 ||
    features['Typical_Chest_Pain'] === 'Y';

  const isSmokerPositive =
    features['Current Smoker'] === 1 ||
    features['Current Smoker'] === '1' ||
    features['Current Smoker'] === 'Y' ||
    features['smoking'] === 1;

  const currentBp = Number(features['BP'] ?? features['systolic_bp'] ?? 130);
  const currentLdl = Number(features['LDL'] ?? features['ldl'] ?? 100);
  const currentEf = Number(features['EF-TTE'] ?? features['lvef'] ?? 50);

  return (
    <div className="space-y-4">
      {/* Sample Patient Loader & Case Archetype Bar */}
      <div className="p-3.5 rounded-xl bg-surface-elevated/80 border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <label htmlFor="sample-select" className="text-xs font-semibold text-white">
              Clinical Case Archetype:
            </label>
          </div>
          <select
            id="sample-select"
            value={selectedSampleId}
            onChange={(e) => loadSamplePatient(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-medium"
          >
            {samplePatients.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="custom" disabled>
              Custom Modified Values
            </option>
          </select>
        </div>

        {/* Selected Sample Clinical Summary */}
        {selectedSampleId !== 'custom' && (
          <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
            {samplePatients.find((s) => s.id === selectedSampleId)?.description}
          </p>
        )}

        {/* Live What-If Switch & Manual Run Button */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={whatIfMode}
              onChange={(e) => setWhatIfMode(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                whatIfMode ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  whatIfMode ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-xs text-slate-300 font-medium">
              Live "What-If" Recoloring
            </span>
          </label>

          <button
            onClick={() => runPrediction()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-semibold transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{loading ? 'Evaluating...' : 'Update Heart Risk'}</span>
          </button>
        </div>
      </div>

      {/* What-if: Model Response to Changed Inputs */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/20 via-surface/60 to-surface border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-display font-bold text-white">
              What-if: Model Response to Changed Inputs
            </h4>
          </div>
          <button
            onClick={resetCurrentSample}
            title="Reset inputs back to archetype baseline"
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Reset Case</span>
          </button>
        </div>

        {/* Explicit Non-Causal / Non-Treatment Disclaimer Caption */}
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold font-mono text-[10px]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Associational model response only — not a causal treatment effect estimate</span>
          </div>
          <p>
            Trained on cross-sectional data from patients referred for coronary angiography. Adjusting inputs evaluates statistical model behavior across clinical profiles, not the therapeutic outcome of lowering risk factors in an individual patient.
          </p>
        </div>

        {/* High-Impact Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Systolic BP */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-cyan-400" />
                <span>Systolic BP</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">{currentBp} mmHg</span>
            </div>
            <input
              type="range"
              min={90}
              max={190}
              step={5}
              value={currentBp}
              onChange={(e) => handleBpChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>90 mmHg (Low)</span>
              <span>130 (Ref)</span>
              <span>190 mmHg (Severe)</span>
            </div>
          </div>

          {/* LDL Cholesterol */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>LDL Cholesterol</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">{currentLdl} mg/dL</span>
            </div>
            <input
              type="range"
              min={20}
              max={220}
              step={5}
              value={currentLdl}
              onChange={(e) => setFeature('LDL', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>20 mg/dL</span>
              <span>&lt; 100 (Optimal)</span>
              <span>220 mg/dL</span>
            </div>
          </div>

          {/* Ejection Fraction (Echo EF-TTE) */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ejection Fraction (EF-TTE)</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">{currentEf}%</span>
            </div>
            <input
              type="range"
              min={25}
              max={70}
              step={5}
              value={currentEf}
              onChange={(e) => setFeature('EF-TTE', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>25% (Dysfunction)</span>
              <span>50-70% (Preserved)</span>
            </div>
          </div>

          {/* Typical Chest Pain Presentation */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Typical Chest Pain</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {isTypicalCpPositive ? 'Yes (Angina)' : 'No (Absent)'}
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFeature('Typical Chest Pain', 1)}
                className={`flex-1 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  isTypicalCpPositive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                Yes (+)
              </button>
              <button
                type="button"
                onClick={() => setFeature('Typical Chest Pain', 0)}
                className={`flex-1 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  !isTypicalCpPositive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                No (-)
              </button>
            </div>
          </div>
        </div>

        {/* Clinical History Synchronization Option */}
        <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncHtnWithBp}
              onChange={(e) => setSyncHtnWithBp(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            <span>Auto-sync HTN history when BP crosses 130/140 threshold</span>
          </label>
          <span className="font-mono text-[10px] text-slate-500">
            HTN: {features['HTN'] === 1 || features['HTN'] === 'Y' ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Full Clinical Parameter Groups (Accordion) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Detailed Clinical Registry
          </span>
          <span className="text-[10px] text-slate-500">
            {schema.groups.reduce((acc, g) => acc + g.fields.length, 0)} inputs
          </span>
        </div>

        {schema.groups.map((group) => {
          const isExpanded = expandedGroups[group.id] || false;

          return (
            <div
              key={group.id}
              className="rounded-xl border border-border/80 bg-surface/50 overflow-hidden"
            >
              {/* Group Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between bg-surface-elevated/40 hover:bg-surface-elevated/70 text-left transition-colors cursor-pointer"
              >
                <div>
                  <h4 className="text-xs font-display font-bold text-slate-200">
                    {group.title}
                  </h4>
                  <p className="text-[10px] text-slate-400">{group.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Group Fields */}
              {isExpanded && (
                <div className="p-3.5 space-y-3.5 border-t border-border/40">
                  {group.fields.map((field) => {
                    const value = features[field.key] ?? field.default;
                    const controlId = `field-${field.key}`;
                    // /schema emits {numeric, binary, ordinal, nominal} — NOT
                    // {slider, number, select}. Map the schema vocabulary onto
                    // controls, choosing range vs. stepper by available room.
                    const isCategorical =
                      field.type === 'binary' || field.type === 'ordinal' || field.type === 'nominal';
                    const isNumeric = field.type === 'numeric';
                    const useSlider =
                      isNumeric &&
                      typeof field.min === 'number' &&
                      typeof field.max === 'number' &&
                      field.max > field.min;
                    const step =
                      field.type === 'ordinal' ? 1
                        : isNumeric && (field.max - field.min) <= 12 ? 0.1
                          : 1;

                    // The schema publishes option lists as `options` for nominal/binary fields but
                    // as `categories` for ordinal ones (Function Class). Normalize both.
                    const optionList = field.options?.length
                      ? field.options
                      : (field.categories || []).map((c) => ({ label: String(c), value: c }));
                    const hasCurrentOption = optionList.some(
                      (o) => String(o.value) === String(value)
                    );
                    const displayValue = isCategorical
                      ? (optionList.find((o) => String(o.value) === String(value))?.label ?? value)
                      : `${formatNumber(value)} ${field.unit || ''}`.trim();

                    return (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <label
                            htmlFor={controlId}
                            className="text-slate-300 font-medium flex items-center gap-1"
                            title={field.description}
                          >
                            <span>{field.label}</span>
                            {field.unit && (
                              <span className="text-[10px] text-slate-500">({field.unit})</span>
                            )}
                          </label>
                          <span className="font-mono text-cyan-300 text-xs font-semibold">
                            {displayValue}
                          </span>
                        </div>

                        {/* Numeric: slider when the range is sane, else stepper */}
                        {isNumeric && useSlider && (
                          <input
                            id={controlId}
                            type="range"
                            min={field.min}
                            max={field.max}
                            step={step}
                            value={value}
                            aria-label={`${field.label}${field.unit ? ` in ${field.unit}` : ''}`}
                            onChange={(e) => setFeature(field.key, Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                          />
                        )}

                        {isNumeric && !useSlider && (
                          <input
                            id={controlId}
                            type="number"
                            min={field.min}
                            max={field.max}
                            step={step}
                            value={value}
                            aria-label={`${field.label}${field.unit ? ` in ${field.unit}` : ''}`}
                            onChange={(e) => setFeature(field.key, Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none font-mono"
                          />
                        )}

                        {/* Binary / ordinal / nominal: select or toggle */}
                        {isCategorical && (
                          field.type === 'binary' ? (
                            <button
                              id={controlId}
                              type="button"
                              role="switch"
                              aria-checked={Number(value) === 1}
                              aria-label={`${field.label} — ${Number(value) === 1 ? 'present' : 'absent'}`}
                              onClick={() => setFeature(field.key, Number(value) === 1 ? 0 : 1)}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                Number(value) === 1
                                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                              }`}
                            >
                              {Number(value) === 1 ? 'Yes / Present' : 'No / Absent'}
                            </button>
                          ) : (
                            <select
                              id={controlId}
                              value={hasCurrentOption ? value : ''}
                              aria-label={field.label}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setFeature(field.key, isNaN(Number(raw)) ? raw : Number(raw));
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                            >
                              {/* Current value can fall outside the published list
                                  (Function Class default is 0, categories are 1-4). */}
                              {!hasCurrentOption && (
                                <option value="">Select…</option>
                              )}
                              {optionList.map((opt) => (
                                <option key={String(opt.value)} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
