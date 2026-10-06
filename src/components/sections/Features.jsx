import React from 'react';
import {
  GitFork,
  HelpCircle,
  Sliders,
  CheckCircle2,
  Table,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Features() {
  const features = [
    {
      icon: GitFork,
      title: 'Vessel-Level Risk Estimation',
      description:
        'Estimates cardiovascular risk across major coronary branches—LAD, LCX, and RCA—with performance that varies from good (CAD, LAD) to modest (LCX, RCA).',
      tag: 'Multi-Task Learning',
    },
    {
      icon: HelpCircle,
      title: 'Click-to-Explain SHAP Attribution',
      description:
        'Select any artery directly in the 3D viewport or summary list to immediately isolate its specific SHAP biomarker drivers and statistical weights.',
      tag: 'Additive Attributions',
    },
    {
      icon: Sliders,
      title: 'Interactive "What-If" Counterfactuals',
      description:
        'Adjust LDL, blood pressure, smoking status, or age and watch the 3D heart dynamically recolor and re-calibrate in real time with 300ms debouncing.',
      tag: 'Live Simulation',
    },
    {
      icon: CheckCircle2,
      title: 'Calibrated Probabilities & Brier Metrics',
      description:
        'Every percentage undergoes isotonic calibration. The model dashboard exposes full reliability diagrams, Brier scores, and 95% confidence intervals.',
      tag: 'Reliability Curves',
    },
    {
      icon: Table,
      title: 'Clinical Measurement Contribution',
      description:
        'Exposes every baseline vital, lab biomarker, ECG abnormality, and echocardiography wall finding with transparent relative influence metrics.',
      tag: 'Diagnostic Insight',
    },
    {
      icon: Layers,
      title: 'Config-Driven & Fully Extensible',
      description:
        'Built with a headless JSON schema architecture: new clinical features, imaging biomarkers, or coronary branches can be added without UI redesign.',
      tag: 'Zero Code Bloat',
    },
  ];

  return (
    <section id="features" className="relative w-full py-24 bg-background border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Core Capabilities</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight">
            Engineered for clinical clarity
          </h2>

          <p className="text-base text-slate-300">
            Six architectural capabilities designed to transition cardiac risk prediction from a black-box percentage into an actionable anatomical map.
          </p>
        </div>

        {/* 6 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;

            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-surface/70 border border-border hover:border-cyan-500/40 hover:bg-surface-elevated/80 transition-all duration-300 group flex flex-col justify-between hover:-translate-y-1 hover:shadow-glow"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 group-hover:scale-105 transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-display font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400/80 group-hover:text-cyan-300 transition-colors">
                  <span className="font-mono text-[11px]">Explore in Workbench</span>
                  <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
