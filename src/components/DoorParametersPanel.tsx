/**
 * DoorParametersPanel: Parametric CAD & CAM Configuration Controls
 */

import React from 'react';
import { DoorParameters } from '../types/cnc';
import { Sliders, RotateCcw, Sparkles } from 'lucide-react';

interface DoorParametersPanelProps {
  params: DoorParameters;
  onChange: (updated: Partial<DoorParameters>) => void;
  onReset: () => void;
}

export const DoorParametersPanel: React.FC<DoorParametersPanelProps> = ({
  params,
  onChange,
  onReset,
}) => {
  const presets = [
    {
      name: 'Photo Match (900 x 2100 mm)',
      desc: 'Exact dimensions & proportions of reference door',
      values: {
        width: 900,
        height: 2100,
        thickness: 40,
        stileWidth: 110,
        topRailHeight: 150,
        bottomRailHeight: 180,
        archRise: 130,
        centerPanelWidth: 290,
        cofferedGridRows: 7,
        reliefDepth: 10,
        grooveDepth: 8,
      },
    },
    {
      name: 'US Standard 36" x 80" (914 x 2032 mm)',
      desc: 'Standard North American architectural entry door',
      values: {
        width: 914,
        height: 2032,
        thickness: 44.4, // 1-3/4"
        stileWidth: 114,
        topRailHeight: 145,
        bottomRailHeight: 175,
        archRise: 125,
        centerPanelWidth: 295,
        cofferedGridRows: 7,
        reliefDepth: 10,
        grooveDepth: 8,
      },
    },
    {
      name: 'Grand Entrance (1000 x 2400 mm)',
      desc: 'Tall luxury villa entry door',
      values: {
        width: 1000,
        height: 2400,
        thickness: 45,
        stileWidth: 125,
        topRailHeight: 170,
        bottomRailHeight: 200,
        archRise: 155,
        centerPanelWidth: 320,
        cofferedGridRows: 8,
        reliefDepth: 12,
        grooveDepth: 9,
      },
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm tracking-wide text-slate-100">
            CAD / CAM Settings
          </h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-cyan-400 transition flex items-center gap-1"
          title="Reset to default reference values"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Door Size Presets
          </label>
          <div className="space-y-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onChange(p.values)}
                className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-cyan-500/50 transition group"
              >
                <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-300">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-400">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: Overall Dimensions */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Overall Dimensions (mm)
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Door Width</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={params.width}
                  onChange={(e) => onChange({ width: Math.max(400, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 ml-1.5">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Door Height</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={params.height}
                  onChange={(e) => onChange({ height: Math.max(1000, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 ml-1.5">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Thickness</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={params.thickness}
                  onChange={(e) => onChange({ thickness: Math.max(10, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 ml-1.5">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Arch Center Rise</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={params.archRise}
                  onChange={(e) => onChange({ archRise: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 ml-1.5">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Stiles & Center Panel */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Frame & Panel Proportions
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Stile Width</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={params.stileWidth}
                  onChange={(e) => onChange({ stileWidth: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 ml-1.5">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Center Panel W</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={params.centerPanelWidth}
                  onChange={(e) => onChange({ centerPanelWidth: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 ml-1.5">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Grid Rows</label>
              <input
                type="number"
                min="3"
                max="12"
                value={params.cofferedGridRows}
                onChange={(e) => onChange({ cofferedGridRows: parseInt(e.target.value) || 7 })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Floral Relief Depth</label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={params.reliefDepth}
                  onChange={(e) => onChange({ reliefDepth: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-amber-300 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 ml-1.5">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: CNC Machining Parameters */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            CNC Router & Tooling
          </h4>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Origin (0,0,0) Reference</label>
              <select
                value={params.originPosition}
                onChange={(e) => onChange({ originPosition: e.target.value as any })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="bottom_left">Bottom-Left Corner (VCarve Standard)</option>
                <option value="center">Material Center (X0 Y0 at Door Center)</option>
                <option value="top_left">Top-Left Corner</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cut Feedrate</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={params.feedRate}
                    onChange={(e) => onChange({ feedRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 ml-1">mm/m</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Plunge Rate</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={params.plungeRate}
                    onChange={(e) => onChange({ plungeRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 ml-1">mm/m</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Spindle RPM</label>
                <input
                  type="number"
                  value={params.spindleRpm}
                  onChange={(e) => onChange({ spindleRpm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Safe Z Clearance</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={params.safeZ}
                    onChange={(e) => onChange({ safeZ: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 ml-1">mm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
