/**
 * CNC Door 2.5D CAD/CAM & VCarve DXF Generator
 * Complete Vector CAD/CAM suite for neoclassical carved panel doors.
 */

import React, { useMemo, useState } from 'react';
import {
  CADLayer,
  DoorParameters,
  VectorPolyline,
} from './types/cnc';
import {
  DEFAULT_CAD_LAYERS,
  generateDoorGeometry,
} from './services/doorGeometry';
import {
  exportToDXF,
  exportToSVG,
  triggerFileDownload,
} from './services/dxfExporter';
import { generateToolpaths } from './services/gcodeGenerator';
import { CADViewer2D } from './components/CADViewer2D';
import { CNCViewer3D } from './components/CNCViewer3D';
import { LayerManager } from './components/LayerManager';
import { DoorParametersPanel } from './components/DoorParametersPanel';
import { ReferenceDoorComparison } from './components/ReferenceDoorComparison';
import { VCarveGuideModal } from './components/VCarveGuideModal';
import { GCodeExportModal } from './components/GCodeExportModal';
import { MATERIAL_PRESETS } from './services/materialDatabase';
import {
  Download,
  Layers,
  Sliders,
  Compass,
  Box,
  FileCode,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  SplitSquareVertical,
} from 'lucide-react';

const INITIAL_PARAMS: DoorParameters = {
  materialType: 'oak',
  width: 900,
  height: 2100,
  thickness: 40,
  stileWidth: 110,
  topRailHeight: 150,
  bottomRailHeight: 180,
  archRise: 130,
  cofferedGridCols: 1,
  cofferedGridRows: 7,
  grooveWidth: 28,
  grooveDepth: 8,
  centerPanelWidth: 290,
  reliefDepth: 10,
  vBitAngle: 60,
  ballnoseDiameter: 3.175,
  endmillDiameter: 6.35,
  safeZ: 10,
  feedRate: 2200,
  plungeRate: 700,
  spindleRpm: 16000,
  originPosition: 'bottom_left',
};

