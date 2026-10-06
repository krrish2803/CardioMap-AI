import React, { useState, useEffect } from 'react';
import { HeartScene } from '../three/HeartScene';
import { useStore } from '../../store/useStore';
import {
  Compass,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  ChevronLeft,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function How3D() {
  const [currentStep, setCurrentStep] = useState(0);
  const setSelectedTarget = useStore((s) => s.setSelectedTarget);

  const steps = [
    {
      id: 0,
      title: '1. Anatomical Arterial Mapping',
      subtitle: 'Coronary Vessel Architecture',
      description:
        'The heart is rendered with the three primary coronary arteries in neutral baseline state. Every artery follows realistic anatomical sulci.',
      vessels: [
        { name: 'LAD (Front)', desc: 'Left anterior descending perfuses septum and anterior wall.' },
        { name: 'LCX (Side / Back)', desc: 'Left circumflex curves along the atrioventricular groove.' },
        { name: 'RCA (Right / Bottom)', desc: 'Right coronary supplies inferior and posterior RV.' },
      ],
      isDimmed: true,
      showParticles: false,
      focusVessel: 'cad',
      overrideProbs: { LAD: 0.1, LCX: 0.1, RCA: 0.1 },
    },
    {
      id: 1,
      title: '2. Calibrated Probability Flow',
      subtitle: 'Color-Lerping & Emissive Scaling',
      description:
        'Model predictions flow directly into the arteries. Each vessel color-lerps to its colorblind-safe risk color, with thickness and emissive luminescence scaling proportionally.',
      vessels: [
        { name: 'LAD: 78% (Severe)', desc: 'Bright magenta glow with dilated lumen risk.' },
        { name: 'LCX: 32% (Mild)', desc: 'Soft yellow baseline perfusion indicator.' },
        { name: 'RCA: 54% (Moderate)', desc: 'Warm orange cautionary risk gradient.' },
      ],
      isDimmed: false,
      showParticles: false,
      focusVessel: 'cad',
      overrideProbs: { LAD: 0.78, LCX: 0.32, RCA: 0.54 },
    },
    {
      id: 2,
      title: '3. Camera Orbit & SHAP Decomposition',
      subtitle: 'Targeted Vessel Inspection',
      description:
        'Selecting a vessel smoothly orbits the anatomical camera to focus on the target artery. A clinical callout decomposes the top predictive SHAP drivers for that specific territory.',
      vessels: [
        { name: 'Top Driver 1', desc: 'Anteroseptal Wall Motion Hypokinesia (+0.28 contribution)' },
        { name: 'Top Driver 2', desc: 'Resting ST-Segment Depression (+0.18 contribution)' },
        { name: 'Top Driver 3', desc: 'Elevated Serum LDL Cholesterol (+0.14 contribution)' },
      ],
      isDimmed: false,
      showParticles: false,
      focusVessel: 'LAD',
      overrideProbs: { LAD: 0.78, LCX: 0.32, RCA: 0.54 },
    },
    {
      id: 3,
      title: '4. Hemodynamic Pulse Metaphor',
      subtitle: 'Particle Flow Velocity Dynamics',
      description:
        'Animated data pulses travel along each artery. Crucially, particle speed inversely mirrors stenosis: unobstructed arteries flow briskly, while high-stenosis vessels slow down.',
      vessels: [
        { name: 'Severe LAD', desc: 'Sluggish, impeded particle flow mimics luminal resistance.' },
        { name: 'Mild LCX', desc: 'Swift, unimpeded particle transit reflecting patent lumen.' },
        { name: 'Moderate RCA', desc: 'Intermediate flow cadence.' },
      ],
      isDimmed: false,
      showParticles: true,
      focusVessel: 'LAD',
      overrideProbs: { LAD: 0.78, LCX: 0.32, RCA: 0.54 },
    },
  ];

  const active = steps[currentStep];

  useEffect(() => {
    setSelectedTarget(active.focusVessel);
  }, [currentStep, active.focusVessel, setSelectedTarget]);

  return (
    <section id="how-3d" className="relative w-full py-24 bg-[#060913] border-t border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D Interactive Walkthrough</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white tracking-tight">
            How it works in 3D
          </h2>

          <p className="text-base text-slate-300">
            A 4-step sequence demonstrating anatomical registration, probability recoloring, camera focusing, and flow dynamics.
          </p>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((st, idx) => (
            <button
              key={st.id}
              onClick={() => setCurrentStep(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                currentStep === idx
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-glow'
                  : 'bg-surface/60 text-slate-400 border-border hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                  currentStep === idx ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {idx + 1}
              </span>
              <span>{st.title.split('. ')[1]}</span>
            </button>
          ))}
        </div>

        {/* 2-Column Split: Interactive 3D on Left, Step Details on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* 3D Visualizer Container */}
          <div className="lg:col-span-7 h-[460px] sm:h-[520px] w-full relative">
            <div className="w-full h-full rounded-2xl overflow-hidden relative border border-border/70 bg-surface/30 shadow-2xl">
              <HeartScene
                isHero={false}
                isDimmed={active.isDimmed}
                showLabels={true}
                showParticles={active.showParticles}
                interactive={true}
                overrideVesselProb={active.overrideProbs}
              />

              {/* Step 3 Callout Card (Floating over 3D) */}
              {currentStep === 2 && (
                <div className="absolute top-4 right-4 max-w-xs p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md text-xs pointer-events-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-cyan-300">LAD Territory Focus</span>
                    <span className="font-mono text-fuchsia-400 font-bold">78% Risk</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span>• Echo RWMA (Septal)</span>
                      <span className="text-cyan-400 font-mono">+0.28</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>• ST Depression</span>
                      <span className="text-cyan-400 font-mono">+0.18</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>• LDL 188 mg/dL</span>
                      <span className="text-cyan-400 font-mono">+0.14</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step Details Column */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                    {active.subtitle}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
                    {active.title}
                  </h3>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {active.description}
                </p>

                {/* Sub-points for current step */}
                <div className="space-y-2.5 pt-2">
                  {active.vessels.map((v, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-surface/60 border border-border/80 flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <div className="text-xs">
                        <strong className="text-slate-200 block font-semibold">{v.name}</strong>
                        <span className="text-slate-400">{v.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stepper Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                    disabled={currentStep === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs font-mono text-slate-500">
                    Step {currentStep + 1} of {steps.length}
                  </span>

                  <button
                    onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                    disabled={currentStep === steps.length - 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-xs text-cyan-300 hover:bg-cyan-500/30 font-semibold disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Honest Caption Requirement */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <p className="italic leading-relaxed">
                "Each artery maps one-to-one to a model output. No sub-vessel lesion locations are inferred."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
