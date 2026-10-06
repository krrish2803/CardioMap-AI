import React from 'react';
import { Target, CheckCircle2, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

export function USP() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const proofPoints = [
    {
      title: 'One-to-One Model-to-Anatomy Mapping',
      desc: 'No vague clusters or artistic approximations. Each colored coronary tube directly represents an isolated, dedicated statistical model output.',
    },
    {
      title: 'Per-Vessel SHAP on Click',
      desc: 'Clicking any artery unrolls its exact game-theoretic biomarker attributions, showing why that specific branch reached its risk score.',
    },
    {
      title: 'Live What-If Recoloring',
      desc: 'Simulate therapeutic targets (e.g. lowering LDL or smoking cessation) and observe the vascular tree recalibrate before your eyes.',
    },
  ];

  return (
    <section id="usp" className="relative w-full py-28 bg-[#050810] border-t border-border overflow-hidden">
      {/* Spotlight Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-12">
        {/* Spotlight Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-elevated/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-glow">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>The Core Innovation</span>
        </div>

        {/* Large Spotlight USP Headline */}
        <blockquote className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          "The only risk tool where{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
            every colour on the heart
          </span>{' '}
          is a calibrated probability you can click, question and explain."
        </blockquote>

        {/* 3 Short Proof Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left">
          {proofPoints.map((pt, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-surface/60 border border-border/80 hover:border-cyan-500/30 transition-all hover:bg-surface-elevated/60"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3.5 font-mono font-bold text-xs">
                0{i + 1}
              </div>
              <h3 className="font-display font-bold text-base text-white mb-2">
                {pt.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {pt.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Big Demo CTA button */}
        <div className="pt-8">
          <button
            onClick={() => scrollTo('demo')}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold text-sm tracking-wide shadow-glow transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2.5"
          >
            <span>Experience CardioMap Interactive Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
