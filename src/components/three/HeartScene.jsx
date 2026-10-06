import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Heart } from './Heart';
import { CoronaryArtery } from './CoronaryArtery';
import { Particles } from './Particles';
import { VesselLabel } from './VesselLabel';
import { WallMotionHighlight } from './WallMotionHighlight';
import { useStore } from '../../store/useStore';
import { DEFAULT_CAMERA, VESSEL_CONFIGS } from '../../config/vessels';
import { getRwmaTerritoryFromFeatures } from '../../lib/rwma';
import { RotateCcw, AlertTriangle, Layers } from 'lucide-react';

/**
 * Controller to smoothly interpolate camera position & OrbitControls target on vessel selection
 */
function CameraRig({ controlsRef }) {
  const cameraPreset = useStore((s) => s.cameraPreset);
  const targetPos = useRef(new THREE.Vector3(...DEFAULT_CAMERA.position));
  const targetLook = useRef(new THREE.Vector3(...DEFAULT_CAMERA.target));

  useEffect(() => {
    if (cameraPreset) {
      targetPos.current.set(...cameraPreset.position);
      targetLook.current.set(...cameraPreset.target);
    }
  }, [cameraPreset]);

  useFrame(({ camera }, delta) => {
    // Smooth lerp to camera preset
    camera.position.lerp(targetPos.current, Math.min(1, delta * 3.5));
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, Math.min(1, delta * 3.5));
      controlsRef.current.update();
    }
  });

  return null;
}

/**
 * WebGL Support detector
 */
function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

