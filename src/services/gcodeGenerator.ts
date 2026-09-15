/**
 * 3-Axis CNC G-Code Generator & Toolpath Simulator
 * Generates ISO standard NC code, Mach3/4, GRBL, and DSP compatible toolpaths.
 */

import { CADLayer, DoorParameters, ToolpathSegment, ToolpathStats, VectorPolyline } from '../types/cnc';

export interface GCodeOptions {
  dialect: 'iso' | 'mach3' | 'grbl' | 'linuxcnc' | 'dsp';
  selectedLayerIds?: string[];
  maxStepdownMm: number; // e.g., 3.0mm max depth per pass
  spindleSpeed: number; // RPM
  feedRate: number; // mm/min
  plungeRate: number; // mm/min
  safeZ: number; // mm
}

export function generateToolpaths(
  polylines: VectorPolyline[],
  layers: CADLayer[],
  params: DoorParameters,
  options: GCodeOptions
): { segments: ToolpathSegment[]; gcode: string; stats: ToolpathStats } {
  const segments: ToolpathSegment[] = [];
  const gcodeLines: string[] = [];

  const activeLayers = new Map(layers.map((l) => [l.id, l]));
  const targetPolys = polylines.filter((p) => {
    if (options.selectedLayerIds && options.selectedLayerIds.length > 0) {
      return options.selectedLayerIds.includes(p.layerId);
    }
    const layer = activeLayers.get(p.layerId);
    return layer ? layer.visible : true;
  });

  // G-Code Header
  const dateStr = new Date().toISOString().split('T')[0];
  gcodeLines.push(
    `; ====================================================`,
    `; 3-AXIS CNC TOOLPATH: CARVED PANEL DOOR 2.5D`,
    `; Generated on: ${dateStr}`,
    `; Machine Type: 3-Axis CNC Router (XYZ)`,
    `; Post Dialect: ${options.dialect.toUpperCase()}`,
    `; Material Dimensions: ${params.width} x ${params.height} x ${params.thickness} mm`,
    `; Spindle RPM: ${options.spindleSpeed}`,
    `; Feedrate: ${options.feedRate} mm/min | Plunge: ${options.plungeRate} mm/min`,
    `; Safe Z: ${options.safeZ} mm`,
    `; ====================================================`,
    `G21 ; Set units to millimeters`,
    `G90 ; Absolute distance mode`,
    `G17 ; Select XY plane`,
    `G94 ; Feed rate per minute mode`,
    `G00 Z${options.safeZ.toFixed(2)} ; Move to safe clearance Z`,
    `M03 S${options.spindleSpeed} ; Spindle clockwise ON`,
    `G04 P2.0 ; Dwell 2 seconds for spindle spin-up`,
    ``
  );

  let currentPos = { x: 0, y: 0, z: options.safeZ };
  let totalRapidDist = 0;
  let totalCutDist = 0;

  // Group polylines by layer
  const polylinesByLayer = new Map<string, VectorPolyline[]>();
  targetPolys.forEach((poly) => {
    if (!polylinesByLayer.has(poly.layerId)) {
      polylinesByLayer.set(poly.layerId, []);
    }
    polylinesByLayer.get(poly.layerId)!.push(poly);
  });

  // Process layer by layer in logical CNC order
  layers.forEach((layer) => {
    const layerPolys = polylinesByLayer.get(layer.id);
    if (!layerPolys || layerPolys.length === 0) return;

    gcodeLines.push(
      `; ----------------------------------------------------`,
      `; LAYER: ${layer.name} (${layer.toolpathStrategy})`,
      `; Target Depth: -${layer.targetDepth}mm | Tool: ${layer.defaultTool}`,
      `; ----------------------------------------------------`
    );

    const totalTargetDepth = layer.targetDepth;
    const maxPass = options.maxStepdownMm;
    const passesCount = Math.max(1, Math.ceil(totalTargetDepth / maxPass));
    const passStep = totalTargetDepth / passesCount;

    layerPolys.forEach((poly) => {
      if (poly.points.length < 2) return;

      const firstPt = poly.points[0];

      // 1. Rapid move to above the starting point at safe Z
      if (currentPos.x !== firstPt.x || currentPos.y !== firstPt.y) {
        // Retract to safe Z first if not already there
        if (currentPos.z < options.safeZ) {
          segments.push({
            type: 'retract',
            from: { ...currentPos },
            to: { x: currentPos.x, y: currentPos.y, z: options.safeZ },
            layerId: layer.id,
            tool: layer.defaultTool,
          });
          currentPos.z = options.safeZ;
          gcodeLines.push(`G00 Z${options.safeZ.toFixed(2)}`);
        }

        const rapidMoveDist = Math.hypot(firstPt.x - currentPos.x, firstPt.y - currentPos.y);
        totalRapidDist += rapidMoveDist;

        segments.push({
          type: 'rapid',
          from: { ...currentPos },
          to: { x: firstPt.x, y: firstPt.y, z: options.safeZ },
          layerId: layer.id,
          tool: layer.defaultTool,
        });

        currentPos.x = firstPt.x;
        currentPos.y = firstPt.y;
        gcodeLines.push(`G00 X${firstPt.x.toFixed(3)} Y${firstPt.y.toFixed(3)}`);
      }

      // Stepdown passes for depth
      for (let pass = 1; pass <= passesCount; pass++) {
        const currentZDepth = -(pass * passStep);

        // 2. Plunge to cut depth
        segments.push({
          type: 'plunge',
          from: { ...currentPos },
          to: { x: currentPos.x, y: currentPos.y, z: currentZDepth },
          layerId: layer.id,
          tool: layer.defaultTool,
        });
        totalCutDist += Math.abs(currentZDepth - currentPos.z);
        currentPos.z = currentZDepth;
        gcodeLines.push(`G01 Z${currentZDepth.toFixed(3)} F${options.plungeRate}`);

        // 3. Cut along polyline vertices
        for (let i = 1; i < poly.points.length; i++) {
          const pt = poly.points[i];
          const dist = Math.hypot(pt.x - currentPos.x, pt.y - currentPos.y);
          totalCutDist += dist;

          segments.push({
            type: 'feed',
            from: { ...currentPos },
            to: { x: pt.x, y: pt.y, z: currentZDepth },
            layerId: layer.id,
            tool: layer.defaultTool,
          });

          currentPos.x = pt.x;
          currentPos.y = pt.y;
          gcodeLines.push(`G01 X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)} F${options.feedRate}`);
        }

        // 4. Close the loop if closed polyline
        if (poly.closed && (currentPos.x !== firstPt.x || currentPos.y !== firstPt.y)) {
          const closeDist = Math.hypot(firstPt.x - currentPos.x, firstPt.y - currentPos.y);
          totalCutDist += closeDist;

          segments.push({
            type: 'feed',
            from: { ...currentPos },
            to: { x: firstPt.x, y: firstPt.y, z: currentZDepth },
            layerId: layer.id,
            tool: layer.defaultTool,
          });

          currentPos.x = firstPt.x;
          currentPos.y = firstPt.y;
          gcodeLines.push(`G01 X${firstPt.x.toFixed(3)} Y${firstPt.y.toFixed(3)} F${options.feedRate}`);
        }
      }

      // Retract back to Safe Z after polyline is completed
      segments.push({
        type: 'retract',
        from: { ...currentPos },
        to: { x: currentPos.x, y: currentPos.y, z: options.safeZ },
        layerId: layer.id,
        tool: layer.defaultTool,
      });
      currentPos.z = options.safeZ;
      gcodeLines.push(`G00 Z${options.safeZ.toFixed(2)}`);
    });
  });

  // G-Code Footer
  gcodeLines.push(
    ``,
    `; ====================================================`,
    `; PROGRAM END ROUTINE`,
    `; ====================================================`,
    `G00 Z${options.safeZ.toFixed(2)} ; Retract to safe Z`,
    `M05 ; Spindle OFF`,
    `G00 X0.000 Y0.000 ; Return to home X/Y`,
    `M30 ; Program End & Rewind`
  );

  const rapidSpeedMmMin = 5000; // Typical rapid speed
  const rapidTimeMin = totalRapidDist / rapidSpeedMmMin;
  const cutTimeMin = totalCutDist / options.feedRate;
  const estimatedTimeMin = Math.round((rapidTimeMin + cutTimeMin) * 10) / 10;

  const stats: ToolpathStats = {
    totalDistanceMm: Math.round(totalRapidDist + totalCutDist),
    rapidDistanceMm: Math.round(totalRapidDist),
    cutDistanceMm: Math.round(totalCutDist),
    estimatedTimeMin,
    totalGcodeLines: gcodeLines.length,
  };

  return {
    segments,
    gcode: gcodeLines.join('\n'),
    stats,
  };
}
