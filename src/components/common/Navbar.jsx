import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Heart, Activity, Play, Sparkles, Moon, Sun, Wind } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = useStore((s) => s.prefersReducedMotion);
  const setPrefersReducedMotion = useStore((s) => s.setPrefersReducedMotion);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    if (viewMode === 'dashboard') {
      setViewMode('story');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }, 50);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  const openDashboard = () => {
    setViewMode('dashboard');
    window.location.hash = 'demo';
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  const openStory = () => {
    setViewMode('story');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-md border-b border-border py-3'
          : 'bg-background/70 backdrop-blur-sm border-b border-border/40 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 group select-none"
          onClick={(e) => {
            e.preventDefault();
            openStory();
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              CardioMap <span className="text-cyan-400 text-sm font-mono">3D</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono block -mt-1 tracking-wider uppercase">
              Vessel Risk Spatializer
            </span>
          </div>
        </a>

        {/* Navigation Links */}
        {viewMode === 'dashboard' ? (
          <nav className="flex items-center gap-3">
            <button
              onClick={openStory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-elevated border border-border text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors shadow-sm"
            >
              <span>← Back to Scrollytelling Story</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Live 3D Workbench Active</span>
            </div>
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <button
              onClick={() => scrollTo('problem')}
              className="hover:text-cyan-400 transition-colors"
            >
              The Problem
            </button>
            <button
              onClick={() => scrollTo('solution')}
              className="hover:text-cyan-400 transition-colors"
            >
              Pipeline
            </button>
            <button
              onClick={() => scrollTo('how-3d')}
              className="hover:text-cyan-400 transition-colors"
            >
              How It Works in 3D
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="hover:text-cyan-400 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('usp')}
              className="hover:text-cyan-400 transition-colors"
            >
              Clinical Value
            </button>
          </nav>
        )}

        {/* Controls & Launch CTA */}
        <div className="flex items-center gap-3">
          {/* Reduced Motion Toggle */}
          <button
            onClick={() => setPrefersReducedMotion(!prefersReducedMotion)}
            title={prefersReducedMotion ? 'Enable smooth animations' : 'Reduce motion'}
            className={`p-2 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
              prefersReducedMotion
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-surface/80 text-slate-400 border-border hover:text-slate-200'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">
              {prefersReducedMotion ? 'Motion Off' : 'Motion'}
            </span>
          </button>

          {/* Launch Demo / Workbench CTA */}
          {viewMode !== 'dashboard' ? (
            <button
              onClick={openDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-display font-semibold text-xs tracking-wide shadow-glow transition-all hover:scale-103 active:scale-97 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Launch Workbench</span>
            </button>
          ) : (
            <button
              onClick={openStory}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface border border-cyan-500/40 text-cyan-300 font-display font-medium text-xs tracking-wide transition-all"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Overview Story</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
