import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createVesselCurve } from '../../config/vessels';
import { getRiskColorHex } from '../../config/theme';
import { useStore } from '../../store/useStore';

function VesselParticleStream({ vesselId, count = 12 }) {
  const meshRef = useRef();
  const predictions = useStore((s) => s.predictions);
  const selectedTarget = useStore((s) => s.selectedTarget);
  const curve = useMemo(() => createVesselCurve(vesselId), [vesselId]);

  const prob = predictions?.vessels?.[vesselId]?.probability ?? 0.35;
  const isSelected = selectedTarget === vesselId;
  const isDimmed = ['LAD', 'LCX', 'RCA'].includes(selectedTarget) && !isSelected;

  // Staggered particle initial offsets [0..1]
  const offsets = useMemo(() => {
    return Array.from({ length: count }, (_, i) => i / count);
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(getRiskColorHex(prob)), [prob]);

  useFrame((_, delta) => {
    if (!meshRef.current || !curve) return;

    // Visual flow metaphor: higher stenosis (higher prob) -> slower flow
    const speed = (0.28 * (1.1 - prob * 0.75));

    for (let i = 0; i < count; i++) {
      offsets[i] = (offsets[i] + delta * speed) % 1.0;
      const point = curve.getPointAt(offsets[i]);
      dummy.position.copy(point);
      
      const scale = (0.024 + Math.sin(offsets[i] * Math.PI) * 0.012) * (isDimmed ? 0.4 : 1.0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!curve) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, count]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={isDimmed ? 0.2 : 0.9}
      />
    </instancedMesh>
  );
}

export function Particles({ isLowPower = false }) {
  const prefersReducedMotion = useStore((s) => s.prefersReducedMotion);
  const particleCount = isLowPower ? 6 : 14;

  if (prefersReducedMotion) return null;

  return (
    <group>
      <VesselParticleStream vesselId="LAD" count={particleCount} />
      <VesselParticleStream vesselId="LCX" count={particleCount} />
      <VesselParticleStream vesselId="RCA" count={particleCount} />
    </group>
  );
}
