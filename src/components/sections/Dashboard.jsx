import React from 'react';
import { useStore } from '../../store/useStore';
import { HeartScene } from '../three/HeartScene';
import { DisclaimerBanner } from '../dashboard/DisclaimerBanner';
import { SummaryPanel } from '../dashboard/SummaryPanel';
import { ExplainPanel } from '../dashboard/ExplainPanel';
import { InputsPanel } from '../dashboard/InputsPanel';
import { ModelPanel } from '../dashboard/ModelPanel';
import {
  Activity,
  BarChart3,
  Sliders,
  ShieldCheck,
  Maximize2,
  HelpCircle,
} from 'lucide-react';

export function Dashboard() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const selectedTarget = useStore((s) => s.selectedTarget);
  const loading = useStore((s) => s.loading);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const samplePatients = useStore((s) => s.samplePatients);
  const selectedSampleId = useStore((s) => s.selectedSampleId);
  const loadSamplePatient = useStore((s) => s.loadSamplePatient);
  const features = useStore((s) => s.features);

  const tabs = [
    { id: 'summary', label: 'Summary', icon: Activity },
    { id: 'explain', label: 'Explain (SHAP)', icon: BarChart3 },
    { id: 'inputs', label: 'Inputs & What-If', icon: Sliders },
    { id: 'model', label: 'Model Validation', icon: ShieldCheck },
  ];

  return (
    <section id="demo" className="relative w-full min-h-screen bg-background border-t border-border flex flex-col">
      {/* Persistent Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Dashboard Sub-Header */}
      <div className="w-full bg-surface/80 border-b border-border/80 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
                <span>CardioMap Live 3D Clinical Workbench</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  v1.2.0 • Interactive
                </span>
              </h2>
              {viewMode === 'dashboard' && (
                <button
                  onClick={() => {
                    setViewMode('story');
                    window.location.hash = '';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface border border-slate-700 hover:border-cyan-500/50 text-[11px] text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  title="Return to Story Overview"
                >
                  <span>← Story Tour</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Estimates vessel-level risk, with model performance that varies from good (CAD, LAD) to modest (LCX, RCA)
            </p>
          </div>
        </div>

        {/* Global tab shortcuts for desktop header */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-elevated rounded-xl border border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Executive Patient Context & Archetype Bar */}
      <div className="w-full bg-slate-950/80 border-b border-border/60 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Patient Archetype Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            Patient Case:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {samplePatients && samplePatients.length > 0 ? (
              samplePatients.map((sp) => {
                const isSelected = selectedSampleId === sp.id;
                const isHigh = sp.id.includes('high');
                const isMod = sp.id.includes('mod');
                const isLow = sp.id.includes('low');
                const riskTitle = isHigh
                  ? 'High Predicted Risk'
                  : isMod
                  ? 'Moderate Predicted Risk'
                  : 'Low Predicted Risk';
                const cohortLabel = sp.cohort_type || (sp.name?.includes('Synthetic') ? 'Synthetic' : 'Real Cohort');

                return (
                  <button
                    key={sp.id}
                    onClick={() => loadSamplePatient(sp.id)}
                    title={`${sp.name}: ${sp.description}`}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? isHigh
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                          : isMod
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 shadow-sm ring-1 ring-cyan-500/30'
                          : 'bg-slate-700/50 text-slate-200 border border-slate-500/50 shadow-sm ring-1 ring-slate-400/30'
                        : 'bg-surface/60 hover:bg-surface border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isHigh
                          ? 'bg-amber-400'
                          : isMod
                          ? 'bg-cyan-400'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>{riskTitle}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 font-mono border border-slate-800">
                      {cohortLabel}
                    </span>
                  </button>
                );
              })
            ) : (
              <span className="text-slate-500">Loading cases...</span>
            )}
          </div>
        </div>

        {/* Quick Patient Physiology Chips */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1 bg-surface/40 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500">Profile:</span>
            <span className="text-slate-200 font-medium">
              {features.Age || features.age || 58}yo {features.Sex === 1 || features.sex === 1 || features.Sex === 'Male' ? 'M' : 'F'}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface/40 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500">BP:</span>
            <span className="text-slate-200 font-medium">
              {features.BP || features.systolic_bp || 130} mmHg
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface/40 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500">Lipids:</span>
            <span className="text-slate-200 font-medium">
              LDL {features.LDL || features.ldl || 110} · TG {features.TG || features.triglycerides || 140}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface/40 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500">Echo EF:</span>
            <span className="text-slate-200 font-medium">
              {features['EF-TTE'] || features.lvef || 55}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left 60% (3D Canvas), Right 40% (Tabs Panel) */}
      <div className="flex-1 flex flex-col lg:flex-row w-full min-h-[calc(100vh-140px)]">
        {/* Left 60%: 3D Scene */}
        <div className="w-full lg:w-[60%] h-[480px] sm:h-[560px] lg:h-auto min-h-[460px] relative border-b lg:border-b-0 lg:border-r border-border bg-[#070B14]">
          <HeartScene interactive={true} showLabels={true} showParticles={true} />
        </div>

        {/* Right 40%: Tabbed Control & Insight Panel */}
        <div className="w-full lg:w-[40%] flex flex-col bg-surface/50 border-t lg:border-t-0">
          {/* Mobile Tab Navigation */}
          <div className="flex lg:hidden overflow-x-auto p-2 bg-surface-elevated/60 border-b border-border gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            {activeTab === 'summary' && <SummaryPanel />}
            {activeTab === 'explain' && <ExplainPanel />}
            {activeTab === 'inputs' && <InputsPanel />}
            {activeTab === 'model' && <ModelPanel />}
          </div>
        </div>
      </div>
    </section>
  );
}
