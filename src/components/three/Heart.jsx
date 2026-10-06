import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

/**
 * Procedural low-poly anatomical heart mesh (deformed geometry with apex taper & ventricles)
 */
function ProceduralHeart({ isDimmed = false }) {
  const meshRef = useRef();

  // Create sculpted ventricular geometry
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.2, 5);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Taper downwards into the cardiac apex
      if (v.y < 0.2) {
        const taper = 1.0 - (0.2 - v.y) * 0.42;
        v.x *= Math.max(0.15, taper);
        v.z *= Math.max(0.2, taper);
        v.y *= 1.25; // lengthen apex
      } else {
        // Broaden upper base (atria & aortic root)
        v.x *= 1.15;
        v.z *= 0.95;
      }

      // Tilt slightly leftwards like real human anatomy
      v.x += 0.15 * Math.sin(v.y * 1.5);
      
      // Add subtle organic surface perturbation
      const noise = Math.sin(v.x * 4.0) * Math.cos(v.z * 4.0) * 0.04;
      v.addScalar(noise);

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      {/* Ventricular myocardium */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={isDimmed ? '#111827' : '#162238'}
          roughness={0.45}
          metalness={0.2}
          emissive={isDimmed ? '#030712' : '#0B132B'}
          emissiveIntensity={isDimmed ? 0.2 : 0.6}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Aorta & Great vessels root */}
      <mesh position={[0.0, 1.05, 0.05]} rotation={[0.1, 0, -0.2]}>
        <cylinderGeometry args={[0.26, 0.32, 0.65, 24]} />
        <meshStandardMaterial
          color={isDimmed ? '#1F2937' : '#1E293B'}
          roughness={0.35}
          metalness={0.3}
          emissive={isDimmed ? '#050810' : '#0E1726'}
        />
      </mesh>

      {/* Pulmonary artery trunk */}
      <mesh position={[-0.35, 0.95, 0.28]} rotation={[-0.3, 0.2, 0.6]}>
        <cylinderGeometry args={[0.22, 0.26, 0.55, 24]} />
        <meshStandardMaterial
          color={isDimmed ? '#1F2937' : '#19233C'}
          roughness={0.4}
          metalness={0.25}
        />
      </mesh>

      {/* Subtle anatomical wireframe overlay for clinical-tech feel */}
      {!isDimmed && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color="#00F0FF"
            wireframe
            transparent
            opacity={0.035}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * GLTF Model Loader with graceful fallback
 *
 * `public/models/heart.glb` is the Visible Human anatomical heart, pre-baked
 * into the scene's anatomical frame (+X patient-left, +Y superior, +Z
 * anterior), scaled to ~2.12 units tall and centered on the origin so the
 * coronary curves in config/vessels.js sit on the myocardium. See
 * public/models/README.txt for source and licence (CC BY 4.0).
 */
function ModelHeart({ isDimmed }) {
  const { scene } = useGLTF('/models/heart.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (isDimmed) {
          child.material.color = new THREE.Color('#1F2937');
          child.material.emissive = new THREE.Color('#050810');
          child.material.emissiveIntensity = 1;
        } else {
          // Scan-derived myocardium colour is too bright/saturated for the
          // dark clinical palette; desaturate and deepen it, then let the
          // emissive rim carry the highlight.
          child.material.color = new THREE.Color('#6E2B26');
          child.material.emissive = new THREE.Color('#1A0508');
          child.material.emissiveIntensity = 0.55;
          child.material.roughness = 0.55;
          child.material.metalness = 0.12;
          // The coronary curves in config/vessels.js run 0.02-0.29 units from
          // the myocardium, so bias the mesh back to stop the tubes z-fighting.
          child.material.polygonOffset = true;
          child.material.polygonOffsetFactor = 1;
          child.material.polygonOffsetUnits = 1;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [cloned, isDimmed]);

  return <primitive object={cloned} scale={1.15} position={[0, 0, 0]} />;
}

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('heart.glb failed to load, using procedural fallback:', error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function Heart({ isDimmed = false, isStoryMode = false, isHero = false }) {
  const groupRef = useRef();
  const [useFallback, setUseFallback] = useState(true);
  const prefersReducedMotion = useStore((s) => s.prefersReducedMotion);
  const [tabVisible, setTabVisible] = useState(true);

  // Probe whether /models/heart.glb exists on the server
  useEffect(() => {
    let isMounted = true;
    fetch('/models/heart.glb', { method: 'HEAD' })
      .then((res) => {
        // Guard the whole branch on isMounted: the previous version let the
        // trailing `|| res.status === 200` defeat the unmount check.
        if (!isMounted || !res.ok) return;
        // If a real file is served (and not Vite index.html fallback for 404s)
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          setUseFallback(false);
        }
      })
      .catch(() => {
        if (isMounted) setUseFallback(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Monitor visibility state to pause heartbeat on inactive tab
  useEffect(() => {
    const handleVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Heartbeat pulse at ~72 bpm (1.2 Hz)
  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    if (prefersReducedMotion || !tabVisible) {
      groupRef.current.scale.set(1, 1, 1);
      return;
    }

    const t = clock.getElapsedTime();
    // Systole / diastole twin-pulse characteristic
    const bpmFreq = 1.2 * Math.PI * 2;
    const pulseCycle = (t * bpmFreq) % (Math.PI * 2);
    
    let pulseScale = 1.0;
    if (pulseCycle < 0.6) {
      pulseScale = 1.0 + 0.028 * Math.sin(pulseCycle * (Math.PI / 0.6));
    } else if (pulseCycle > 0.8 && pulseCycle < 1.3) {
      pulseScale = 1.0 + 0.016 * Math.sin((pulseCycle - 0.8) * (Math.PI / 0.5));
    }

    groupRef.current.scale.set(pulseScale, pulseScale, pulseScale);

    // Subtle gentle yaw idle rotation for Hero
    if (isHero) {
      groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {useFallback ? (
        <ProceduralHeart isDimmed={isDimmed} />
      ) : (
        <ModelErrorBoundary fallback={<ProceduralHeart isDimmed={isDimmed} />}>
          <React.Suspense fallback={<ProceduralHeart isDimmed={isDimmed} />}>
            <ModelHeart isDimmed={isDimmed} />
          </React.Suspense>
        </ModelErrorBoundary>
      )}
    </group>
  );
}


