/**
 * GCodeExportModal: 3-Axis CNC NC Program Exporter & Code Viewer
 */

import React, { useState } from 'react';
import { X, Download, Copy, Check, Terminal, Cpu, Clock, Activity } from 'lucide-react';
import { CADLayer, DoorParameters, ToolpathStats, VectorPolyline } from '../types/cnc';
import { GCodeOptions, generateToolpaths } from '../services/gcodeGenerator';
import { triggerFileDownload } from '../services/dxfExporter';
import { MATERIAL_PRESETS } from '../services/materialDatabase';

interface GCodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  polylines: VectorPolyline[];
  layers: CADLayer[];
  params: DoorParameters;
}

export const GCodeExportModal: React.FC<GCodeExportModalProps> = ({
  isOpen,
  onClose,
  polylines,
  layers,
  params,
}) => {
  if (!isOpen) return null;

  const currentMat =
    MATERIAL_PRESETS.find((m) => m.id === params.materialType) ||
    MATERIAL_PRESETS[0];

  const [dialect, setDialect] = useState<'iso' | 'mach3' | 'grbl' | 'linuxcnc' | 'dsp'>('mach3');
  const [copied, setCopied] = useState(false);
  const [maxStepdown, setMaxStepdown] = useState<number>(currentMat.recommendedPassDepth || 3.0); // mm

  const options: GCodeOptions = {
    dialect,
    maxStepdownMm: maxStepdown,
    spindleSpeed: params.spindleRpm,
    feedRate: params.feedRate,
    plungeRate: params.plungeRate,
    safeZ: params.safeZ,
  };

  const { gcode, stats } = generateToolpaths(polylines, layers, params, options);

  const handleCopy = () => {
    navigator.clipboard.writeText(gcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext =
      dialect === 'mach3' || dialect === 'dsp' ? 'tap' : dialect === 'grbl' ? 'gcode' : 'nc';
    const filename = `Door_2.5D_Machining_${dialect.toUpperCase()}.${ext}`;
    triggerFileDownload(gcode, filename, 'text/plain');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                3-Axis CNC G-Code / NC Toolpath Program
              </h2>
              <p className="text-xs text-slate-400">
                ISO standard 3-axis CNC router program for carved floral panel door
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialect & Parameters Selector */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-400 font-medium">Controller Dialect:</label>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="mach3">Mach3 / Mach4 (*.tap)</option>
              <option value="grbl">GRBL / Candle / CNCjs (*.gcode)</option>
              <option value="iso">Standard ISO G-Code (*.nc)</option>
              <option value="linuxcnc">LinuxCNC (*.ngc)</option>
              <option value="dsp">RichAuto DSP Handheld (*.tap)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-400">Max Depth per Pass:</label>
            <div className="flex items-center">
              <input
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={maxStepdown}
                onChange={(e) => setMaxStepdown(parseFloat(e.target.value) || 3.0)}
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono text-right"
              />
              <span className="text-slate-500 ml-1">mm</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Est. Time: {stats.estimatedTimeMin} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cut Dist: {Math.round(stats.cutDistanceMm / 1000)}m</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Terminal className="w-3.5 h-3.5" />
              <span>{stats.totalGcodeLines.toLocaleString()} lines</span>
            </div>
          </div>
        </div>

        {/* Code Viewport */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed select-text">
          <pre className="whitespace-pre-wrap">{gcode.slice(0, 15000)}</pre>
          {gcode.length > 15000 && (
            <div className="mt-4 p-2 text-center text-slate-500 text-[11px] border-t border-slate-800">
              ... Full code contains {stats.totalGcodeLines.toLocaleString()} lines. Click Download to save entire NC file.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            <span className="text-amber-300 font-medium">{currentMat.name}</span> • Feed: {params.feedRate} mm/min | Spindle: {params.spindleRpm} RPM | Safe Z: {params.safeZ} mm
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Download NC File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