export default function App() {
  // State
  const [params, setParams] = useState<DoorParameters>(INITIAL_PARAMS);
  const [layers, setLayers] = useState<CADLayer[]>(DEFAULT_CAD_LAYERS);
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'compare'>('2d');

  // Sidebar Toggles
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Inspector & selection
  const [selectedPolyline, setSelectedPolyline] = useState<VectorPolyline | null>(null);
  const [showNodes, setShowNodes] = useState(false);

  // Modals
  const [isVCarveGuideOpen, setIsVCarveGuideOpen] = useState(false);
  const [isGCodeModalOpen, setIsGCodeModalOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Generate Door Vector Geometry
  const polylines = useMemo(() => {
    return generateDoorGeometry(params);
  }, [params]);

  // Generate 3D Toolpath Segments for Simulator
  const { segments: toolpathSegments, stats: toolpathStats } = useMemo(() => {
    return generateToolpaths(polylines, layers, params, {
      dialect: 'mach3',
      maxStepdownMm: 3.0,
      spindleSpeed: params.spindleRpm,
      feedRate: params.feedRate,
      plungeRate: params.plungeRate,
      safeZ: params.safeZ,
    });
  }, [polylines, layers, params]);

  // Layer handlers
  const handleToggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleAllLayers = (visible: boolean) => {
    setLayers((prev) => prev.map((l) => ({ ...l, visible })));
  };

  const handleUpdateLayerDepth = (layerId: string, depth: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, targetDepth: depth } : l))
    );
  };

  const handleUpdateParams = (updated: Partial<DoorParameters>) => {
    setParams((prev) => ({ ...prev, ...updated }));
  };

  const handleResetParams = () => {
    setParams(INITIAL_PARAMS);
    showToast('Reset door parameters to reference specifications');
  };

  // Export handlers
  const handleDownloadMasterDXF = () => {
    const dxf = exportToDXF(polylines, layers, params);
    const filename = `Door_2.5D_Master_VCarve_${params.width}x${params.height}mm.dxf`;
    triggerFileDownload(dxf, filename, 'application/dxf');
    setShowExportMenu(false);
    showToast(`Master DXF exported: ${filename}`);
  };

  const handleDownloadSVG = () => {
    const svg = exportToSVG(polylines, layers, params);
    const filename = `Door_2.5D_Vectors_${params.width}x${params.height}mm.svg`;
    triggerFileDownload(svg, filename, 'image/svg+xml');
    setShowExportMenu(false);
    showToast(`Vector SVG exported: ${filename}`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP HEADER BAR */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
            <Box className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-100">
                CNC Door 2.5D CAD/CAM
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                VCarve DXF
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 font-medium border border-amber-500/20">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      (MATERIAL_PRESETS.find((m) => m.id === params.materialType) || MATERIAL_PRESETS[0]).surfaceColor,
                  }}
                />
                {(MATERIAL_PRESETS.find((m) => m.id === params.materialType) || MATERIAL_PRESETS[0]).name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {params.width} × {params.height} × {params.thickness} mm • Neoclassical Arch &amp; Floral Vine
            </p>
          </div>
        </div>

        {/* Center View Selector Tabs */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            id="tab-2d-cad"
            onClick={() => setActiveTab('2d')}
            className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
              activeTab === '2d'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>2D CAD Blueprint</span>
          </button>
          <button
            id="tab-3d-sim"
            onClick={() => setActiveTab('3d')}
            className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
              activeTab === '3d'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D CNC Simulator</span>
          </button>
          <button
            id="tab-compare"
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Photo Reference</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* VCarve Guide Button */}
          <button
            id="btn-vcarve-guide"
            onClick={() => setIsVCarveGuideOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>VCarve Guide</span>
          </button>

          {/* G-Code Exporter Button */}
          <button
            id="btn-gcode-export"
            onClick={() => setIsGCodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>G-Code NC</span>
          </button>

          {/* Primary Download DXF Dropdown */}
          <div className="relative">
            <button
              id="btn-download-dxf-main"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Download DXF</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 text-xs">
                <button
                  id="menu-download-master-dxf"
                  onClick={handleDownloadMasterDXF}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition flex items-start gap-2.5"
                >
                  <Download className="w-4 h-4 text-cyan-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Master VCarve DXF</div>
                    <div className="text-[10px] text-slate-400">All 10 layers in one file (AutoCAD R2000)</div>
                  </div>
                </button>

                <button
                  id="menu-download-svg"
                  onClick={handleDownloadSVG}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition flex items-start gap-2.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Export Scalable SVG</div>
                    <div className="text-[10px] text-slate-400">Layered vector graphics (Inkscape, Illustrator)</div>
                  </div>
                </button>

                <div className="border-t border-slate-800 my-1" />

                <button
                  id="menu-open-gcode"
                  onClick={() => {
                    setShowExportMenu(false);
                    setIsGCodeModalOpen(true);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition flex items-start gap-2.5"
                >
                  <FileCode className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Mach3 / GRBL G-Code</div>
                    <div className="text-[10px] text-slate-400">Ready-to-run 3-axis CNC router files</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drawer: Parametric Settings */}
        <aside
          className={`${
            showLeftSidebar ? 'w-72 md:w-80' : 'w-0'
          } flex-shrink-0 transition-all duration-200 overflow-hidden relative z-20`}
        >
          <DoorParametersPanel
            params={params}
            onChange={handleUpdateParams}
            onReset={handleResetParams}
          />
        </aside>

        {/* Toggle Left Sidebar Button */}
        <button
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          className="absolute left-2 top-2 z-20 bg-slate-900/90 border border-slate-700/80 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px]"
          title="Toggle Parameters Panel"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Center Viewport */}
        <main className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
          {activeTab === '2d' && (
            <CADViewer2D
              polylines={polylines}
              layers={layers}
              params={params}
              selectedPolylineId={selectedPolyline?.id || null}
              onSelectPolyline={setSelectedPolyline}
              showNodes={showNodes}
              onToggleShowNodes={() => setShowNodes(!showNodes)}
            />
          )}

          {activeTab === '3d' && (
            <CNCViewer3D
              polylines={polylines}
              layers={layers}
              params={params}
              toolpathSegments={toolpathSegments}
            />
          )}

          {activeTab === 'compare' && <ReferenceDoorComparison />}

          {/* Polyline Element Inspector (Floats at bottom center when an entity is clicked) */}
          {selectedPolyline && activeTab === '2d' && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs z-30">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Selected Vector</span>
                <span className="font-semibold text-cyan-300">{selectedPolyline.name || 'Contour'}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Layer</span>
                <span className="text-slate-200">{selectedPolyline.layerId}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Vertices</span>
                <span className="text-slate-200 font-mono">{selectedPolyline.points.length} nodes</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Depth</span>
                <span className="text-amber-400 font-mono font-bold">-{selectedPolyline.depth || 6} mm</span>
              </div>
              <button
                onClick={() => setSelectedPolyline(null)}
                className="ml-2 text-slate-500 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </main>

        {/* Toggle Right Sidebar Button */}
        <button
          onClick={() => setShowRightSidebar(!showRightSidebar)}
          className="absolute right-2 top-2 z-20 bg-slate-900/90 border border-slate-700/80 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px]"
          title="Toggle VCarve Layers"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        {/* Right Drawer: VCarve Layer Manager */}
        <aside
          className={`${
            showRightSidebar ? 'w-72 md:w-80' : 'w-0'
          } flex-shrink-0 transition-all duration-200 overflow-hidden relative z-20`}
        >
          <LayerManager
            layers={layers}
            polylines={polylines}
            params={params}
            onToggleLayer={handleToggleLayer}
            onToggleAllLayers={handleToggleAllLayers}
            onUpdateLayerDepth={handleUpdateLayerDepth}
          />
        </aside>
      </div>

      {/* 3. BOTTOM STATUS BAR */}
      <footer className="h-7 border-t border-slate-800 bg-slate-950 px-3 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            VCarve Pro R2000 Compatible
          </span>
          <span className="text-slate-600">|</span>
          <span>Entities: {polylines.length} polylines</span>
          <span className="text-slate-600">|</span>
          <span>Active Layers: {layers.filter((l) => l.visible).length} / {layers.length}</span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>Est. CNC Machining: {toolpathStats.estimatedTimeMin} min</span>
          <span className="text-slate-600">|</span>
          <span>Feed: {params.feedRate} mm/m</span>
          <span className="text-slate-600">|</span>
          <span>RPM: {params.spindleRpm}</span>
        </div>
      </footer>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-10 right-4 z-50 bg-slate-900 border border-cyan-500/60 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* VCarve Setup Guide Modal */}
      <VCarveGuideModal
        isOpen={isVCarveGuideOpen}
        onClose={() => setIsVCarveGuideOpen(false)}
        onDownloadDXF={handleDownloadMasterDXF}
      />

      {/* G-Code Export Modal */}
      <GCodeExportModal
        isOpen={isGCodeModalOpen}
        onClose={() => setIsGCodeModalOpen(false)}
        polylines={polylines}
        layers={layers}
        params={params}
      />
    </div>
  );
}
