import { useEffect, useRef, useState, type ReactElement, type RefObject } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import CenterFocusStrongOutlined from '@mui/icons-material/CenterFocusStrongOutlined';
import ChairOutlined from '@mui/icons-material/ChairOutlined';
import { useTheme, type Theme } from '@mui/material/styles';
import { useTranslate, type TranslateFunction } from 'react-admin';
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type Group,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  AMBIENT_INTENSITY,
  CAMERA_DIRECTION,
  CAMERA_DISTANCE,
  CAMERA_FOV,
  DIRECTIONAL_INTENSITY,
  LIGHT_COLOR,
  LIGHT_POSITION,
  MAX_PIXEL_RATIO,
} from '../../../../constants/measurements';
import { stageCaptionSx, stageToolbarSx, toggleButtonSx, viewerStageSx } from '../../../../styles/measurements';
import type { ModelViewerProps, ViewerStage } from '../../../../types/measurements';
import { buildScene, disposeGroup, setObjectsVisible } from '../../../../utils/scene';
import RoomLegend from './RoomLegend';

/** Whether the browser has WebGL at all; jsdom and some locked-down browsers don't. */
const hasWebGL = (): boolean => 'WebGLRenderingContext' in window;

/**
 * The model in three.js (SPEC-004 WEB-3D-1 to WEB-3D-4): orbit, zoom, reset and the furniture toggle,
 * on the page's background color. The scene is built once per geometry; the furniture toggle and the
 * theme change it in place, so the camera stays where it was put. It draws only when something moves,
 * and gives the GPU back when it unmounts.
 */
const ModelViewer = ({ geometry, label, legend }: ModelViewerProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const theme: Theme = useTheme();
  const background: string = theme.palette.background.default;
  const host: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);
  const stage: RefObject<ViewerStage | null> = useRef<ViewerStage | null>(null);
  // The latest toggle and background, for building a scene after they changed.
  const showObjectsRef: RefObject<boolean> = useRef<boolean>(true);
  const backgroundRef: RefObject<string> = useRef<string>(background);
  const [showObjects, setShowObjects] = useState<boolean>(true);
  const [unsupported, setUnsupported] = useState<boolean>((): boolean => !hasWebGL());

  useEffect((): (() => void) | undefined => {
    const element: HTMLDivElement | null = host.current;
    if (!element || unsupported) return undefined;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true });
    } catch {
      // Creating a WebGL context can fail at mount (no GPU, too many contexts); show the fallback.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnsupported(true);
      return undefined;
    }

    const scene: Scene = new Scene();
    scene.background = new Color(backgroundRef.current);
    const group: Group = buildScene(geometry, { showObjects: true });
    setObjectsVisible(group, showObjectsRef.current);
    scene.add(group);
    scene.add(new AmbientLight(LIGHT_COLOR, AMBIENT_INTENSITY));
    const light: DirectionalLight = new DirectionalLight(LIGHT_COLOR, DIRECTIONAL_INTENSITY);
    light.position.set(...LIGHT_POSITION);
    scene.add(light);

    const bounds: Box3 = new Box3().setFromObject(group);
    const center: Vector3 = bounds.getCenter(new Vector3());
    const extent: Vector3 = bounds.getSize(new Vector3());
    const largest: number = Math.max(extent.x, extent.y, extent.z, 1);
    const camera: PerspectiveCamera = new PerspectiveCamera(CAMERA_FOV, 1, 0.01, largest * 100);
    const controls: OrbitControls = new OrbitControls(camera, renderer.domElement);
    // Just under 90°, so the camera never goes below the floor.
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.enableDamping = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // One frame per change. While damping eases the camera to a stop, update() reports each step as
    // another change, so frames keep coming until it settles.
    let frame: number = 0;
    const draw = (): void => {
      frame = 0;
      controls.update();
      renderer.render(scene, camera);
    };
    const requestDraw = (): void => {
      if (frame === 0) frame = requestAnimationFrame(draw);
    };
    // A portrait stage (a phone) sees less across than up and down, so the camera backs off to fit.
    const reset = (): void => {
      const fit: number = Math.max(1, 1 / camera.aspect);
      const direction: Vector3 = new Vector3(...CAMERA_DIRECTION).normalize();
      camera.position.copy(center).add(direction.multiplyScalar(CAMERA_DISTANCE * largest * fit));
      controls.target.copy(center);
      camera.lookAt(center);
      controls.update();
      requestDraw();
    };
    // Follows the stage's size; the ResizeObserver calls it again once a hidden stage gets one.
    const resize = (): void => {
      const width: number = element.clientWidth;
      const height: number = element.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestDraw();
    };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    element.append(renderer.domElement);
    controls.addEventListener('change', requestDraw);
    const observer: ResizeObserver = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    reset();
    stage.current = { scene, group, requestDraw, reset };

    return (): void => {
      stage.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('change', requestDraw);
      controls.dispose();
      disposeGroup(group);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [geometry, unsupported]);

  useEffect((): void => {
    showObjectsRef.current = showObjects;
    if (!stage.current) return;
    setObjectsVisible(stage.current.group, showObjects);
    stage.current.requestDraw();
  }, [showObjects]);

  useEffect((): void => {
    backgroundRef.current = background;
    if (!stage.current) return;
    stage.current.scene.background = new Color(background);
    stage.current.requestDraw();
  }, [background]);

  if (unsupported) return <Alert severity="info">{translate('app.measurements.model.unsupported')}</Alert>;

  return (
    <Box>
      <Box sx={stageToolbarSx}>
        <Button variant="outlined" startIcon={<CenterFocusStrongOutlined />} onClick={(): void => stage.current?.reset()}>
          {translate('app.measurements.model.reset')}
        </Button>
        <ToggleButton
          value="furniture"
          color="primary"
          selected={showObjects}
          onChange={(): void => setShowObjects((shown: boolean): boolean => !shown)}
          sx={toggleButtonSx}
        >
          <ChairOutlined fontSize="small" />
          {translate('app.measurements.model.furniture')}
        </ToggleButton>
      </Box>
      <Box ref={host} role="img" aria-label={label} sx={viewerStageSx} />
      <Box sx={stageCaptionSx}>
        <RoomLegend entries={legend} />
        <Typography variant="caption" color="text.secondary">
          {translate('app.measurements.model.hint')}
        </Typography>
      </Box>
    </Box>
  );
};

export default ModelViewer;
