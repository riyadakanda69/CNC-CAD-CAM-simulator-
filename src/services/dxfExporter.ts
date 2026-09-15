/**
 * DXF Exporter
 * Generates industry-standard AutoCAD R2000 (AC1015) ASCII DXF files.
 * 100% compatible with Vectric VCarve Pro, Aspire, Cut2D, Fusion 360, Rhino, and AutoCAD.
 */

import { CADLayer, DoorParameters, VectorPolyline } from '../types/cnc';

export function exportToDXF(
  polylines: VectorPolyline[],
  layers: CADLayer[],
  params: DoorParameters,
  options?: {
    filterLayerId?: string;
    fileName?: string;
  }
): string {
  // Filter active polylines
  const activeLayers = new Map(layers.map((l) => [l.id, l]));
  const targetPolylines = polylines.filter((p) => {
    if (options?.filterLayerId) {
      return p.layerId === options.filterLayerId;
    }
    const l = activeLayers.get(p.layerId);
    return l ? l.visible : true;
  });

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  targetPolylines.forEach((p) => {
    p.points.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    });
  });

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = params.width;
    maxY = params.height;
  }

  let handleCount = 100;
  const nextHandle = () => (handleCount++).toString(16).toUpperCase();

  const lines: string[] = [];

  // 1. HEADER SECTION
  lines.push('  0', 'SECTION', '  2', 'HEADER');

  // AutoCAD 2000 format
  lines.push('  9', '$ACADVER', '  1', 'AC1015');
  // Units: 4 = Millimeters, 1 = Inches
  lines.push('  9', '$INSUNITS', ' 70', '4');
  lines.push('  9', '$MEASUREMENT', ' 70', '1'); // 1 = Metric
  lines.push('  9', '$EXTMIN', ' 10', minX.toFixed(4), ' 20', minY.toFixed(4), ' 30', '0.0000');
  lines.push('  9', '$EXTMAX', ' 10', maxX.toFixed(4), ' 20', maxY.toFixed(4), ' 30', '0.0000');
  lines.push('  9', '$LIMMIN', ' 10', '0.0000', ' 20', '0.0000');
  lines.push('  9', '$LIMMAX', ' 10', params.width.toFixed(4), ' 20', params.height.toFixed(4));
  lines.push('  0', 'ENDSEC');

  // 2. TABLES SECTION (LAYERS)
  lines.push('  0', 'SECTION', '  2', 'TABLES');

  // VPORT Table
  lines.push('  0', 'TABLE', '  2', 'VPORT', '  5', nextHandle(), '100', 'AcDbSymbolTable', ' 70', '1');
  lines.push('  0', 'VPORT', '  5', nextHandle(), '100', 'AcDbSymbolTableRecord', '100', 'AcDbViewportTableRecord', '  2', '*ACTIVE', ' 70', '0');
  lines.push(' 10', '0.0', ' 20', '0.0', ' 11', '1.0', ' 21', '1.0', ' 12', ((minX + maxX) / 2).toFixed(3), ' 22', ((minY + maxY).toFixed(3)));
  lines.push(' 40', (maxY - minY).toFixed(3), ' 41', ((maxX - minX) / (maxY - minY || 1)).toFixed(3));
  lines.push(' 68', '1', ' 69', '1');
  lines.push('  0', 'ENDTAB');

  // LAYER Table
  const exportLayers = options?.filterLayerId
    ? layers.filter((l) => l.id === options.filterLayerId)
    : layers;

  lines.push('  0', 'TABLE', '  2', 'LAYER', '  5', nextHandle(), '100', 'AcDbSymbolTable', ' 70', exportLayers.length.toString());

  exportLayers.forEach((layer) => {
    lines.push('  0', 'LAYER');
    lines.push('  5', nextHandle());
    lines.push('100', 'AcDbSymbolTableRecord');
    lines.push('100', 'AcDbLayerTableRecord');
    lines.push('  2', layer.vcarveName); // Name read by VCarve
    lines.push(' 70', '0'); // Flags (0 = active/normal)
    lines.push(' 62', layer.dxfColor.toString()); // AutoCAD ACI Color
    lines.push('  6', 'CONTINUOUS'); // Line type
  });

  lines.push('  0', 'ENDTAB');

  // LTYPE Table
  lines.push('  0', 'TABLE', '  2', 'LTYPE', '  5', nextHandle(), '100', 'AcDbSymbolTable', ' 70', '1');
  lines.push('  0', 'LTYPE', '  5', nextHandle(), '100', 'AcDbSymbolTableRecord', '100', 'AcDbLinetypeTableRecord', '  2', 'CONTINUOUS', ' 70', '0', '  3', 'Solid line', ' 72', '65', ' 73', '0', ' 40', '0.0');
  lines.push('  0', 'ENDTAB');

  lines.push('  0', 'ENDSEC');

  // 3. BLOCKS SECTION (EMPTY STANDARD)
  lines.push('  0', 'SECTION', '  2', 'BLOCKS');
  lines.push('  0', 'ENDSEC');

  // 4. ENTITIES SECTION (LWPOLYLINES)
  lines.push('  0', 'SECTION', '  2', 'ENTITIES');

  targetPolylines.forEach((poly) => {
    const layer = activeLayers.get(poly.layerId);
    const layerName = layer?.vcarveName || '01_DEFAULT';
    const colorCode = layer?.dxfColor ?? 7;

    lines.push('  0', 'LWPOLYLINE');
    lines.push('  5', nextHandle());
    lines.push('100', 'AcDbEntity');
    lines.push('  8', layerName);
    lines.push(' 62', colorCode.toString());
    lines.push('100', 'AcDbPolyline');
    lines.push(' 90', poly.points.length.toString()); // Number of vertices
    lines.push(' 70', poly.closed ? '1' : '0'); // Closed = 1, Open = 0
    lines.push(' 43', '0.0'); // Constant width

    // Vertices
    poly.points.forEach((pt) => {
      lines.push(' 10', pt.x.toFixed(4));
      lines.push(' 20', pt.y.toFixed(4));
    });
  });

  lines.push('  0', 'ENDSEC');

  // 5. OBJECTS SECTION
  lines.push('  0', 'SECTION', '  2', 'OBJECTS');
  lines.push('  0', 'DICTIONARY', '  5', nextHandle(), '100', 'AcDbDictionary', '280', '0', '281', '1');
  lines.push('  0', 'ENDSEC');

  // End of DXF file
  lines.push('  0', 'EOF', '');

  return lines.join('\n');
}

