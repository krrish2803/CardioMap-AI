import React, { useState } from 'react';
import {
  FileText,
  Cpu,
  CheckCircle2,
  Heart,
  ArrowRight,
  Sparkles,
  GitCommit,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Solution() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 1,
      title: 'Multimodal Patient Data',
      subtitle: 'Clinical Inputs',
      icon: FileText,
      description:
        'Demographics, resting hemodynamics, standard lipid/biomarker labs, 12-lead ECG morphology, and echocardiographic wall findings.',
      tags: ['Age & Sex', 'Lipid Panel', '12-Lead ECG', 'Echo RWMA'],
      badge: 'Step 1',
    },
    {
      id: 2,
      title: 'Disaggregated ML Models',
      subtitle: 'Multi-Task Inferences',
      icon: Cpu,
      description:
        'Parallel statistical classifiers that estimate risk independently per target, with performance that varies from good (CAD, LAD) to modest (LCX, RCA).',
      tags: ['CAD Global', 'LAD Model', 'LCX Model', 'RCA Model'],
      badge: 'Step 2',
    },
    {
      id: 3,
      title: 'Isotonic Calibration',
      subtitle: 'Reliable Probabilities',
      icon: CheckCircle2,
      description:
        'Raw model logits are rigorously calibrated via isotonic regression, guaranteeing that a predicted 70% risk corresponds to a true 70% frequency.',
      tags: ['Brier < 0.12', 'Platt Scaling', 'Reliability Curve', 'SHAP Values'],
      badge: 'Step 3',
    },
    {
      id: 4,
      title: 'Spatialized 3D Heart',
      subtitle: 'Colorblind-Safe Visuals',
      icon: Heart,
      description:
        'Each calibrated output maps directly onto its corresponding coronary artery in 3D, glowing with risk-scaled emission and particle velocity.',
      tags: ['LAD Front', 'LCX Lateral', 'RCA Inferior', 'Click-to-Explain'],
      badge: 'Step 4',
    },
  ];

  return (
    <section id="solution" className="relative w-full py-24 bg-background border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>The CardioMap Solution Pipeline</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight">
            From raw clinical features to{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              spatially grounded risk
            </span>
          </h2>

          <p className="text-base text-slate-300 leading-relaxed">
            A transparent 4-stage pipeline that disaggregates risk into anatomical vessels and guarantees mathematical calibration before illumination.
          </p>
        </div>

        {/* 4-Step Interactive Pipeline Flow */}
        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-12 right-12 h-0.5 bg-gradient-to-r from-cyan-500/30 via-sky-500/50 to-blue-500/30 -translate-y-12 z-0" />

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = activeStep === idx;

              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isCurrent
                      ? 'bg-surface-elevated/95 border-cyan-400 shadow-glow ring-1 ring-cyan-400/40 translate-y-[-4px]'
                      : 'bg-surface/70 border-border hover:border-slate-600 hover:bg-surface-elevated/50'
                  }`}
                >
                  <div>
                    {/* Header: Badge & Icon */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-md scale-110'
                            : 'bg-slate-800 text-cyan-400 border border-slate-700 group-hover:scale-105'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                        {step.badge}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-medium text-cyan-400 uppercase tracking-wider block mb-1">
                      {step.subtitle}
                    </span>
                    <h3 className="text-lg font-display font-bold text-white mb-2.5">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {step.description}
                    </p>
                  </div>

                  {/* Feature Tags */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {step.tags.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline Summary Guarantee */}
        <div className="mt-12 p-4 rounded-xl bg-surface/50 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Strict 1-to-1 Mapping: Model predictions are tied directly to vascular anatomy.</span>
          </div>
          <span className="font-mono text-[11px] text-cyan-400">Zero black-box ambiguities</span>
        </div>
      </div>
    </section>
  );
}