export function HeartScene({
  isHero = false,
  isDimmed = false,
  showLabels = true,
  showParticles = true,
  interactive = true,
  overrideVesselProb = null,
  className = '',
}) {
  const controlsRef = useRef();
  const [webglSupported, setWebglSupported] = useState(true);

  const resetCamera = useStore((s) => s.resetCamera);
  const selectedTarget = useStore((s) => s.selectedTarget);
  const setSelectedTarget = useStore((s) => s.setSelectedTarget);
  const showRwmaHighlight = useStore((s) => s.showRwmaHighlight);
  const setShowRwmaHighlight = useStore((s) => s.setShowRwmaHighlight);
  const features = useStore((s) => s.features);

  const rwmaTerritory = getRwmaTerritoryFromFeatures(features);

  useEffect(() => {
    setWebglSupported(checkWebGLSupport());
  }, []);

  if (!webglSupported) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900/80 border border-slate-800 rounded-xl">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-lg font-display font-semibold text-slate-100">WebGL Acceleration Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-sm mt-1">
          Hardware graphics acceleration is disabled or unsupported in this browser environment. The clinical risk calculations remain fully accessible.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full select-none overflow-hidden ${className}`}>
      {/* 3D Canvas */}
      <Canvas
        dpr={[1, 1.5]} // Capped at 1.5 DPR for smooth performance on integrated GPUs
        camera={{ position: DEFAULT_CAMERA.position, fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#070B14']} />
        
        {/* Clinical Lighting Setup */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-4, -3, -4]} intensity={0.4} color="#38BDF8" />
        <pointLight position={[0, 2, 3]} intensity={0.8} color="#00F0FF" distance={8} />

        <Suspense fallback={null}>
          <group position={[0, -0.1, 0]}>
            <Heart isDimmed={isDimmed} isHero={isHero} />
            <CoronaryArtery vesselId="LAD" overrideProb={overrideVesselProb?.LAD} isDimmedByParent={isDimmed} />
            <CoronaryArtery vesselId="LCX" overrideProb={overrideVesselProb?.LCX} isDimmedByParent={isDimmed} />
            <CoronaryArtery vesselId="RCA" overrideProb={overrideVesselProb?.RCA} isDimmedByParent={isDimmed} />
            
            {showParticles && !isDimmed && <Particles />}
            <WallMotionHighlight />

            {showLabels && !isDimmed && (
              <>
                <VesselLabel vesselId="LAD" />
                <VesselLabel vesselId="LCX" />
                <VesselLabel vesselId="RCA" />
              </>
            )}
          </group>
        </Suspense>

        {interactive && (
          <>
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableZoom={true}
              minDistance={1.8}
              maxDistance={5.8}
              enableDamping={true}
              dampingFactor={0.06}
              rotateSpeed={0.8}
            />
            <CameraRig controlsRef={controlsRef} />
          </>
        )}
      </Canvas>

      {/* Floating 3D Overlays (Reset View, Legend, RWMA Info) */}
      {interactive && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            {/* Camera Presets & Reset */}
            <div className="flex items-center gap-1.5 flex-wrap pointer-events-auto">
              <button
                onClick={resetCamera}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface/90 hover:bg-surface border border-slate-700 hover:border-cyan-400/50 text-xs text-slate-300 hover:text-white transition-all shadow-md backdrop-blur-md cursor-pointer"
                title="Reset anatomical camera angle"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setSelectedTarget(selectedTarget === 'LAD' ? 'cad' : 'LAD')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all shadow-md backdrop-blur-md cursor-pointer ${
                  selectedTarget === 'LAD'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400/40'
                    : 'bg-surface/80 border-slate-800 text-slate-300 hover:text-white hover:bg-surface'
                }`}
              >
                Anterior (LAD)
              </button>

              <button
                onClick={() => setSelectedTarget(selectedTarget === 'LCX' ? 'cad' : 'LCX')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all shadow-md backdrop-blur-md cursor-pointer ${
                  selectedTarget === 'LCX'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-surface/80 border-slate-800 text-slate-300 hover:text-white hover:bg-surface'
                }`}
              >
                Lateral (LCX)
              </button>

              <button
                onClick={() => setSelectedTarget(selectedTarget === 'RCA' ? 'cad' : 'RCA')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all shadow-md backdrop-blur-md cursor-pointer ${
                  selectedTarget === 'RCA'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-surface/80 border-slate-800 text-slate-300 hover:text-white hover:bg-surface'
                }`}
              >
                Inferior (RCA)
              </button>

              {rwmaTerritory && (
                <button
                  onClick={() => setShowRwmaHighlight(!showRwmaHighlight)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all shadow-md backdrop-blur-md cursor-pointer ${
                    showRwmaHighlight
                      ? 'bg-sky-950/80 border-sky-500/60 text-sky-200'
                      : 'bg-surface/70 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle echocardiography regional wall motion highlight"
                >
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Echo Wall</span>
                </button>
              )}
            </div>

            {/* Selected Vessel Inspector HUD Card */}
            {selectedTarget && selectedTarget !== 'cad' && VESSEL_CONFIGS[selectedTarget] && (
              <div className="pointer-events-auto p-3 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-xs shadow-2xl backdrop-blur-md max-w-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="font-display font-bold text-white text-sm">
                      {VESSEL_CONFIGS[selectedTarget].name}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedTarget('cad')}
                    className="text-slate-400 hover:text-white p-0.5 hover:bg-slate-800 rounded text-xs cursor-pointer"
                    title="Close selection"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {VESSEL_CONFIGS[selectedTarget].territory}
                </p>
                <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
                  <span className="text-[10px] font-mono text-cyan-300">
                    {VESSEL_CONFIGS[selectedTarget].confidenceBadge || 'Good confidence (AUC 0.85)'}
                  </span>
                  <button
                    onClick={() => {
                      const setTab = useStore.getState().setActiveTab;
                      setTab('explain');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Inspect SHAP →</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls Bar: Gradient Legend & Wall Motion Label */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pointer-events-auto">
            {/* Colorblind-safe Risk Legend */}
            <div className="p-2.5 rounded-xl bg-surface/90 border border-border/80 backdrop-blur-md shadow-xl text-[11px] max-w-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="font-medium text-slate-300">Calibrated Stenosis Risk</span>
                <span className="font-mono text-[10px] text-slate-500">Colorblind-Safe</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#3B82F6] via-[#FACC15] via-[#FB923C] to-[#D946EF] mb-1.5 shadow-inner" />
              <div className="grid grid-cols-4 text-center font-mono text-[9px] text-slate-400">
                <span className="text-blue-400">&lt;20%</span>
                <span className="text-yellow-400">20-45%</span>
                <span className="text-orange-400">45-70%</span>
                <span className="text-fuchsia-400">≥70%</span>
              </div>
            </div>

            {/* RWMA Clarification Badge */}
            {rwmaTerritory && showRwmaHighlight && (
              <div className="px-3 py-1.5 rounded-lg bg-sky-950/80 border border-sky-500/40 text-[11px] text-sky-200 max-w-xs backdrop-blur-md">
                <span className="font-semibold block text-sky-300">
                  Echo RWMA: {rwmaTerritory.label} ({rwmaTerritory.vessel} territory)
                </span>
                <span className="text-[10px] text-sky-400/90 italic">Input finding, not a prediction</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
