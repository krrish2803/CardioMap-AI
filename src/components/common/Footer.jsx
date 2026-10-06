import React from 'react';
import { Heart, ShieldCheck, Github, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-[#04070D] border-t border-border py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-cyan-400 flex items-center justify-center text-slate-950 font-bold">
                <Heart className="w-3.5 h-3.5 fill-slate-950" />
              </div>
              <span className="font-display font-bold text-white text-base">CardioMap 3D</span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs">
              CardioMap 3D transforms multi-modal cardiovascular risk assessment into a vessel-level, interactive anatomical reality with strict calibration and game-theoretic SHAP explainability.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Designed for clinical researchers, interventional cardiologists, and patient consultation.
            </p>
          </div>

          {/* Clinical & Scientific Standards */}
          <div className="space-y-2">
            <h4 className="font-display font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              Scientific Foundations
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>• SCCT Coronary Artery Guidelines</li>
              <li>• Isotonic Calibration (Zadrozny & Elkan)</li>
              <li>• SHAP TreeExplainer (Lundberg et al.)</li>
              <li>• Colorblind-Safe Viridis/Okabe Palettes</li>
            </ul>
          </div>

          {/* System & Architecture */}
          <div className="space-y-2">
            <h4 className="font-display font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
              System Architecture
            </h4>
            <ul className="space-y-1.5 text-slate-400 text-xs">
              <li>• Three.js / React Three Fiber</li>
              <li>• Dynamic Schema-Driven UI</li>
              <li>• WebGL GPU Shader Optimization</li>
              <li>• 100% Config-Extensible Pipeline</li>
            </ul>
          </div>
        </div>

        {/* Regulatory Advisory & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-slate-500 text-[11px]">
          <p>
            © {new Date().getFullYear()} CardioMap 3D. Research & Clinical Decision Support Prototype. Not FDA approved for standalone diagnostic intervention.
          </p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 transition-colors">Model Methodology</span>
            <span className="hover:text-slate-400 transition-colors">Documentation</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
