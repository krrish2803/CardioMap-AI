import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { getRwmaTerritoryFromFeatures } from '../../lib/rwma';

export function WallMotionHighlight() {
  const features = useStore((s) => s.features);
  const showRwmaHighlight = useStore((s) => s.showRwmaHighlight);

  const territory = getRwmaTerritoryFromFeatures(features);

  // Translucent patch position per RWMA territory. Anterior and Septal share
  // one LAD-territory patch; Inferior and Lateral get their own RCA/LCX patches.
  const regionConfig = useMemo(() => {
    if (!showRwmaHighlight || !territory) return null;

    if (territory.id === 'anterior' || territory.id === 'septal') {
      return {
        name: `${territory.label} Wall (${territory.vessel} territory)`,
        position: [0.35, -0.15, 0.65],
        rotation: [0, 0.3, 0],
        scale: [0.45, 0.6, 0.25],
        color: '#38BDF8',
      };
    }
    if (territory.id === 'lateral') {
      return {
        name: `Lateral LV Wall (${territory.vessel} territory)`,
        position: [0.85, -0.05, -0.15],
        rotation: [0, 1.2, 0],
        scale: [0.35, 0.55, 0.3],
        color: '#38BDF8',
      };
    }
    if (territory.id === 'inferior') {
      return {
        name: `Inferior LV Wall (${territory.vessel} territory)`,
        position: [-0.65, -0.35, 0.05],
        rotation: [0, -1.0, 0],
        scale: [0.4, 0.5, 0.3],
        color: '#38BDF8',
      };
    }
    return null;
  }, [territory, showRwmaHighlight]);

  if (!regionConfig) return null;

  return (
    <group position={regionConfig.position} rotation={regionConfig.rotation} scale={regionConfig.scale}>
      {/* Translucent glowing wall patch */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={regionConfig.color}
          emissive={regionConfig.color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.22}
          wireframe
        />
      </mesh>
    </group>
  );
}
