import React, { useRef, useEffect, useState } from 'react';
import { HeartScene } from '../three/HeartScene';
import { AlertCircle, HelpCircle, ArrowRight, ShieldAlert, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Problem() {
  const [showQuestion, setShowQuestion] = useState(false);

  useEffect(() => {
    // Alternate or transition "37%" to "?"
    const timer = setInterval(() => {
      setShowQuestion((prev) => !prev);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="problem"
      className="relative w-full py-24 bg-[#050810] border-t border-border overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Clinical Problem Narrative */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>The Diagnostic Blind Spot</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Standard risk scores leave doctors guessing <br />
              <span className="text-slate-400">"Where is the lesion?"</span>
            </h2>

            <div className="space-y-4 text-slate-300 text-base leading-relaxed">
              <p>
                Cardiovascular disease remains the single leading cause of mortality worldwide. Yet traditional statistical risk tools (Framingham, ASCVD, SCORE2) deliver only an abstract composite percentage—such as <span className="text-amber-400 font-mono font-bold">37% 10-year risk</span>.
              </p>
              <p>
                A scalar probability offers <strong className="text-white">zero spatial intelligence</strong>. It cannot indicate whether the obstruction threatens the critical Left Anterior Descending artery or the Right Coronary Artery, nor does it reveal which patient biomarkers drove that score.
              </p>
            </div>

            {/* Critique checklist */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 border border-border">
                <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <strong className="text-slate-200 block">No anatomical localization</strong>
                  <span className="text-slate-400">Clinicians cannot anticipate catheterization findings or target ischemic territories.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 border border-border">
                <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <strong className="text-slate-200 block">Black-box opacity</strong>
                  <span className="text-slate-400">Patients and care teams see a threatening number without actionable mechanistic drivers.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dim Grey Heart with "37%" -> "?" Animation */}
          <div className="lg:col-span-6 h-[460px] sm:h-[520px] w-full relative">
            <div className="w-full h-full rounded-2xl overflow-hidden relative border border-slate-800/80 bg-slate-950/70 shadow-2xl flex items-center justify-center">
              {/* Dim Grey Heart */}
              <HeartScene
                isHero={false}
                isDimmed={true}
                showLabels={false}
                showParticles={false}
                interactive={false}
              />

              {/* Floating Animated Overlay: "37%" -> "?" */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="relative flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    {!showQuestion ? (
                      <motion.div
                        key="score"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center p-6 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl"
                      >
                        <span className="text-5xl sm:text-6xl font-display font-black text-slate-300 font-mono tracking-tight">
                          37%
                        </span>
                        <span className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-wider">
                          Scalar Risk Output
                        </span>
                        <span className="text-[10px] text-rose-400/90 mt-1">
                          No vessel territory specified
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="question"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center p-6 rounded-2xl bg-rose-950/80 border border-rose-500/50 shadow-2xl backdrop-blur-xl"
                      >
                        <HelpCircle className="w-16 h-16 text-rose-400 animate-pulse" />
                        <span className="text-base font-display font-bold text-white mt-2">
                          Where & Why?
                        </span>
                        <span className="text-[11px] text-rose-300 text-center max-w-[200px] mt-0.5">
                          LAD? LCX? RCA? Which features drove this?
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Caption banner */}
              <div className="absolute bottom-4 left-4 right-4 p-2.5 rounded-xl bg-slate-900/85 border border-slate-800 text-[11px] text-slate-400 text-center backdrop-blur-md">
                Standard risk tools leave the coronary anatomy unmapped.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
