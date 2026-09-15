/**
 * VCarveGuideModal: Complete Step-by-Step Vectric VCarve Pro & Aspire Workflow Guide
 */

import React from 'react';
import { X, BookOpen, Layers, Hammer, CheckSquare, Download, AlertCircle } from 'lucide-react';

interface VCarveGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadDXF: () => void;
}

export const VCarveGuideModal: React.FC<VCarveGuideModalProps> = ({
  isOpen,
  onClose,
  onDownloadDXF,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: 'Job Setup in VCarve / Aspire',
      icon: BookOpen,
      instructions: [
        'Open Vectric VCarve Pro or Aspire and click "Create a new file".',
        'Job Size: Set Width (X) to 900 mm and Height (Y) to 2100 mm (or your custom door size).',
        'Thickness (Z): Enter 40 mm (or your door blank thickness).',
        'Z Zero Position: Select "Material Surface" (Z = 0 on top face of timber).',
        'XY Datum Position: Select Bottom-Left corner (matches standard CAD DXF export).',
        'Units: Select "mm".',
      ],
    },
    {
      step: 2,
      title: 'Import the DXF File',
      icon: Download,
      instructions: [
        'Click "File" -> "Import" -> "Import Vectors / DXF...".',
        'Select the downloaded "Door_2.5D_Master_VCarve.dxf" file.',
        'VCarve will automatically create and name all 10 distinct layers matching the door architecture!',
        'Notice how colors and layer names correspond to the exact carving operations.',
      ],
    },
    {
      step: 3,
      title: 'Layer-Based Toolpath Assignment',
      icon: Layers,
      instructions: [
        'Open the "Toolpaths" tab on the right side of VCarve.',
        'At the bottom of any toolpath dialog, check "Vector Selection: Automatic (Layer)".',
        'Assign each layer to its corresponding toolpath as shown in the table below.',
      ],
    },
    {
      step: 4,
      title: 'Recommended Tooling & Depths',
      icon: Hammer,
      instructions: [
        'Layer 04_COFFERED_GROOVES: Pocket Toolpath -> Cut Depth: 8 mm -> Tool: 1/4" (6.35mm) Flat Endmill or 90° V-groove bit.',
        'Layer 05_PANEL_ISLANDS: Profile Toolpath (Outside / On Vector) -> Cut Depth: 4 mm -> Tool: 90° V-Bit or Chamfer cutter.',
        'Layer 06_ROSETTES: V-Carve / Engrave Toolpath -> Cut Depth: 6 mm -> Tool: 60° V-Bit (Creates sharp flower petals & beads).',
        'Layer 07_CENTER_POCKET: Pocket Toolpath -> Cut Depth: 10 mm -> Tool: 1/4" Flat Endmill (Clears background around vine relief).',
        'Layer 08_FLORAL_VINE_RELIEF: 3D Finishing or V-Carve Toolpath -> Cut Depth: 10 mm -> Tool: 1/8" (3.175mm) or 3mm Ballnose (Stepover 8-10%).',
        'Layer 09_VEIN_ENGRAVE: Quick Engrave Toolpath -> Cut Depth: 2.0 mm -> Tool: 60° V-Bit (Fine leaf veins and seed crosshatch).',
        'Layer 03_CROWN_CREST: V-Carve Toolpath -> Cut Depth: 8 mm -> Tool: 60° V-Bit or 3mm Ballnose.',
        'Layer 02_TOP_ARCH_FRAME: Molding or Profile Toolpath -> Cut Depth: 6 mm -> Tool: 90° V-Bit along vector.',
        'Layer 01_DOOR_OUTLINE: 2D Profile Toolpath (Outside) -> Cut Depth: 40.5 mm -> Tool: 1/2" (12.7mm) or 6mm Endmill -> Add 4-6 3D Holding Tabs!',
      ],
    },
    {
      step: 5,
      title: 'Preview Simulation & G-Code Export',
      icon: CheckSquare,
      instructions: [
        'Click "Preview All Toolpaths" in VCarve to view the complete 3D carved door with wood grain texture.',
        'Verify there are no tool collisions, gouging, or uncut areas.',
        'Click "Save Toolpaths" and select your CNC machine post-processor (e.g. Mach3/4 mm (*.tap), GRBL (*.gcode), LinuxCNC, or DSP).',
        'Transfer the NC code to your 3-axis CNC machine controller and run!',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                VCarve Pro / Aspire Setup Guide
              </h2>
              <p className="text-xs text-slate-400">
                Step-by-step instructions for importing DXF layers and generating 3-axis toolpaths
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Quick Notice */}
          <div className="p-3 bg-cyan-950/50 border border-cyan-700/50 rounded-xl flex items-start gap-3 text-xs text-cyan-200">
            <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-cyan-100 mb-0.5">
                100% Native AutoCAD R2000 ASCII DXF Specification
              </p>
              This generated DXF uses clean <code className="bg-cyan-900/60 px-1 py-0.5 rounded font-mono">LWPOLYLINE</code> closed vector boundaries and pre-configured layer names specifically designed to match Vectric VCarve auto-toolpathing.
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center">
                      {s.step}
                    </span>
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-200">{s.title}</h3>
                  </div>

                  <ul className="space-y-1.5 pl-8 text-xs text-slate-300 list-disc">
                    {s.instructions.map((inst, iIdx) => (
                      <li key={iIdx} className="leading-relaxed">
                        {inst}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Compatible with VCarve Pro, VCarve Desktop, Aspire, Cut2D, Carveco
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                onDownloadDXF();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Master DXF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
