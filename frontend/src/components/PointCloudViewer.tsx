import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

interface ViewerProps {
  plyUrl: string | null;
  loading?: boolean;
  error?: string;
}

export default function PointCloudViewer({ plyUrl, loading, error }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: TrackballControls;
    points: THREE.Points | null;
    animId: number;
  } | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [pointCount, setPointCount] = useState<number>(0);
  const [pointSize, setPointSize] = useState<number>(2.0);
  const [showSettings, setShowSettings] = useState(false);

  // Update point size in real time
  const updatePointSize = useCallback((size: number) => {
    setPointSize(size);
    if (sceneRef.current?.points) {
      (sceneRef.current.points.material as THREE.PointsMaterial).size = size / 100;
    }
  }, []);

  // Reset camera view
  const resetView = useCallback(() => {
    if (!sceneRef.current) return;
    const { camera, controls } = sceneRef.current;
    camera.position.set(0, 0, 3);
    camera.up.set(0, 1, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }, []);

  useEffect(() => {
    if (!plyUrl || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
    camera.position.set(0, 0, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls - TrackballControls 支持真正的360度自由旋转
    const controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 3.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.15;
    controls.minDistance = 0.1;
    controls.maxDistance = 100;

    sceneRef.current = { renderer, scene, camera, controls, points: null, animId: 0 };

    // Load PLY
    const loader = new PLYLoader();
    loader.load(
      plyUrl,
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const s = 2 / maxDim;

        geometry.translate(-center.x, -center.y, -center.z);
        geometry.scale(s, s, s);

        const hasColors = geometry.hasAttribute('color');
        const count = geometry.getAttribute('position').count;
        setPointCount(count);

        const material = new THREE.PointsMaterial({
          size: pointSize / 100,
          vertexColors: hasColors,
          color: hasColors ? undefined : new THREE.Color(0x4fc3f7),
          sizeAttenuation: true,
        });

        const pts = new THREE.Points(geometry, material);
        scene.add(pts);
        if (sceneRef.current) sceneRef.current.points = pts;
      },
      undefined,
      (err) => {
        console.error('PLY load error:', err);
        setViewerError('加载PLY文件失败');
      }
    );

    // Animate
    const animate = () => {
      const id = requestAnimationFrame(animate);
      if (sceneRef.current) sceneRef.current.animId = id;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      controls.handleResize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.animId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [plyUrl]);

  if (loading) {
    return (
      <div className="w-full h-[500px] bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">加载 3D 模型中...</p>
        </div>
      </div>
    );
  }

  if (error || viewerError) {
    return (
      <div className="w-full h-[500px] bg-slate-900 rounded-lg flex items-center justify-center border border-red-500/30">
        <p className="text-red-400">{error || viewerError}</p>
      </div>
    );
  }

  if (!plyUrl) return null;

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-[500px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700" />

      {/* 底部信息 */}
      <div className="absolute bottom-3 left-3 text-xs text-slate-500">
        左键旋转 | 滚轮缩放 | 右键平移
        {pointCount > 0 && ` | ${pointCount.toLocaleString()} 个点`}
      </div>

      {/* 设置按钮 */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-3 right-3 w-8 h-8 bg-slate-800/80 hover:bg-slate-700 rounded flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        title="设置"
      >
        ⚙
      </button>

      {/* 重置视角按钮 */}
      <button
        onClick={resetView}
        className="absolute top-3 right-14 w-8 h-8 bg-slate-800/80 hover:bg-slate-700 rounded flex items-center justify-center text-slate-400 hover:text-white transition-colors text-sm"
        title="重置视角"
      >
        ↺
      </button>

      {/* 设置面板 */}
      {showSettings && (
        <div className="absolute top-14 right-3 bg-slate-800/95 rounded-lg p-3 w-52 border border-slate-600 shadow-lg">
          <div className="text-xs text-slate-300 mb-2 font-medium">显示设置</div>

          <div className="mb-3">
            <label className="text-xs text-slate-400 block mb-1">
              点大小: {pointSize.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={pointSize}
              onChange={(e) => updatePointSize(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <button
            onClick={resetView}
            className="w-full text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 rounded transition-colors"
          >
            重置视角
          </button>
        </div>
      )}
    </div>
  );
}
