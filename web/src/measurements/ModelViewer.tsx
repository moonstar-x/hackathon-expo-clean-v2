import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, useTheme } from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildScene, disposeGroup } from './buildScene';
import type { ScanGeometry } from './geometry';
export default function ModelViewer({ geometry }: { geometry: ScanGeometry }) {
  const host = useRef<HTMLDivElement>(null), reset = useRef<() => void>(() => {});
  const [showObjects, setShowObjects] = useState(true), [unsupported, setUnsupported] = useState(false);
  const theme = useTheme();
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      if (!('WebGLRenderingContext' in window)) throw new Error('WebGL unavailable');
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      // WebGL context creation is an external operation that can fail at mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnsupported(true); return;
    }
    const scene = new THREE.Scene(); scene.background = new THREE.Color(theme.palette.background.default);
    const group = buildScene(geometry, { showObjects }); scene.add(group);
    const box = new THREE.Box3().setFromObject(group), center = box.getCenter(new THREE.Vector3()), extent = box.getSize(new THREE.Vector3());
    const largest = Math.max(extent.x, extent.y, extent.z, 1), camera = new THREE.PerspectiveCamera(45, 1, 0.01, largest * 100);
    const controls = new OrbitControls(camera, renderer.domElement); controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reset.current = () => { camera.position.copy(center).add(new THREE.Vector3(1, 1.2, 1).normalize().multiplyScalar(1.6 * largest)); controls.target.copy(center); camera.lookAt(center); controls.update(); }; reset.current();
    scene.add(new THREE.AmbientLight(0xffffff, 2)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(5, 10, 8); scene.add(light);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); element.append(renderer.domElement);
    const resize = () => { const width = element.clientWidth || 640, height = Math.max(element.clientHeight, 420); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
    return () => { observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); disposeGroup(group); renderer.dispose(); renderer.domElement.remove(); };
  }, [geometry, showObjects, theme.palette.background.default]);
  if (unsupported) return <Alert severity="info">Tu navegador no puede mostrar la vista 3D.</Alert>;
  return <Box><Stack direction="row" spacing={1} sx={{ mb: 1 }}><Button onClick={() => reset.current()}>Restablecer vista</Button><Button aria-pressed={showObjects} onClick={() => setShowObjects((v) => !v)}>Mobiliario</Button></Stack><Box ref={host} sx={{ width: '100%', height: '60vh', minHeight: 420 }} /></Box>;
}