/**
 * Export to Clean Scalable Vector Graphics (SVG)
 * With millimeters unit preservation and colored vector layers.
 */
export function exportToSVG(
  polylines: VectorPolyline[],
  layers: CADLayer[],
  params: DoorParameters
): string {
  const activeLayers = new Map(layers.map((l) => [l.id, l]));
  const margin = 20;
  const viewBoxWidth = params.width + margin * 2;
  const viewBoxHeight = params.height + margin * 2;

  let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}mm" height="${params.height}mm" viewBox="-${margin} -${margin} ${viewBoxWidth} ${viewBoxHeight}">
  <title>2.5D Carved Panel Door CAD Master</title>
  <desc>Compatible with VCarve Pro, Aspire, CNC Routers</desc>
  <style>
    .cad-bg { fill: #fcfbf9; }
    .cad-grid { stroke: #e5e7eb; stroke-width: 0.5; }
  </style>
  <rect class="cad-bg" x="-${margin}" y="-${margin}" width="${viewBoxWidth}" height="${viewBoxHeight}" />
`;

  // Group by layer
  layers.forEach((layer) => {
    if (!layer.visible) return;
    const layerPolys = polylines.filter((p) => p.layerId === layer.id);
    if (layerPolys.length === 0) return;

    svg += `  <g id="${layer.vcarveName}" stroke="${layer.color}" stroke-width="1" fill="none" opacity="0.95">\n`;

    layerPolys.forEach((poly) => {
      if (poly.points.length < 2) return;
      // Invert Y for standard SVG coords (0,0 top-left vs CAD 0,0 bottom-left)
      const d = poly.points
        .map((pt, i) => {
          const svgY = params.height - pt.y;
          return `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${svgY.toFixed(2)}`;
        })
        .join(' ');

      const closeCmd = poly.closed ? ' Z' : '';
      svg += `    <path d="${d}${closeCmd}" data-name="${poly.name || ''}" />\n`;
    });

    svg += `  </g>\n`;
  });

  svg += `</svg>`;
  return svg;
}

/**
 * Triggers browser download for any text or blob file
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
