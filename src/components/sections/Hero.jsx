import React from 'react';
import { HeartScene } from '../three/HeartScene';
import { ArrowDown, Play, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

export function Hero() {
  const setViewMode = useStore((s) => s.setViewMode);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const launchDashboard = () => {
    setViewMode('dashboard');
    window.location.hash = 'demo';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden bg-background bg-grid-pattern">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

      {/* Hero Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Headlines & Clinical Proposition */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 shadow-glow backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Interactive Multi-Vessel Hemodynamic Risk AI</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-white tracking-tight leading-[1.08]">
            See where risk <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              lives inside
            </span>{' '}
            the heart.
          </h1>

          {/* Subline */}
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            Estimates cardiovascular risk across major coronary branches, with performance that varies from good (CAD, LAD) to modest (LCX, RCA), mapped onto an interactive 3D heart.
          </p>

          {/* Proof Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-surface/60 px-3 py-1.5 rounded-lg border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>LAD • LCX • RCA Disaggregation</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface/60 px-3 py-1.5 rounded-lg border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Colorblind-Safe Risk Scale</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface/60 px-3 py-1.5 rounded-lg border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
              <span>SHAP Clinical Explanations</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              onClick={launchDashboard}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-bold text-sm tracking-wide shadow-glow transition-all hover:scale-103 active:scale-97 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Launch Demo</span>
            </button>

            <button
              onClick={() => scrollTo('how-3d')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface/80 hover:bg-surface-elevated border border-border hover:border-slate-500 text-slate-200 font-medium text-sm transition-all hover:scale-102 flex items-center justify-center gap-2"
            >
              <span>How it works</span>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Right Column: Hero 3D Heart */}
        <div className="lg:col-span-6 h-[460px] sm:h-[540px] lg:h-[620px] w-full relative flex items-center justify-center">
          <div className="w-full h-full rounded-2xl overflow-hidden relative border border-border/40 shadow-2xl bg-surface/20">
            <HeartScene
              isHero={true}
              interactive={true}
              showLabels={true}
              showParticles={true}
            />

            {/* Micro floating hint */}
            <div className="absolute bottom-4 right-4 pointer-events-none px-3 py-1.5 rounded-lg bg-surface/80 border border-border text-[11px] text-slate-400 backdrop-blur-md">
              Drag to orbit • Scroll to zoom
            </div>
          </div>
        </div>
      </div>

      {/* Down Scroll Indicator */}
      <button
        onClick={() => scrollTo('problem')}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500 hover:text-cyan-400 transition-colors flex flex-col items-center gap-1 text-xs"
        aria-label="Scroll down to Problem section"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest">Scroll</span>
        <ArrowDown className="w-4 h-4 animate-bounce text-cyan-400" />
      </button>
    </section>
  );
}
