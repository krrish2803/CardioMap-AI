import React, { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VESSEL_CONFIGS, getDatasetPercentileRank } from '../../config/vessels';
import { getRiskColorHex, getRiskTier } from '../../config/theme';
import { useStore } from '../../store/useStore';

export function VesselLabel({ vesselId }) {
  const labelRef = useRef();
  const [isVisible, setIsVisible] = useState(true);

  const selectedTarget = useStore((s) => s.selectedTarget);
  const setSelectedTarget = useStore((s) => s.setSelectedTarget);
  const predictions = useStore((s) => s.predictions);

  const config = VESSEL_CONFIGS[vesselId];
  if (!config) return null;

  const prob = predictions?.vessels?.[vesselId]?.probability ?? 0.35;
  const percent = Math.round(prob * 100);
  const color = getRiskColorHex(prob);
  const tier = getRiskTier(prob);
  const isSelected = selectedTarget === vesselId;

  // Determine facing direction to hide if behind the heart
  useFrame(({ camera }) => {
    if (!labelRef.current) return;
    
    // Normal vector from origin towards label position
    const pos = new THREE.Vector3(...config.labelOffset);
    const cameraDir = camera.position.clone().sub(pos).normalize();
    const surfaceDir = pos.clone().normalize();

    // Dot product: if negative, it's facing away from the camera (on back side)
    const dot = surfaceDir.dot(cameraDir);
    const shouldShow = dot > -0.15;
    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);
    }
  });

  return (
    <group ref={labelRef} position={config.labelOffset}>
      {isVisible && (
        <Html
          center
          distanceFactor={6}
          style={{
            pointerEvents: 'auto',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            opacity: isVisible ? 1 : 0,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTarget(isSelected ? 'cad' : vesselId);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-all backdrop-blur-md shadow-lg cursor-pointer whitespace-nowrap select-none ${
              isSelected
                ? 'bg-slate-900/90 border-cyan-400 ring-2 ring-cyan-400/50 scale-105'
                : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-500 hover:scale-105'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: color }}
            />
            <span className="font-bold text-slate-200">{config.abbreviation}</span>
            {config.isWeak ? (
              <span className="flex items-center gap-1 font-bold px-1 rounded text-[11px] text-amber-300">
                <span>
                  {getDatasetPercentileRank(vesselId, prob) > 66
                    ? 'Higher risk'
                    : getDatasetPercentileRank(vesselId, prob) < 33
                    ? 'Lower risk'
                    : 'Typical risk'}
                </span>
              </span>
            ) : (
              <span
                className="font-bold px-1 rounded text-[11px]"
                style={{ color }}
              >
                {percent}%
              </span>
            )}
            {config.isWeak && (
              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                AUC {config.auc}
              </span>
            )}
          </button>
        </Html>
      )}
    </group>
  );
}
