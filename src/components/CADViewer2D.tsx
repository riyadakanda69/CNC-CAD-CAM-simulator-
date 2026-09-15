/**
 * CADViewer2D: High-Performance 2D Vector CAD Blueprint Viewport
 * Provides pan/zoom, millimeter grid, layer coloring, vertex inspection, and measurement tools.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CADLayer, DoorParameters, Point2D, VectorPolyline } from '../types/cnc';
import { ZoomIn, ZoomOut, Maximize2, Crosshair, Eye, EyeOff, Ruler } from 'lucide-react';

interface CADViewer2DProps {
  polylines: VectorPolyline[];
  layers: CADLayer[];
  params: DoorParameters;
  selectedPolylineId: string | null;
  onSelectPolyline: (poly: VectorPolyline | null) => void;
  showNodes: boolean;
  onToggleShowNodes: () => void;
}

export const CADViewer2D: React.FC<CADViewer2DProps> = ({
  polylines,
  layers,
  params,
  selectedPolylineId,
  onSelectPolyline,
  showNodes,
  onToggleShowNodes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport transform state
  const [scale, setScale] = useState(0.35);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorCoord, setCursorCoord] = useState<Point2D | null>(null);

  // Caliper measurement tool
  const [isMeasureMode, setIsMeasureMode] = useState(false);
  const [measurePt1, setMeasurePt1] = useState<Point2D | null>(null);
  const [measurePt2, setMeasurePt2] = useState<Point2D | null>(null);

  // Active layer map
  const layerMap = new Map<string, CADLayer>(layers.map((l) => [l.id, l]));

  // Auto-fit to viewport on mount or when params change
  const fitToView = () => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const pad = 60;
    const scaleX = (clientWidth - pad * 2) / params.width;
    const scaleY = (clientHeight - pad * 2) / params.height;
    const fitScale = Math.min(scaleX, scaleY);
    setScale(fitScale);

    // Center the door in the canvas (door origin bottom-left in CAD space)
    const centerX = (clientWidth - params.width * fitScale) / 2;
    const centerY = clientHeight - (clientHeight - params.height * fitScale) / 2;
    setPan({ x: centerX, y: centerY });
  };

  useEffect(() => {
    fitToView();
  }, [params.width, params.height, params.originPosition]);

  // Coordinate transforms: CAD (X right, Y up, mm) <-> Screen (X right, Y down, px)
  const cadToScreen = (x: number, y: number): Point2D => ({
    x: pan.x + x * scale,
    y: pan.y - y * scale,
  });

  const screenToCad = (sx: number, sy: number): Point2D => ({
    x: Math.round(((sx - pan.x) / scale) * 10) / 10,
    y: Math.round(((pan.y - sy) / scale) * 10) / 10,
  });

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    // Clear background (Dark modern CAD blueprint theme)
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Millimeter Grid
    const drawGrid = () => {
      ctx.lineWidth = 1;
      const stepMm = scale > 0.8 ? 50 : scale > 0.3 ? 100 : 200;

      const cadBottomLeft = screenToCad(0, height);
      const cadTopRight = screenToCad(width, 0);

      const startX = Math.floor(cadBottomLeft.x / stepMm) * stepMm;
      const endX = Math.ceil(cadTopRight.x / stepMm) * stepMm;
      const startY = Math.floor(cadBottomLeft.y / stepMm) * stepMm;
      const endY = Math.ceil(cadTopRight.y / stepMm) * stepMm;

      // Minor grid lines
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.beginPath();
      for (let x = startX; x <= endX; x += stepMm) {
        const p = cadToScreen(x, 0);
        ctx.moveTo(p.x, 0);
        ctx.lineTo(p.x, height);
      }
      for (let y = startY; y <= endY; y += stepMm) {
        const p = cadToScreen(0, y);
        ctx.moveTo(0, p.y);
        ctx.lineTo(width, p.y);
      }
      ctx.stroke();

      // Major axes (X=0, Y=0 in green & red CAD convention)
      const originScreen = cadToScreen(0, 0);

      // X Axis (Red)
      ctx.strokeStyle = '#ef444488';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, originScreen.y);
      ctx.lineTo(width, originScreen.y);
      ctx.stroke();

      // Y Axis (Green)
      ctx.strokeStyle = '#22c55e88';
      ctx.beginPath();
      ctx.moveTo(originScreen.x, 0);
      ctx.lineTo(originScreen.x, height);
      ctx.stroke();

      // Origin Marker
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    drawGrid();

    // 2. Draw Door Material Boundary Shadow & Blank
    const pOrigin = cadToScreen(0, 0);
    const pTopRight = cadToScreen(params.width, params.height);
    const doorW = params.width * scale;
    const doorH = params.height * scale;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#1e293b66'; // semi-transparent door bed
    ctx.fillRect(pOrigin.x, pTopRight.y, doorW, doorH);
    ctx.restore();

    // 3. Draw All Polylines by Layer
    polylines.forEach((poly) => {
      const layer = layerMap.get(poly.layerId);
      if (layer && !layer.visible) return;

      if (poly.points.length < 2) return;

      const isSelected = selectedPolylineId === poly.id;
      ctx.strokeStyle = isSelected ? '#ffffff' : layer?.color || '#94a3b8';
      ctx.lineWidth = isSelected ? 2.5 : poly.layerId === '01_DOOR_OUTLINE' ? 2 : 1.2;

      ctx.beginPath();
      const firstPt = cadToScreen(poly.points[0].x, poly.points[0].y);
      ctx.moveTo(firstPt.x, firstPt.y);

      for (let i = 1; i < poly.points.length; i++) {
        const pt = cadToScreen(poly.points[i].x, poly.points[i].y);
        ctx.lineTo(pt.x, pt.y);
      }

      if (poly.closed) {
        ctx.closePath();
      }
      ctx.stroke();

      // Show vertices / nodes if enabled or selected
      if (showNodes || isSelected) {
        ctx.fillStyle = isSelected ? '#38bdf8' : layer?.color || '#cbd5e1';
        poly.points.forEach((pt) => {
          const s = cadToScreen(pt.x, pt.y);
          ctx.beginPath();
          ctx.arc(s.x, s.y, isSelected ? 3 : 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });

    // 4. Draw Active Caliper Measurement
    if (measurePt1) {
      const s1 = cadToScreen(measurePt1.x, measurePt1.y);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(s1.x, s1.y, 5, 0, Math.PI * 2);
      ctx.fill();

      const targetPt = measurePt2 || cursorCoord;
      if (targetPt) {
        const s2 = cadToScreen(targetPt.x, targetPt.y);

        // Dashed measurement line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(s2.x, s2.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Distance text box
        const distMm = Math.round(Math.hypot(targetPt.x - measurePt1.x, targetPt.y - measurePt1.y));
        const distInches = (distMm / 25.4).toFixed(2);
        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(midX - 55, midY - 26, 110, 24);
        ctx.strokeStyle = '#f59e0b';
        ctx.strokeRect(midX - 55, midY - 26, 110, 24);

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${distMm} mm (${distInches}")`, midX, midY - 10);
      }
    }
  }, [
    polylines,
    layers,
    params,
    scale,
    pan,
    selectedPolylineId,
    showNodes,
    measurePt1,
    measurePt2,
    cursorCoord,
  ]);

  // Mouse event handlers for pan, zoom, pick, measure
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.max(0.08, Math.min(6.0, scale * zoomFactor));

    // Zoom centered on cursor
    setPan({
      x: mouseX - (mouseX - pan.x) * (newScale / scale),
      y: mouseY - (mouseY - pan.y) * (newScale / scale),
    });
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left click
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const cadPt = screenToCad(mouseX, mouseY);

      if (isMeasureMode) {
        if (!measurePt1) {
          setMeasurePt1(cadPt);
        } else {
          setMeasurePt2(cadPt);
        }
        return;
      }

      // Check if clicked near any polyline
      const clickedPoly = findPolylineNear(cadPt.x, cadPt.y);
      onSelectPolyline(clickedPoly);

      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cadPt = screenToCad(mouseX, mouseY);
    setCursorCoord(cadPt);

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const findPolylineNear = (cadX: number, cadY: number): VectorPolyline | null => {
    const toleranceCad = 14 / scale; // 14 pixels tolerance
    for (const poly of polylines) {
      const layer = layerMap.get(poly.layerId);
      if (layer && !layer.visible) continue;

      for (let i = 0; i < poly.points.length - 1; i++) {
        const p1 = poly.points[i];
        const p2 = poly.points[i + 1];
        const dist = distToSegment({ x: cadX, y: cadY }, p1, p2);
        if (dist < toleranceCad) {
          return poly;
        }
      }
    }
    return null;
  };

  const distToSegment = (p: Point2D, v: Point2D, w: Point2D) => {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Viewport Control Bar */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-slate-800/90 backdrop-blur-sm border border-slate-700/80 rounded-lg p-1.5 shadow-xl text-slate-200 text-xs">
        <button
          id="btn-fit-view"
          onClick={fitToView}
          className="p-1.5 hover:bg-slate-700 rounded transition flex items-center gap-1"
          title="Fit Door to Window"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Fit</span>
        </button>
        <button
          id="btn-zoom-in"
          onClick={() => setScale((s) => Math.min(6.0, s * 1.25))}
          className="p-1.5 hover:bg-slate-700 rounded transition"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="btn-zoom-out"
          onClick={() => setScale((s) => Math.max(0.08, s * 0.8))}
          className="p-1.5 hover:bg-slate-700 rounded transition"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <button
          id="btn-toggle-nodes"
          onClick={onToggleShowNodes}
          className={`p-1.5 rounded transition flex items-center gap-1 ${
            showNodes ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'hover:bg-slate-700'
          }`}
          title="Toggle Polyline Vertex Nodes"
        >
          <Crosshair className="w-4 h-4" />
          <span className="hidden sm:inline">Nodes</span>
        </button>
        <button
          id="btn-measure-tool"
          onClick={() => {
            setIsMeasureMode(!isMeasureMode);
            setMeasurePt1(null);
            setMeasurePt2(null);
          }}
          className={`p-1.5 rounded transition flex items-center gap-1 ${
            isMeasureMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'hover:bg-slate-700'
          }`}
          title="Measure Distance Caliper (Click two points)"
        >
          <Ruler className="w-4 h-4" />
          <span className="hidden sm:inline">Measure</span>
        </button>
      </div>

      {/* Floating Coordinates & Dimension Readout */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-slate-800/90 backdrop-blur-sm border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-xl text-slate-300 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">X:</span>
          <span className="text-cyan-400 font-semibold">{cursorCoord ? `${cursorCoord.x.toFixed(1)}` : '0.0'}</span>
          <span className="text-slate-500 text-[10px]">mm</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Y:</span>
          <span className="text-cyan-400 font-semibold">{cursorCoord ? `${cursorCoord.y.toFixed(1)}` : '0.0'}</span>
          <span className="text-slate-500 text-[10px]">mm</span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="text-slate-400 text-[11px]">
          Scale: {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Caliper Instruction Banner */}
      {isMeasureMode && (
        <div className="absolute top-16 left-4 bg-amber-950/90 border border-amber-600/60 rounded-lg px-3 py-2 text-amber-200 text-xs shadow-xl flex items-center gap-2">
          <Ruler className="w-4 h-4 text-amber-400" />
          <span>
            {!measurePt1
              ? 'Click 1st point to start measurement'
              : !measurePt2
              ? 'Click 2nd point to complete measurement'
              : 'Measurement complete. Click again to measure anew.'}
          </span>
          {measurePt1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMeasurePt1(null);
                setMeasurePt2(null);
              }}
              className="ml-2 text-amber-400 underline text-[11px]"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
};
