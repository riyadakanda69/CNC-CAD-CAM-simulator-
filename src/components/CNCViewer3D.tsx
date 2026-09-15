/**
 * CNCViewer3D: Three.js 3D CNC Toolpath & Carved Relief Simulator
 * Realistic wood grain relief rendering with 3-axis CNC Spindle animation and toolpath trajectory overlays.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CADLayer, DoorParameters, ToolpathSegment, VectorPolyline } from '../types/cnc';
import { Play, Pause, RotateCcw, Eye, Layers, Compass, Box } from 'lucide-react';

interface CNCViewer3DProps {
  polylines: VectorPolyline[];
  layers: CADLayer[];
  params: DoorParameters;
  toolpathSegments: ToolpathSegment[];
}

export const CNCViewer3D: React.FC<CNCViewer3DProps> = ({
  polylines,
  layers,
  params,
  toolpathSegments,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation & Simulation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(5); // 1x, 5x, 20x
  const [simProgress, setSimProgress] = useState(0); // 0 to 1
  const [currentCoord, setCurrentCoord] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: params.safeZ,
  });

  // Display toggles
  const [showToolpaths, setShowToolpaths] = useState(true);
  const [showDoorMesh, setShowDoorMesh] = useState(true);
  const [showSpindle, setShowSpindle] = useState(true);
  const [viewPreset, setViewPreset] = useState<'iso' | 'front' | 'crest' | 'vine'>('iso');

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const spindleGroupRef = useRef<THREE.Group | null>(null);
  const toolpathLineRef = useRef<THREE.LineSegments | null>(null);
  const doorMeshRef = useRef<THREE.Mesh | null>(null);
  const reqIdRef = useRef<number | null>(null);

  // Mouse orbit state
  const isOrbitingRef = useRef(false);
  const orbitStartRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 2400, theta: Math.PI / 4, phi: Math.PI / 3.2 });
  const targetRef = useRef(new THREE.Vector3(params.width / 2, params.height / 2, 0));

  // Generate procedural carved wood relief canvas texture
  const createDoorHeightAndDiffuseTexture = () => {
    const texW = 1024;
    const texH = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = texW;
    canvas.height = texH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Natural warm wood base (Teak / Oak)
    const grad = ctx.createLinearGradient(0, 0, texW, 0);
    grad.addColorStop(0, '#c28b58');
    grad.addColorStop(0.2, '#d69d6b');
    grad.addColorStop(0.5, '#c9905c');
    grad.addColorStop(0.8, '#d49b67');
    grad.addColorStop(1, '#be8653');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, texW, texH);

    // 2. Subtle organic wood grain stripes
    ctx.fillStyle = 'rgba(100, 60, 20, 0.06)';
    for (let y = 0; y < texH; y += 3) {
      if (Math.sin(y * 0.08) > 0.4) {
        ctx.fillRect(0, y, texW, 2);
      }
    }

    // 3. Draw carved grooves and relief features with depth shading
    // Scale CAD coordinates to texture canvas
    const cadToTexX = (cadX: number) => (cadX / params.width) * texW;
    const cadToTexY = (cadY: number) => (1 - cadY / params.height) * texH;

    // Draw recessed background of center panel and grid grooves
    ctx.save();
    polylines.forEach((poly) => {
      if (poly.points.length < 2) return;

      if (
        poly.layerId === '04_COFFERED_GRID_GROOVES' ||
        poly.layerId === '07_CENTER_PANEL_BORDER'
      ) {
        ctx.fillStyle = 'rgba(70, 35, 10, 0.45)'; // deep recessed groove shadow
        ctx.beginPath();
        ctx.moveTo(cadToTexX(poly.points[0].x), cadToTexY(poly.points[0].y));
        for (let i = 1; i < poly.points.length; i++) {
          ctx.lineTo(cadToTexX(poly.points[i].x), cadToTexY(poly.points[i].y));
        }
        if (poly.closed) ctx.closePath();
        ctx.fill();
      }
    });

    // Draw carved raised relief (sunflowers, acanthus leaves, rosettes, crest)
    polylines.forEach((poly) => {
      if (poly.points.length < 2) return;

      if (
        poly.layerId === '08_FLORAL_VINE_RELIEF' ||
        poly.layerId === '03_CROWN_CREST_RELIEF' ||
        poly.layerId === '06_ROSETTES_CARVING'
      ) {
        // Highlighting relief top surface
        ctx.fillStyle = 'rgba(235, 185, 140, 0.85)'; // raised wood highlight
        ctx.shadowColor = 'rgba(40, 15, 0, 0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.moveTo(cadToTexX(poly.points[0].x), cadToTexY(poly.points[0].y));
        for (let i = 1; i < poly.points.length; i++) {
          ctx.lineTo(cadToTexX(poly.points[i].x), cadToTexY(poly.points[i].y));
        }
        if (poly.closed) ctx.closePath();
        ctx.fill();
      }

      // Vein fine v-carve lines
      if (poly.layerId === '09_FLORAL_VEIN_DETAILS') {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(50, 20, 5, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cadToTexX(poly.points[0].x), cadToTexY(poly.points[0].y));
        for (let i = 1; i < poly.points.length; i++) {
          ctx.lineTo(cadToTexX(poly.points[i].x), cadToTexY(poly.points[i].y));
        }
        ctx.stroke();
      }

      // Arch molding stepped frames
      if (poly.layerId === '02_TOP_ARCH_FRAME') {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(80, 40, 15, 0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cadToTexX(poly.points[0].x), cadToTexY(poly.points[0].y));
        for (let i = 1; i < poly.points.length; i++) {
          ctx.lineTo(cadToTexX(poly.points[i].x), cadToTexY(poly.points[i].y));
        }
        if (poly.closed) ctx.closePath();
        ctx.stroke();
      }
    });
    ctx.restore();

    return canvas;
  };

  // Build Three.js 3D Toolpath Geometry
  const buildToolpathLineSegments = () => {
    if (toolpathSegments.length === 0) return null;

    const positions: number[] = [];
    const colors: number[] = [];

    const rapidColor = new THREE.Color('#ef4444'); // Red
    const feedColor = new THREE.Color('#06b6d4'); // Cyan
    const plungeColor = new THREE.Color('#f59e0b'); // Amber

    toolpathSegments.forEach((seg) => {
      positions.push(seg.from.x, seg.from.y, seg.from.z);
      positions.push(seg.to.x, seg.to.y, seg.to.z);

      let col = feedColor;
      if (seg.type === 'rapid' || seg.type === 'retract') col = rapidColor;
      else if (seg.type === 'plunge') col = plungeColor;

      colors.push(col.r, col.g, col.b);
      colors.push(col.r, col.g, col.b);
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    return new THREE.LineSegments(geom, mat);
  };

  // Build 3-Axis Spindle Visual Mesh
  const buildSpindleAssembly = () => {
    const group = new THREE.Group();

    // Spindle Cylindrical Body (Steel & Aluminum)
    const bodyGeom = new THREE.CylinderGeometry(35, 35, 120, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.z = 80;
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // ER20 Collet Nut
    const colletGeom = new THREE.CylinderGeometry(18, 14, 25, 18);
    const colletMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.3,
    });
    const collet = new THREE.Mesh(colletGeom, colletMat);
    collet.position.z = 15;
    collet.rotation.x = Math.PI / 2;
    group.add(collet);

    // CNC Router Bit (Tapered Ballnose / V-Bit)
    const bitGeom = new THREE.ConeGeometry(3.5, 25, 16);
    const bitMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Carbide gold/amber
      metalness: 0.95,
      roughness: 0.15,
    });
    const bit = new THREE.Mesh(bitGeom, bitMat);
    bit.position.z = -5;
    bit.rotation.x = -Math.PI / 2;
    group.add(bit);

    // Laser crosshair guide ring
    const ringGeom = new THREE.RingGeometry(8, 9, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.z = 0.5;
    group.add(ring);

    return group;
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0f19'); // Deep slate
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 10, 8000);
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff5e6, 1.4);
    dirLight1.position.set(params.width * 1.2, params.height * 1.5, 800);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x90c0ff, 0.6);
    dirLight2.position.set(-params.width * 0.8, -params.height * 0.5, 400);
    scene.add(dirLight2);

    // CNC Wasteboard / Bed Platform (Grid under the door)
    const bedGeom = new THREE.PlaneGeometry(params.width + 300, params.height + 300);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1,
    });
    const bed = new THREE.Mesh(bedGeom, bedMat);
    bed.position.set(params.width / 2, params.height / 2, -params.thickness - 2);
    scene.add(bed);

    // Door Solid Slab Geometry & Relief Texture
    const doorTexCanvas = createDoorHeightAndDiffuseTexture();
    const texture = doorTexCanvas ? new THREE.CanvasTexture(doorTexCanvas) : null;
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
    }

    const doorGeom = new THREE.BoxGeometry(params.width, params.height, params.thickness);
    // Face materials: Top face has wood relief texture, sides are wood tone
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x8a552e,
      roughness: 0.6,
      metalness: 0.05,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.45,
      metalness: 0.08,
      bumpMap: texture,
      bumpScale: 1.8,
    });

    const doorMaterials = [sideMat, sideMat, sideMat, sideMat, topMat, sideMat];
    const doorMesh = new THREE.Mesh(doorGeom, doorMaterials);
    doorMesh.position.set(params.width / 2, params.height / 2, -params.thickness / 2);
    doorMesh.castShadow = true;
    doorMesh.receiveShadow = true;
    scene.add(doorMesh);
    doorMeshRef.current = doorMesh;

    // Toolpaths Line Segments
    const lines = buildToolpathLineSegments();
    if (lines) {
      scene.add(lines);
      toolpathLineRef.current = lines;
    }

    // CNC Spindle
    const spindle = buildSpindleAssembly();
    spindle.position.set(params.width / 2, params.height / 2, params.safeZ);
    scene.add(spindle);
    spindleGroupRef.current = spindle;

    // Animation Render Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      reqIdRef.current = requestAnimationFrame(animate);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Handle playback simulation
      if (isPlaying && toolpathSegments.length > 0) {
        setSimProgress((prev) => {
          const next = prev + (delta * (0.015 * playbackSpeed));
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
      }

      renderer.render(scene, camera);
    };

    reqIdRef.current = requestAnimationFrame(animate);

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      renderer.dispose();
    };
  }, [params.width, params.height, params.thickness]);

  // Update camera based on spherical coords
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sphericalRef.current;
    const target = targetRef.current;

    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y - radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.up.set(0, 1, 0);
    cameraRef.current.lookAt(target);
  };

  // Sync simulation progress to Spindle position
  useEffect(() => {
    if (!spindleGroupRef.current || toolpathSegments.length === 0) return;

    const index = Math.min(
      toolpathSegments.length - 1,
      Math.floor(simProgress * (toolpathSegments.length - 1))
    );
    const seg = toolpathSegments[index];
    if (seg) {
      spindleGroupRef.current.position.set(seg.to.x, seg.to.y, seg.to.z);
      setCurrentCoord({ x: seg.to.x, y: seg.to.y, z: seg.to.z });
    }
  }, [simProgress, toolpathSegments]);

  // Sync visibility toggles
  useEffect(() => {
    if (toolpathLineRef.current) toolpathLineRef.current.visible = showToolpaths;
    if (doorMeshRef.current) doorMeshRef.current.visible = showDoorMesh;
    if (spindleGroupRef.current) spindleGroupRef.current.visible = showSpindle;
  }, [showToolpaths, showDoorMesh, showSpindle]);

  // Preset Views Switcher
  const applyViewPreset = (preset: 'iso' | 'front' | 'crest' | 'vine') => {
    setViewPreset(preset);
    const w = params.width;
    const h = params.height;

    if (preset === 'iso') {
      targetRef.current.set(w / 2, h / 2, 0);
      sphericalRef.current = { radius: Math.max(w, h) * 1.4, theta: Math.PI / 4.5, phi: Math.PI / 2.8 };
    } else if (preset === 'front') {
      targetRef.current.set(w / 2, h / 2, 0);
      sphericalRef.current = { radius: Math.max(w, h) * 1.5, theta: 0, phi: Math.PI / 2 };
    } else if (preset === 'crest') {
      targetRef.current.set(w / 2, h - 250, 0);
      sphericalRef.current = { radius: 750, theta: Math.PI / 6, phi: Math.PI / 2.5 };
    } else if (preset === 'vine') {
      targetRef.current.set(w / 2, h * 0.45, 0);
      sphericalRef.current = { radius: 850, theta: Math.PI / 5, phi: Math.PI / 2.6 };
    }
    updateCameraPosition();
  };

  // Mouse Orbit controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 2) {
      isOrbitingRef.current = true;
      orbitStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isOrbitingRef.current) return;
    const deltaX = e.clientX - orbitStartRef.current.x;
    const deltaY = e.clientY - orbitStartRef.current.y;
    orbitStartRef.current = { x: e.clientX, y: e.clientY };

    if (e.buttons === 1) {
      // Rotate orbit
      sphericalRef.current.theta -= deltaX * 0.006;
      sphericalRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, sphericalRef.current.phi - deltaY * 0.006)
      );
    } else if (e.buttons === 2) {
      // Pan
      targetRef.current.x -= deltaX * 1.5;
      targetRef.current.y += deltaY * 1.5;
    }
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isOrbitingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    sphericalRef.current.radius = Math.max(
      300,
      Math.min(8000, sphericalRef.current.radius * zoomFactor)
    );
    updateCameraPosition();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0b0f19] select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Camera View Presets Bar */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-lg p-1.5 shadow-xl text-slate-200 text-xs">
        <button
          id="btn-view-iso"
          onClick={() => applyViewPreset('iso')}
          className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
            viewPreset === 'iso' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'hover:bg-slate-800'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Iso 3D</span>
        </button>
        <button
          id="btn-view-front"
          onClick={() => applyViewPreset('front')}
          className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
            viewPreset === 'front' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'hover:bg-slate-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Front</span>
        </button>
        <button
          id="btn-view-crest"
          onClick={() => applyViewPreset('crest')}
          className={`px-2.5 py-1 rounded transition ${
            viewPreset === 'crest' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'hover:bg-slate-800'
          }`}
        >
          Crown Crest
        </button>
        <button
          id="btn-view-vine"
          onClick={() => applyViewPreset('vine')}
          className={`px-2.5 py-1 rounded transition ${
            viewPreset === 'vine' ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'hover:bg-slate-800'
          }`}
        >
          Floral Vine
        </button>
      </div>

      {/* Layer/Object Toggles */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-lg p-1.5 shadow-xl text-slate-300 text-xs">
        <button
          id="btn-toggle-toolpaths"
          onClick={() => setShowToolpaths(!showToolpaths)}
          className={`px-2 py-1 rounded transition flex items-center gap-1 ${
            showToolpaths ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-500'
          }`}
          title="Toggle Toolpath Lines"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Toolpaths</span>
        </button>
        <button
          id="btn-toggle-door"
          onClick={() => setShowDoorMesh(!showDoorMesh)}
          className={`px-2 py-1 rounded transition flex items-center gap-1 ${
            showDoorMesh ? 'text-amber-400 bg-amber-950/60' : 'text-slate-500'
          }`}
          title="Toggle Door Blank & Relief"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Door</span>
        </button>
        <button
          id="btn-toggle-spindle"
          onClick={() => setShowSpindle(!showSpindle)}
          className={`px-2 py-1 rounded transition flex items-center gap-1 ${
            showSpindle ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-500'
          }`}
          title="Toggle CNC Spindle Cutter"
        >
          <span>Spindle</span>
        </button>
      </div>

      {/* CNC Cutter Playback & Timeline Controls */}
      <div className="absolute bottom-4 left-4 right-4 max-w-2xl mx-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl text-slate-200">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            id="btn-play-sim"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center transition shadow-lg shadow-cyan-500/20"
            title={isPlaying ? 'Pause Simulation' : 'Play Toolpath Simulation'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* Reset Button */}
          <button
            id="btn-reset-sim"
            onClick={() => {
              setIsPlaying(false);
              setSimProgress(0);
            }}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            title="Rewind to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Progress Timeline Scrub Bar */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
              <span>Machining Progress</span>
              <span>{Math.round(simProgress * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={simProgress}
              onChange={(e) => {
                setIsPlaying(false);
                setSimProgress(parseFloat(e.target.value));
              }}
              className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Playback Speed Multiplier */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 text-[11px]">
            {[1, 5, 20].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded font-mono ${
                  playbackSpeed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Live Spindle DRO (Digital Readout) */}
        <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 mr-1">X:</span>
              <span className="text-cyan-300 font-semibold">{currentCoord.x.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">Y:</span>
              <span className="text-cyan-300 font-semibold">{currentCoord.y.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">Z:</span>
              <span className={currentCoord.z < 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {currentCoord.z.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Rapid (G0)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Feed (G1)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Plunge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
