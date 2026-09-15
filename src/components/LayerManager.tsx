/**
 * LayerManager: VCarve Layer Control & Single-Layer DXF Exporter
 */

import React from 'react';
import { CADLayer, DoorParameters, VectorPolyline } from '../types/cnc';
import { Eye, EyeOff, Download, Layers } from 'lucide-react';
import { exportToDXF, triggerFileDownload } from '../services/dxfExporter';

interface LayerManagerProps {
  layers: CADLayer[];
  polylines: VectorPolyline[];
  params: DoorParameters;
  onToggleLayer: (layerId: string) => void;
  onToggleAllLayers: (visible: boolean) => void;
  onUpdateLayerDepth: (layerId: string, depth: number) => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  polylines,
  params,
  onToggleLayer,
  onToggleAllLayers,
  onUpdateLayerDepth,
}) => {
  // Count polylines per layer
  const counts = new Map<string, number>();
  polylines.forEach((p) => {
    counts.set(p.layerId, (counts.get(p.layerId) || 0) + 1);
  });

  const handleDownloadSingleLayer = (layer: CADLayer) => {
    const dxfContent = exportToDXF(polylines, layers, params, {
      filterLayerId: layer.id,
    });
    const filename = `${layer.vcarveName}.dxf`;
    triggerFileDownload(dxfContent, filename, 'application/dxf');
  };

  const allVisible = layers.every((l) => l.visible);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm tracking-wide text-slate-100">
            VCarve CAD Layers
          </h3>
        </div>
        <button
          id="btn-toggle-all-layers"
          onClick={() => onToggleAllLayers(!allVisible)}
          className="text-xs text-slate-400 hover:text-cyan-400 transition"
        >
          {allVisible ? 'Hide All' : 'Show All'}
        </button>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {layers.map((layer) => {
          const count = counts.get(layer.id) || 0;
          return (
            <div
              key={layer.id}
              className={`group p-2.5 rounded-lg border transition ${
                layer.visible
                  ? 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                  : 'bg-slate-900/50 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Visibility Toggle & Color Badge */}
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => onToggleLayer(layer.id)}
                    className="p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-slate-100 transition"
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate leading-tight">
                      {layer.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      Layer: {layer.vcarveName}
                    </p>
                  </div>
                </div>

                {/* Single Layer DXF Download */}
                <button
                  onClick={() => handleDownloadSingleLayer(layer)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-300 transition"
                  title={`Download DXF for ${layer.name}`}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Strategy, Tool & Depth Badges */}
              <div className="mt-2 pt-1.5 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 capitalize font-medium">
                  {layer.toolpathStrategy.replace('_', ' ')}
                </span>

                <div className="flex items-center gap-2 text-slate-400 font-mono">
                  <span>
                    Depth:{' '}
                    <input
                      type="number"
                      value={layer.targetDepth}
                      onChange={(e) =>
                        onUpdateLayerDepth(layer.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-10 bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-semibold border border-slate-700 text-right focus:outline-none focus:border-cyan-500"
                    />{' '}
                    mm
                  </span>
                  <span className="text-slate-500">({count} obj)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Instructions Tip */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
        <p className="font-medium text-slate-300 mb-0.5">VCarve Pro Layer Mapping</p>
        Vectors are grouped by operation so you can use VCarve's automated toolpathing to match each layer to its router bit.
      </div>
    </div>
  );
};
