import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VESSEL_CONFIGS, createVesselCurve } from '../../config/vessels';
import { getRiskColorHex } from '../../config/theme';
import { useStore } from '../../store/useStore';

export function CoronaryArtery({ vesselId, overrideProb = null, isDimmedByParent = false }) {
  const meshRef = useRef();
  const materialRef = useRef();

  const selectedTarget = useStore((s) => s.selectedTarget);
  const setSelectedTarget = useStore((s) => s.setSelectedTarget);
  const hoveredVessel = useStore((s) => s.hoveredVessel);
  const setHoveredVessel = useStore((s) => s.setHoveredVessel);
  const predictions = useStore((s) => s.predictions);

  const [hovered, setHovered] = useState(false);

  const config = VESSEL_CONFIGS[vesselId];

  // Determine current probability
  const probability = useMemo(() => {
    if (overrideProb !== null) return overrideProb;
    if (predictions?.vessels?.[vesselId]) {
      return predictions.vessels[vesselId].probability;
    }
    return 0.3; // Baseline default
  }, [overrideProb, predictions, vesselId]);

  // Construct Tube Geometry from CatmullRom spline
  const geometry = useMemo(() => {
    const curve = createVesselCurve(vesselId);
    if (!curve) return null;
    const radius = config.tubeRadius * (1.0 + probability * 0.25);
    return new THREE.TubeGeometry(curve, 64, radius, 12, false);
  }, [vesselId, config, probability]);

  // Visual selection and hover states
  const isSelected = selectedTarget === vesselId;
  const isAnyVesselSelected = ['LAD', 'LCX', 'RCA'].includes(selectedTarget);
  const isDimmed = isDimmedByParent || (isAnyVesselSelected && !isSelected);

  // Target colors
  const targetHexColor = useMemo(() => {
    if (isDimmedByParent) return '#4B5563';
    return getRiskColorHex(probability);
  }, [probability, isDimmedByParent]);

  // Color lerping inside useFrame for smooth transition
  useFrame((_, delta) => {
    if (!materialRef.current) return;

    const mat = materialRef.current;
    const targetColor = new THREE.Color(targetHexColor);
    
    // Lerp base color
    mat.color.lerp(targetColor, Math.min(1, delta * 3.8));

    // Calculate target emissive color and intensity
    const isHoverActive = hovered || hoveredVessel === vesselId;
    let targetIntensity = 0.6 + probability * 1.6;

    if (isSelected) {
      targetIntensity += 1.5;
    } else if (isHoverActive) {
      targetIntensity += 1.0;
    } else if (isDimmed) {
      targetIntensity = 0.15;
    }

    mat.emissive.lerp(targetColor, Math.min(1, delta * 3.8));
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, Math.min(1, delta * 4.0));
  });

  if (!geometry) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setHoveredVessel(vesselId);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          setHoveredVessel(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedTarget(isSelected ? 'cad' : vesselId);
        }}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={targetHexColor}
          emissive={targetHexColor}
          emissiveIntensity={isSelected ? 2.0 : 0.8}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>

      {/* Selected vessel outer glow halo */}
      {isSelected && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color={targetHexColor}
            wireframe
            transparent
            opacity={0.35}
          />
        </mesh>
      )}
    </group>
  );
}
