/**
 * Door Geometry Engine
 * Generates exact 2.5D CAD vector geometry matching the carved neoclassical floral door reference.
 * Produces clean, closed polylines properly segregated into VCarve CAM layers.
 */

import { CADLayer, DoorParameters, Point2D, VectorPolyline } from '../types/cnc';

// Default layers configured for VCarve Pro & 3-Axis CNC
export const DEFAULT_CAD_LAYERS: CADLayer[] = [
  {
    id: '01_DOOR_OUTLINE',
    name: '01 Door Outline (Cutout)',
    vcarveName: '01_DOOR_OUTLINE',
    color: '#ef4444', // Red
    dxfColor: 1, // Red
    visible: true,
    locked: false,
    description: 'Perimeter cutout with 1/2" or 6mm Endmill (Outside profile with holding tabs)',
    defaultTool: 'profile',
    targetDepth: 40,
    toolpathStrategy: 'profile_outside',
  },
  {
    id: '02_TOP_ARCH_FRAME',
    name: '02 Arch Molding Frame',
    vcarveName: '02_TOP_ARCH_FRAME',
    color: '#f97316', // Orange
    dxfColor: 30, // Orange
    visible: true,
    locked: false,
    description: 'Stepped arch top outer molding (Ogee/Cove or 90° V-Bit profile along vector)',
    defaultTool: 'vbit',
    targetDepth: 6,
    toolpathStrategy: 'profile_inside',
  },
  {
    id: '03_CROWN_CREST_RELIEF',
    name: '03 Crown Crest Carving',
    vcarveName: '03_CROWN_CREST',
    color: '#eab308', // Yellow
    dxfColor: 2, // Yellow
    visible: true,
    locked: false,
    description: 'Tympanum pediment crest: palmette, twin volutes & side rosette sprays (V-Carve / Ballnose)',
    defaultTool: 'vbit',
    targetDepth: 8,
    toolpathStrategy: 'vcarve',
  },
  {
    id: '04_COFFERED_GRID_GROOVES',
    name: '04 Coffered Grid Grooves',
    vcarveName: '04_COFFERED_GROOVES',
    color: '#06b6d4', // Cyan
    dxfColor: 4, // Cyan
    visible: true,
    locked: false,
    description: 'Recessed channel grooves between raised panels (Core Box or 90° V-Groove bit)',
    defaultTool: 'endmill',
    targetDepth: 8,
    toolpathStrategy: 'pocket',
  },
  {
    id: '05_COFFERED_PANEL_ISLANDS',
    name: '05 Coffered Panel Faces',
    vcarveName: '05_PANEL_ISLANDS',
    color: '#3b82f6', // Blue
    dxfColor: 5, // Blue
    visible: true,
    locked: false,
    description: 'Raised rectangular panel faces (Pocket boundary or Bevel chamfer profile)',
    defaultTool: 'vbit',
    targetDepth: 4,
    toolpathStrategy: 'profile_outside',
  },
  {
    id: '06_ROSETTES_CARVING',
    name: '06 Rosettes (Center Panels)',
    vcarveName: '06_ROSETTES',
    color: '#a855f7', // Purple
    dxfColor: 6, // Magenta
    visible: true,
    locked: false,
    description: 'Carved 4-petal floral rosettes in 4th panel left & right (V-Carve 60°)',
    defaultTool: 'vbit',
    targetDepth: 6,
    toolpathStrategy: 'vcarve',
  },
  {
    id: '07_CENTER_PANEL_BORDER',
    name: '07 Center Field Pocket',
    vcarveName: '07_CENTER_POCKET',
    color: '#10b981', // Emerald
    dxfColor: 3, // Green
    visible: true,
    locked: false,
    description: 'Inner vertical frame and pocket background clearance around vine relief (Endmill)',
    defaultTool: 'endmill',
    targetDepth: 10,
    toolpathStrategy: 'pocket',
  },
  {
    id: '08_FLORAL_VINE_RELIEF',
    name: '08 Floral Vine 2.5D Relief',
    vcarveName: '08_FLORAL_VINE_RELIEF',
    color: '#14b8a6', // Teal
    dxfColor: 130, // Light Green
    visible: true,
    locked: false,
    description: 'Sunflowers, graceful S-vine, volute curls & acanthus leaf boundaries (V-Carve / Ballnose)',
    defaultTool: 'ballnose',
    targetDepth: 10,
    toolpathStrategy: '3d_finish',
  },
  {
    id: '09_FLORAL_VEIN_DETAILS',
    name: '09 Flower & Leaf Vein Engrave',
    vcarveName: '09_VEIN_ENGRAVE',
    color: '#ec4899', // Pink
    dxfColor: 220, // Pink
    visible: true,
    locked: false,
    description: 'Centerline leaf veining and sunflower cross-hatched seed disc textures (Quick Engrave / V-Bit)',
    defaultTool: 'vbit',
    targetDepth: 2.5,
    toolpathStrategy: 'engrave',
  },
  {
    id: '10_MORTISE_HANDLE_REF',
    name: '10 Hardware & Handle Guide',
    vcarveName: '10_HARDWARE_REF',
    color: '#64748b', // Slate
    dxfColor: 8, // Dark Gray
    visible: true,
    locked: false,
    description: 'Mortise lock, escutcheon plate & lever handle mounting location reference',
    defaultTool: 'profile',
    targetDepth: 2,
    toolpathStrategy: 'engrave',
  },
];

// Helper: Bezier curve sampling
function sampleCubicBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  samples = 16
): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    points.push({
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    });
  }
  return points;
}

// Helper: Circle / Ellipse polyline generator
function generateEllipsePolyline(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg = 0,
  segments = 32
): Point2D[] {
  const pts: Point2D[] = [];
  const rotRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const ex = rx * Math.cos(theta);
    const ey = ry * Math.sin(theta);
    pts.push({
      x: cx + (ex * cosR - ey * sinR),
      y: cy + (ex * sinR + ey * cosR),
    });
  }
  return pts;
}

// Helper: Petal generator (closed teardrop/petal contour)
function generatePetalContour(
  cx: number,
  cy: number,
  length: number,
  width: number,
  angleDeg: number
): Point2D[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localPts: Point2D[] = [
    { x: 0, y: 0 },
    { x: -width * 0.35, y: length * 0.3 },
    { x: -width * 0.5, y: length * 0.65 },
    { x: -width * 0.25, y: length * 0.92 },
    { x: 0, y: length }, // Tip
    { x: width * 0.25, y: length * 0.92 },
    { x: width * 0.5, y: length * 0.65 },
    { x: width * 0.35, y: length * 0.3 },
  ];

  return localPts.map((pt) => ({
    x: cx + (pt.x * cos - pt.y * sin),
    y: cy + (pt.x * sin + pt.y * cos),
  }));
}

// Helper: Acanthus leaf lobe contour generator
function generateAcanthusLeaf(
  baseX: number,
  baseY: number,
  length: number,
  width: number,
  angleDeg: number,
  curvature = 0
): { contour: Point2D[]; vein: Point2D[] } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Left lobe scallops
  const p0 = { x: 0, y: 0 };
  const p1 = { x: -width * 0.45, y: length * 0.25 };
  const p2 = { x: -width * 0.6 + curvature * 10, y: length * 0.55 };
  const p3 = { x: -width * 0.35, y: length * 0.8 };
  const tip = { x: curvature * 12, y: length };
  const p5 = { x: width * 0.35, y: length * 0.8 };
  const p6 = { x: width * 0.6 + curvature * 10, y: length * 0.55 };
  const p7 = { x: width * 0.45, y: length * 0.25 };

  const leftEdge = sampleCubicBezier(p0, p1, p2, p3, 8);
  const leftToTip = sampleCubicBezier(p3, { x: -width * 0.15, y: length * 0.9 }, tip, tip, 6);
  const tipToRight = sampleCubicBezier(tip, tip, { x: width * 0.15, y: length * 0.9 }, p5, 6);
  const rightEdge = sampleCubicBezier(p5, p6, p7, p0, 8);

  const rawContour = [...leftEdge, ...leftToTip, ...tipToRight, ...rightEdge];

  // Rotate & translate contour
  const contour = rawContour.map((pt) => ({
    x: baseX + (pt.x * cos - pt.y * sin),
    y: baseY + (pt.x * sin + pt.y * cos),
  }));

  // Central vein
  const rawVein = sampleCubicBezier(
    { x: 0, y: 0 },
    { x: curvature * 4, y: length * 0.35 },
    { x: curvature * 8, y: length * 0.7 },
    tip,
    10
  );
  const vein = rawVein.map((pt) => ({
    x: baseX + (pt.x * cos - pt.y * sin),
    y: baseY + (pt.x * sin + pt.y * cos),
  }));

  return { contour, vein };
}

/**
 * Main Door Geometry Generator
 */
export function generateDoorGeometry(params: DoorParameters): VectorPolyline[] {
  const polylines: VectorPolyline[] = [];

  // Coordinate offset based on origin
  let xOffset = 0;
  let yOffset = 0;
  if (params.originPosition === 'center') {
    xOffset = -params.width / 2;
    yOffset = -params.height / 2;
  } else if (params.originPosition === 'top_left') {
    xOffset = 0;
    yOffset = -params.height;
  }

  const transformPoint = (x: number, y: number): Point2D => ({
    x: Math.round((x + xOffset) * 1000) / 1000,
    y: Math.round((y + yOffset) * 1000) / 1000,
  });

  const transformPts = (pts: Point2D[]): Point2D[] =>
    pts.map((p) => transformPoint(p.x, p.y));

  // 1. LAYER 01: DOOR OUTLINE (Perimeter rectangle)
  polylines.push({
    id: 'outline_main',
    layerId: '01_DOOR_OUTLINE',
    name: 'Door Perimeter Cutout',
    closed: true,
    depth: params.thickness,
    toolType: 'profile',
    points: transformPts([
      { x: 0, y: 0 },
      { x: params.width, y: 0 },
      { x: params.width, y: params.height },
      { x: 0, y: params.height },
    ]),
  });

  // Calculate inner panel margins
  const frameLeft = params.stileWidth;
  const frameRight = params.width - params.stileWidth;
  const frameBottom = params.bottomRailHeight;
  const frameTopFlat = params.height - params.topRailHeight;
  const frameCenterX = params.width / 2;
  const archRise = params.archRise;
  const archApexY = frameTopFlat + archRise;

  // 2. LAYER 02: TOP ARCH MOLDING & STEPPED FRAME
  // Construct Segmental Arch curve
  const steps = [
    { offset: 0, id: 'arch_outer' },
    { offset: 18, id: 'arch_step1' },
    { offset: 34, id: 'arch_step2' },
  ];

  steps.forEach((step) => {
    const leftX = frameLeft + step.offset;
    const rightX = frameRight - step.offset;
    const bottomY = frameBottom + step.offset;
    const shoulderY = frameTopFlat - step.offset * 0.7;
    const apexY = archApexY - step.offset;

    // Corner radius for arch shoulder transition
    const shoulderCurveLeft = sampleCubicBezier(
      { x: leftX, y: shoulderY - 60 },
      { x: leftX, y: shoulderY + 20 },
      { x: leftX + 40, y: shoulderY + 60 },
      { x: leftX + 90, y: shoulderY + 75 },
      10
    );

    // Arch top crown curve left to apex
    const archTopLeft = sampleCubicBezier(
      { x: leftX + 90, y: shoulderY + 75 },
      { x: frameCenterX - 80, y: apexY },
      { x: frameCenterX - 30, y: apexY },
      { x: frameCenterX, y: apexY },
      14
    );

    // Arch top crown curve apex to right
    const archTopRight = sampleCubicBezier(
      { x: frameCenterX, y: apexY },
      { x: frameCenterX + 30, y: apexY },
      { x: frameCenterX + 80, y: apexY },
      { x: rightX - 90, y: shoulderY + 75 },
      14
    );

    // Right shoulder curve
    const shoulderCurveRight = sampleCubicBezier(
      { x: rightX - 90, y: shoulderY + 75 },
      { x: rightX - 40, y: shoulderY + 60 },
      { x: rightX, y: shoulderY + 20 },
      { x: rightX, y: shoulderY - 60 },
      10
    );

    const fullArchPts: Point2D[] = [
      { x: leftX, y: bottomY },
      ...shoulderCurveLeft,
      ...archTopLeft.slice(1),
      ...archTopRight.slice(1),
      ...shoulderCurveRight.slice(1),
      { x: rightX, y: bottomY },
    ];

    polylines.push({
      id: `${step.id}_profile`,
      layerId: '02_TOP_ARCH_FRAME',
      name: `Arch Molding Step ${step.offset}mm`,
      closed: true,
      depth: 6,
      toolType: 'vbit',
      points: transformPts(fullArchPts),
    });
  });

  // 3. LAYER 03: BAROQUE CROWN CREST (Arch Tympanum Pediment Carving)
  const crestCenterY = archApexY - 45;

  // Central Palmette / Fan crest
  const palmetteFanPts: Point2D[] = [];
  const fanPetalAngles = [-50, -35, -20, -7, 7, 20, 35, 50];
  fanPetalAngles.forEach((angle, idx) => {
    const len = 42 - Math.abs(angle) * 0.35;
    const pts = generatePetalContour(frameCenterX, crestCenterY - 10, len, 14, angle);
    polylines.push({
      id: `crest_fan_petal_${idx}`,
      layerId: '03_CROWN_CREST_RELIEF',
      name: `Crest Palmette Petal ${idx + 1}`,
      closed: true,
      depth: 8,
      toolType: 'vbit',
      points: transformPts(pts),
    });
  });

  // Central crest bottom button rosette
  polylines.push({
    id: 'crest_center_button',
    layerId: '03_CROWN_CREST_RELIEF',
    name: 'Crest Center Rosette Button',
    closed: true,
    depth: 7,
    toolType: 'ballnose',
    points: transformPts(generateEllipsePolyline(frameCenterX, crestCenterY - 14, 16, 16, 0, 24)),
  });

  // Mirrored C-Scroll Volutes (Left & Right)
  [-1, 1].forEach((side) => {
    const sideName = side === -1 ? 'left' : 'right';

    // Main Volute Scroll
    const v0 = { x: frameCenterX + side * 12, y: crestCenterY - 14 };
    const v1 = { x: frameCenterX + side * 45, y: crestCenterY - 6 };
    const v2 = { x: frameCenterX + side * 70, y: crestCenterY + 18 };
    const v3 = { x: frameCenterX + side * 40, y: crestCenterY + 34 };
    const v4 = { x: frameCenterX + side * 22, y: crestCenterY + 16 };
    const voluteOuter = sampleCubicBezier(v0, v1, v2, v3, 12);
    const voluteInner = sampleCubicBezier(v3, v4, { x: frameCenterX + side * 16, y: crestCenterY - 4 }, v0, 10);

    polylines.push({
      id: `crest_volute_${sideName}`,
      layerId: '03_CROWN_CREST_RELIEF',
      name: `Crest Volute Scroll ${sideName}`,
      closed: true,
      depth: 8,
      toolType: 'vbit',
      points: transformPts([...voluteOuter, ...voluteInner]),
    });

    // Three side button florets & horizontal acanthus sprays
    const rosetteDistances = [75, 125, 175];
    rosetteDistances.forEach((dist, rIdx) => {
      const btnX = frameCenterX + side * dist;
      const btnY = crestCenterY - 8 - rIdx * 5;

      // Rosette button outer
      polylines.push({
        id: `crest_floret_${sideName}_${rIdx}`,
        layerId: '03_CROWN_CREST_RELIEF',
        name: `Crest Floret ${sideName} ${rIdx + 1}`,
        closed: true,
        depth: 6,
        toolType: 'ballnose',
        points: transformPts(generateEllipsePolyline(btnX, btnY, 11, 11, 0, 20)),
      });

      // Acanthus horizontal leaf spray connecting to arch shoulder
      const leafData = generateAcanthusLeaf(
        btnX + side * 12,
        btnY,
        38 - rIdx * 4,
        14,
        side === -1 ? -100 + rIdx * 5 : 100 - rIdx * 5,
        side * 0.2
      );

      polylines.push({
        id: `crest_leaf_${sideName}_${rIdx}`,
        layerId: '03_CROWN_CREST_RELIEF',
        name: `Crest Leaf Spray ${sideName} ${rIdx + 1}`,
        closed: true,
        depth: 7,
        toolType: 'vbit',
        points: transformPts(leafData.contour),
      });

      // Vein detail
      polylines.push({
        id: `crest_leaf_vein_${sideName}_${rIdx}`,
        layerId: '09_FLORAL_VEIN_DETAILS',
        name: `Crest Leaf Vein ${sideName} ${rIdx + 1}`,
        closed: false,
        depth: 2.5,
        toolType: 'vbit',
        points: transformPts(leafData.vein),
      });
    });
  });

  // 4. MAIN INNER FIELD DIMENSIONS
  // Central column for the tall floral vine
  const centerColWidth = params.centerPanelWidth;
  const centerLeftX = frameCenterX - centerColWidth / 2;
  const centerRightX = frameCenterX + centerColWidth / 2;

  // Coffered panels on left and right columns
  const cofferedInnerBottom = frameBottom + 55;
  const cofferedInnerTop = frameTopFlat - 60;
  const cofferedTotalHeight = cofferedInnerTop - cofferedInnerBottom;
  const rowCount = params.cofferedGridRows; // 7 rows
  const rowPitch = cofferedTotalHeight / rowCount;
  const grooveW = params.grooveWidth;
  const panelMargin = grooveW / 2;

  // Left column width
  const leftColInnerLeft = frameLeft + 45;
  const leftColInnerRight = centerLeftX - 25;
  const leftColWidth = leftColInnerRight - leftColInnerLeft;

  // Right column width
  const rightColInnerLeft = centerRightX + 25;
  const rightColInnerRight = frameRight - 45;
  const rightColWidth = rightColInnerRight - rightColInnerLeft;

  // 5. LAYER 04 & 05: COFFERED GRID PANELS (LEFT & RIGHT)
  const columns = [
    { side: 'left', x1: leftColInnerLeft, x2: leftColInnerRight, width: leftColWidth },
    { side: 'right', x1: rightColInnerLeft, x2: rightColInnerRight, width: rightColWidth },
  ];

  columns.forEach((col) => {
    for (let r = 0; r < rowCount; r++) {
      const panelY1 = cofferedInnerBottom + r * rowPitch + panelMargin;
      const panelY2 = cofferedInnerBottom + (r + 1) * rowPitch - panelMargin;
      const panelX1 = col.x1 + panelMargin;
      const panelX2 = col.x2 - panelMargin;

      // Outer groove boundary (Pocket channel)
      polylines.push({
        id: `coffered_groove_${col.side}_${r}`,
        layerId: '04_COFFERED_GRID_GROOVES',
        name: `Coffered Groove ${col.side} Row ${r + 1}`,
        closed: true,
        depth: params.grooveDepth,
        toolType: 'endmill',
        points: transformPts([
          { x: col.x1, y: cofferedInnerBottom + r * rowPitch },
          { x: col.x2, y: cofferedInnerBottom + r * rowPitch },
          { x: col.x2, y: cofferedInnerBottom + (r + 1) * rowPitch },
          { x: col.x1, y: cofferedInnerBottom + (r + 1) * rowPitch },
        ]),
      });

      // Raised island face (Bevel / chamfer profile)
      polylines.push({
        id: `coffered_island_${col.side}_${r}`,
        layerId: '05_COFFERED_PANEL_ISLANDS',
        name: `Coffered Panel Face ${col.side} Row ${r + 1}`,
        closed: true,
        depth: 4,
        toolType: 'vbit',
        points: transformPts([
          { x: panelX1, y: panelY1 },
          { x: panelX2, y: panelY1 },
          { x: panelX2, y: panelY2 },
          { x: panelX1, y: panelY2 },
        ]),
      });

      // In the 4th panel from top (r = 3 in 0-indexed or middle row):
      // The authentic photo features a CARVED FLORAL ROSETTE in panel #4 on BOTH sides!
      if (r === 3) {
        const rosetteCx = (panelX1 + panelX2) / 2;
        const rosetteCy = (panelY1 + panelY2) / 2;
        const rosetteR = Math.min(panelX2 - panelX1, panelY2 - panelY1) * 0.38;

        // Inner rosette border square
        const sqInset = rosetteR * 1.1;
        polylines.push({
          id: `rosette_border_${col.side}`,
          layerId: '06_ROSETTES_CARVING',
          name: `Rosette Inner Border ${col.side}`,
          closed: true,
          depth: 5,
          toolType: 'vbit',
          points: transformPts([
            { x: rosetteCx - sqInset, y: rosetteCy - sqInset },
            { x: rosetteCx + sqInset, y: rosetteCy - sqInset },
            { x: rosetteCx + sqInset, y: rosetteCy + sqInset },
            { x: rosetteCx - sqInset, y: rosetteCy + sqInset },
          ]),
        });

        // 4 Main Rounded Petals
        const petalAngles = [0, 90, 180, 270];
        petalAngles.forEach((pAngle, pIdx) => {
          const petal = generatePetalContour(rosetteCx, rosetteCy, rosetteR * 0.9, rosetteR * 0.7, pAngle);
          polylines.push({
            id: `rosette_petal_${col.side}_${pIdx}`,
            layerId: '06_ROSETTES_CARVING',
            name: `Rosette Petal ${col.side} ${pIdx + 1}`,
            closed: true,
            depth: 7,
            toolType: 'vbit',
            points: transformPts(petal),
          });
        });

        // 4 Corner Spandrels / Sub-petals
        const subAngles = [45, 135, 225, 315];
        subAngles.forEach((sAngle, sIdx) => {
          const subPetal = generatePetalContour(rosetteCx, rosetteCy, rosetteR * 0.65, rosetteR * 0.45, sAngle);
          polylines.push({
            id: `rosette_subpetal_${col.side}_${sIdx}`,
            layerId: '06_ROSETTES_CARVING',
            name: `Rosette Corner Petal ${col.side} ${sIdx + 1}`,
            closed: true,
            depth: 6,
            toolType: 'vbit',
            points: transformPts(subPetal),
          });
        });

        // Central Pistil Beaded Button
        polylines.push({
          id: `rosette_center_${col.side}`,
          layerId: '06_ROSETTES_CARVING',
          name: `Rosette Center Button ${col.side}`,
          closed: true,
          depth: 7,
          toolType: 'ballnose',
          points: transformPts(generateEllipsePolyline(rosetteCx, rosetteCy, rosetteR * 0.32, rosetteR * 0.32, 0, 24)),
        });

        // Pistil Crosshatch Veins
        polylines.push({
          id: `rosette_cross1_${col.side}`,
          layerId: '09_FLORAL_VEIN_DETAILS',
          name: `Rosette Crosshatch H ${col.side}`,
          closed: false,
          depth: 2,
          toolType: 'vbit',
          points: transformPts([
            { x: rosetteCx - rosetteR * 0.28, y: rosetteCy },
            { x: rosetteCx + rosetteR * 0.28, y: rosetteCy },
          ]),
        });
        polylines.push({
          id: `rosette_cross2_${col.side}`,
          layerId: '09_FLORAL_VEIN_DETAILS',
          name: `Rosette Crosshatch V ${col.side}`,
          closed: false,
          depth: 2,
          toolType: 'vbit',
          points: transformPts([
            { x: rosetteCx, y: rosetteCy - rosetteR * 0.28 },
            { x: rosetteCx, y: rosetteCy + rosetteR * 0.28 },
          ]),
        });
      }
    }
  });

  // 6. BOTTOM ROW COFFERED PANELS (3 Panels spanning the base)
  const bottomRowY1 = frameBottom + 12;
  const bottomRowY2 = cofferedInnerBottom - 12;
  const bottomWidth = rightColInnerRight - leftColInnerLeft;
  const bottomColW = bottomWidth / 3;

  for (let b = 0; b < 3; b++) {
    const bx1 = leftColInnerLeft + b * bottomColW + panelMargin;
    const bx2 = leftColInnerLeft + (b + 1) * bottomColW - panelMargin;
    const by1 = bottomRowY1 + panelMargin;
    const by2 = bottomRowY2 - panelMargin;

    // Bottom Groove
    polylines.push({
      id: `bottom_groove_${b}`,
      layerId: '04_COFFERED_GRID_GROOVES',
      name: `Bottom Row Groove ${b + 1}`,
      closed: true,
      depth: params.grooveDepth,
      toolType: 'endmill',
      points: transformPts([
        { x: leftColInnerLeft + b * bottomColW, y: bottomRowY1 },
        { x: leftColInnerLeft + (b + 1) * bottomColW, y: bottomRowY1 },
        { x: leftColInnerLeft + (b + 1) * bottomColW, y: bottomRowY2 },
        { x: leftColInnerLeft + b * bottomColW, y: bottomRowY2 },
      ]),
    });

    // Bottom Island
    polylines.push({
      id: `bottom_island_${b}`,
      layerId: '05_COFFERED_PANEL_ISLANDS',
      name: `Bottom Row Island Face ${b + 1}`,
      closed: true,
      depth: 4,
      toolType: 'vbit',
      points: transformPts([
        { x: bx1, y: by1 },
        { x: bx2, y: by1 },
        { x: bx2, y: by2 },
        { x: bx1, y: by2 },
      ]),
    });
  }

  // 7. LAYER 07: CENTRAL VERTICAL RECESSED PANEL
  const centerPanelBottom = cofferedInnerBottom;
  const centerPanelTop = cofferedInnerTop;

  // Outer framed bead molding of center panel
  polylines.push({
    id: 'center_panel_frame_outer',
    layerId: '07_CENTER_PANEL_BORDER',
    name: 'Center Panel Outer Bead Frame',
    closed: true,
    depth: 4,
    toolType: 'vbit',
    points: transformPts([
      { x: centerLeftX - 12, y: centerPanelBottom },
      { x: centerRightX + 12, y: centerPanelBottom },
      { x: centerRightX + 12, y: centerPanelTop },
      { x: centerLeftX - 12, y: centerPanelTop },
    ]),
  });

  // Inner recessed floor perimeter (Clearance pocket around relief)
  polylines.push({
    id: 'center_panel_pocket_boundary',
    layerId: '07_CENTER_PANEL_BORDER',
    name: 'Center Pocket Boundary Floor',
    closed: true,
    depth: params.reliefDepth,
    toolType: 'endmill',
    points: transformPts([
      { x: centerLeftX, y: centerPanelBottom + 8 },
      { x: centerRightX, y: centerPanelBottom + 8 },
      { x: centerRightX, y: centerPanelTop - 8 },
      { x: centerLeftX, y: centerPanelTop - 8 },
    ]),
  });

  // 8. LAYER 08 & 09: THE MASTER CENTRAL FLORAL VINE & SUNFLOWERS (2.5D RELIEF)
  // This is the core artistic feature of the door!
  // It features:
  // A. Upper Sunflower (Radial daisy/sunflower with 16 petals and cross-hatched seed disc)
  // B. Top C-scroll stem curving downward
  // C. Graceful main stem with natural organic taper
  // D. Acanthus foliage with trifoliate lobes and veining
  // E. Lower Sunflower (angled blooming sunflower)
  // F. Bottom Arabesque flourish and anchoring leaves

  const centerHeight = centerPanelTop - centerPanelBottom;

  // A. UPPER SUNFLOWER
  const sunTopX = frameCenterX;
  const sunTopY = centerPanelTop - centerHeight * 0.12;
  const sunTopRadius = centerColWidth * 0.28;
  const sunDiscRadius = sunTopRadius * 0.44;

  // Sunflower Center Seed Disc (Ballnose dome)
  polylines.push({
    id: 'sunflower_top_disc',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Upper Sunflower Seed Disc',
    closed: true,
    depth: params.reliefDepth,
    toolType: 'ballnose',
    points: transformPts(generateEllipsePolyline(sunTopX, sunTopY, sunDiscRadius, sunDiscRadius, 0, 32)),
  });

  // Sunflower Seed Disc Cross-hatching (Engrave layer)
  const discGridSpacing = sunDiscRadius / 2.8;
  for (let i = -2; i <= 2; i++) {
    const offset = i * discGridSpacing;
    const halfChord = Math.sqrt(Math.max(0, sunDiscRadius * sunDiscRadius - offset * offset));
    // 45° grid line
    polylines.push({
      id: `sunflower_disc_grid_a_${i}`,
      layerId: '09_FLORAL_VEIN_DETAILS',
      name: `Sunflower Seed Grid A ${i}`,
      closed: false,
      depth: 2,
      toolType: 'vbit',
      points: transformPts([
        { x: sunTopX + offset - halfChord * 0.7, y: sunTopY + offset - halfChord * 0.7 },
        { x: sunTopX + offset + halfChord * 0.7, y: sunTopY + offset + halfChord * 0.7 },
      ]),
    });
    // -45° grid line
    polylines.push({
      id: `sunflower_disc_grid_b_${i}`,
      layerId: '09_FLORAL_VEIN_DETAILS',
      name: `Sunflower Seed Grid B ${i}`,
      closed: false,
      depth: 2,
      toolType: 'vbit',
      points: transformPts([
        { x: sunTopX + offset - halfChord * 0.7, y: sunTopY - offset + halfChord * 0.7 },
        { x: sunTopX + offset + halfChord * 0.7, y: sunTopY - offset - halfChord * 0.7 },
      ]),
    });
  }

  // Sunflower Petals (16 radiating rounded petals)
  const petalCount = 16;
  for (let p = 0; p < petalCount; p++) {
    const angle = (p / petalCount) * 360;
    const petalPts = generatePetalContour(
      sunTopX,
      sunTopY,
      sunTopRadius,
      sunTopRadius * 0.32,
      angle
    );
    polylines.push({
      id: `sunflower_top_petal_${p}`,
      layerId: '08_FLORAL_VINE_RELIEF',
      name: `Upper Sunflower Petal ${p + 1}`,
      closed: true,
      depth: params.reliefDepth * 0.85,
      toolType: 'vbit',
      points: transformPts(petalPts),
    });

    // Petal center crease vein
    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    polylines.push({
      id: `sunflower_top_petal_vein_${p}`,
      layerId: '09_FLORAL_VEIN_DETAILS',
      name: `Upper Petal Crease ${p + 1}`,
      closed: false,
      depth: 2,
      toolType: 'vbit',
      points: transformPts([
        { x: sunTopX + sunDiscRadius * 0.9 * (-sinA), y: sunTopY + sunDiscRadius * 0.9 * cosA },
        { x: sunTopX + sunTopRadius * 0.9 * (-sinA), y: sunTopY + sunTopRadius * 0.9 * cosA },
      ]),
    });
  }

  // B. MAIN FLOWING S-CURVE VINE STEM
  // Left Edge of Stem (Thick organic vine tapering downward)
  const stemLeftCtrl: [Point2D, Point2D, Point2D, Point2D][] = [
    // Top curl under sunflower
    [
      { x: sunTopX - 12, y: sunTopY - sunTopRadius - 5 },
      { x: sunTopX - 75, y: sunTopY - sunTopRadius - 40 },
      { x: sunTopX - 90, y: centerPanelBottom + centerHeight * 0.65 },
      { x: sunTopX - 25, y: centerPanelBottom + centerHeight * 0.52 },
    ],
    // Middle S-curve crossing to right
    [
      { x: sunTopX - 25, y: centerPanelBottom + centerHeight * 0.52 },
      { x: sunTopX + 50, y: centerPanelBottom + centerHeight * 0.42 },
      { x: sunTopX + 75, y: centerPanelBottom + centerHeight * 0.35 },
      { x: sunTopX + 20, y: centerPanelBottom + centerHeight * 0.22 },
    ],
    // Bottom sweep into base
    [
      { x: sunTopX + 20, y: centerPanelBottom + centerHeight * 0.22 },
      { x: sunTopX - 45, y: centerPanelBottom + centerHeight * 0.14 },
      { x: sunTopX - 60, y: centerPanelBottom + centerHeight * 0.08 },
      { x: sunTopX + 5, y: centerPanelBottom + 35 },
    ],
  ];

  // Right Edge of Stem (offset by organic thickness)
  const stemRightCtrl: [Point2D, Point2D, Point2D, Point2D][] = [
    [
      { x: sunTopX + 12, y: sunTopY - sunTopRadius - 5 },
      { x: sunTopX - 55, y: sunTopY - sunTopRadius - 40 },
      { x: sunTopX - 70, y: centerPanelBottom + centerHeight * 0.65 },
      { x: sunTopX - 8, y: centerPanelBottom + centerHeight * 0.52 },
    ],
    [
      { x: sunTopX - 8, y: centerPanelBottom + centerHeight * 0.52 },
      { x: sunTopX + 68, y: centerPanelBottom + centerHeight * 0.42 },
      { x: sunTopX + 90, y: centerPanelBottom + centerHeight * 0.35 },
      { x: sunTopX + 36, y: centerPanelBottom + centerHeight * 0.22 },
    ],
    [
      { x: sunTopX + 36, y: centerPanelBottom + centerHeight * 0.22 },
      { x: sunTopX - 30, y: centerPanelBottom + centerHeight * 0.14 },
      { x: sunTopX - 45, y: centerPanelBottom + centerHeight * 0.08 },
      { x: sunTopX + 18, y: centerPanelBottom + 35 },
    ],
  ];

  const leftStemPts = stemLeftCtrl.flatMap((seg) => sampleCubicBezier(...seg, 16));
  const rightStemPts = stemRightCtrl.flatMap((seg) => sampleCubicBezier(...seg, 16)).reverse();

  polylines.push({
    id: 'main_stem_contour',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Main S-Curve Vine Trunk',
    closed: true,
    depth: params.reliefDepth,
    toolType: 'ballnose',
    points: transformPts([...leftStemPts, ...rightStemPts]),
  });

  // Centerline toolpath for the main stem (for V-bit 3D rounding pass)
  const stemCenterCtrl: [Point2D, Point2D, Point2D, Point2D][] = [
    [
      { x: sunTopX, y: sunTopY - sunTopRadius - 5 },
      { x: sunTopX - 65, y: sunTopY - sunTopRadius - 40 },
      { x: sunTopX - 80, y: centerPanelBottom + centerHeight * 0.65 },
      { x: sunTopX - 16, y: centerPanelBottom + centerHeight * 0.52 },
    ],
    [
      { x: sunTopX - 16, y: centerPanelBottom + centerHeight * 0.52 },
      { x: sunTopX + 59, y: centerPanelBottom + centerHeight * 0.42 },
      { x: sunTopX + 82, y: centerPanelBottom + centerHeight * 0.35 },
      { x: sunTopX + 28, y: centerPanelBottom + centerHeight * 0.22 },
    ],
    [
      { x: sunTopX + 28, y: centerPanelBottom + centerHeight * 0.22 },
      { x: sunTopX - 38, y: centerPanelBottom + centerHeight * 0.14 },
      { x: sunTopX - 52, y: centerPanelBottom + centerHeight * 0.08 },
      { x: sunTopX + 12, y: centerPanelBottom + 35 },
    ],
  ];
  const centerStemPts = stemCenterCtrl.flatMap((seg) => sampleCubicBezier(...seg, 20));
  polylines.push({
    id: 'main_stem_centerline',
    layerId: '09_FLORAL_VEIN_DETAILS',
    name: 'Main Vine Ridge Centerline',
    closed: false,
    depth: 3.5,
    toolType: 'vbit',
    points: transformPts(centerStemPts),
  });

  // C. UPPER SIDE VOLUTE SCROLL (Top-Left C-Curl branch)
  const curlLeftPts = sampleCubicBezier(
    { x: sunTopX - 35, y: centerPanelTop - centerHeight * 0.18 },
    { x: sunTopX - 95, y: centerPanelTop - centerHeight * 0.17 },
    { x: sunTopX - 98, y: centerPanelTop - centerHeight * 0.24 },
    { x: sunTopX - 60, y: centerPanelTop - centerHeight * 0.23 },
    14
  );
  polylines.push({
    id: 'upper_volute_curl_left',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Upper Volute C-Scroll Branch',
    closed: false,
    depth: 8,
    toolType: 'vbit',
    points: transformPts(curlLeftPts),
  });

  // Upper side bird-head calyx floret
  polylines.push({
    id: 'upper_calyx_node',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Upper Scroll Calyx Node',
    closed: true,
    depth: 7,
    toolType: 'ballnose',
    points: transformPts(
      generateEllipsePolyline(sunTopX - 65, centerPanelTop - centerHeight * 0.22, 10, 8, -25, 20)
    ),
  });

  // D. MIDDLE ACANTHUS LEAF CLUSTER (Prominent leaves in the middle-left)
  // Leaf 1: Upward pointing middle leaf
  const leafMid1 = generateAcanthusLeaf(
    sunTopX - 30,
    centerPanelBottom + centerHeight * 0.54,
    centerColWidth * 0.38,
    centerColWidth * 0.22,
    -130,
    0.3
  );
  polylines.push({
    id: 'mid_leaf_1_contour',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Middle Acanthus Leaf Main',
    closed: true,
    depth: 9,
    toolType: 'vbit',
    points: transformPts(leafMid1.contour),
  });
  polylines.push({
    id: 'mid_leaf_1_vein',
    layerId: '09_FLORAL_VEIN_DETAILS',
    name: 'Middle Acanthus Vein Main',
    closed: false,
    depth: 2.5,
    toolType: 'vbit',
    points: transformPts(leafMid1.vein),
  });

  // Leaf 2: Downward pointing side leaf
  const leafMid2 = generateAcanthusLeaf(
    sunTopX - 45,
    centerPanelBottom + centerHeight * 0.46,
    centerColWidth * 0.32,
    centerColWidth * 0.18,
    -165,
    -0.2
  );
  polylines.push({
    id: 'mid_leaf_2_contour',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Middle Acanthus Leaf Lower',
    closed: true,
    depth: 8,
    toolType: 'vbit',
    points: transformPts(leafMid2.contour),
  });
  polylines.push({
    id: 'mid_leaf_2_vein',
    layerId: '09_FLORAL_VEIN_DETAILS',
    name: 'Middle Acanthus Vein Lower',
    closed: false,
    depth: 2.5,
    toolType: 'vbit',
    points: transformPts(leafMid2.vein),
  });

  // Leaf 3: Right-branching side acanthus leaf (Opposite middle)
  const leafMid3 = generateAcanthusLeaf(
    sunTopX + 45,
    centerPanelBottom + centerHeight * 0.44,
    centerColWidth * 0.34,
    centerColWidth * 0.2,
    25,
    0.3
  );
  polylines.push({
    id: 'mid_leaf_right_contour',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Middle Right Acanthus Leaf',
    closed: true,
    depth: 8,
    toolType: 'vbit',
    points: transformPts(leafMid3.contour),
  });
  polylines.push({
    id: 'mid_leaf_right_vein',
    layerId: '09_FLORAL_VEIN_DETAILS',
    name: 'Middle Right Acanthus Vein',
    closed: false,
    depth: 2.5,
    toolType: 'vbit',
    points: transformPts(leafMid3.vein),
  });

  // E. LOWER SUNFLOWER (Angled at ~45° facing left-upward)
  const sunBotX = sunTopX + centerColWidth * 0.08;
  const sunBotY = centerPanelBottom + centerHeight * 0.26;
  const sunBotRadius = centerColWidth * 0.24;
  const sunBotDiscRadius = sunBotRadius * 0.42;

  // Lower Sunflower Seed Disc
  polylines.push({
    id: 'sunflower_bot_disc',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Lower Sunflower Seed Disc',
    closed: true,
    depth: params.reliefDepth,
    toolType: 'ballnose',
    points: transformPts(generateEllipsePolyline(sunBotX, sunBotY, sunBotDiscRadius, sunBotDiscRadius, -25, 28)),
  });

  // Lower Sunflower Disc Cross-hatching
  for (let i = -2; i <= 2; i++) {
    const offset = i * (sunBotDiscRadius / 2.8);
    const halfChord = Math.sqrt(Math.max(0, sunBotDiscRadius * sunBotDiscRadius - offset * offset));
    polylines.push({
      id: `sun_bot_grid_a_${i}`,
      layerId: '09_FLORAL_VEIN_DETAILS',
      name: `Lower Sunflower Grid A ${i}`,
      closed: false,
      depth: 2,
      toolType: 'vbit',
      points: transformPts([
        { x: sunBotX + offset - halfChord * 0.7, y: sunBotY + offset - halfChord * 0.7 },
        { x: sunBotX + offset + halfChord * 0.7, y: sunBotY + offset + halfChord * 0.7 },
      ]),
    });
    polylines.push({
      id: `sun_bot_grid_b_${i}`,
      layerId: '09_FLORAL_VEIN_DETAILS',
      name: `Lower Sunflower Grid B ${i}`,
      closed: false,
      depth: 2,
      toolType: 'vbit',
      points: transformPts([
        { x: sunBotX + offset - halfChord * 0.7, y: sunBotY - offset + halfChord * 0.7 },
        { x: sunBotX + offset + halfChord * 0.7, y: sunBotY - offset - halfChord * 0.7 },
      ]),
    });
  }

  // Lower Sunflower Petals (12 petals tilted)
  const botPetalCount = 12;
  for (let p = 0; p < botPetalCount; p++) {
    const angle = (p / botPetalCount) * 360 - 25;
    const petalPts = generatePetalContour(
      sunBotX,
      sunBotY,
      sunBotRadius,
      sunBotRadius * 0.32,
      angle
    );
    polylines.push({
      id: `sunflower_bot_petal_${p}`,
      layerId: '08_FLORAL_VINE_RELIEF',
      name: `Lower Sunflower Petal ${p + 1}`,
      closed: true,
      depth: params.reliefDepth * 0.82,
      toolType: 'vbit',
      points: transformPts(petalPts),
    });
  }

  // F. BOTTOM ARABESQUE TERMINATION & FLOURISHES
  // Acanthus spray fans at the bottom base of the panel
  const leafBaseLeft = generateAcanthusLeaf(
    sunTopX - 10,
    centerPanelBottom + 45,
    centerColWidth * 0.32,
    centerColWidth * 0.16,
    -145,
    -0.3
  );
  polylines.push({
    id: 'base_leaf_left_contour',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Base Arabesque Leaf Left',
    closed: true,
    depth: 7,
    toolType: 'vbit',
    points: transformPts(leafBaseLeft.contour),
  });
  polylines.push({
    id: 'base_leaf_left_vein',
    layerId: '09_FLORAL_VEIN_DETAILS',
    name: 'Base Leaf Vein Left',
    closed: false,
    depth: 2,
    toolType: 'vbit',
    points: transformPts(leafBaseLeft.vein),
  });

  const leafBaseRight = generateAcanthusLeaf(
    sunTopX + 22,
    centerPanelBottom + 40,
    centerColWidth * 0.38,
    centerColWidth * 0.18,
    -35,
    0.3
  );
  polylines.push({
    id: 'base_leaf_right_contour',
    layerId: '08_FLORAL_VINE_RELIEF',
    name: 'Base Arabesque Leaf Right',
    closed: true,
    depth: 7,
    toolType: 'vbit',
    points: transformPts(leafBaseRight.contour),
  });
  polylines.push({
    id: 'base_leaf_right_vein',
    layerId: '09_FLORAL_VEIN_DETAILS',
    name: 'Base Leaf Vein Right',
    closed: false,
    depth: 2,
    toolType: 'vbit',
    points: transformPts(leafBaseRight.vein),
  });

  // 10. LAYER 10: HARDWARE / HANDLE & ESCUTCHEON REFERENCE
  // Lock stile position on right side at standard height (~1000mm from bottom)
  const handleX = rightColInnerRight + (params.width - rightColInnerRight) / 2;
  const handleY = params.bottomRailHeight + 820; // ~1000mm from floor

  // Escutcheon backplate (traditional antique arched backplate)
  const escWidth = 36;
  const escHeight = 220;
  polylines.push({
    id: 'escutcheon_plate',
    layerId: '10_MORTISE_HANDLE_REF',
    name: 'Escutcheon Backplate',
    closed: true,
    depth: 2,
    toolType: 'profile',
    points: transformPts([
      { x: handleX - escWidth / 2, y: handleY - escHeight * 0.45 },
      { x: handleX + escWidth / 2, y: handleY - escHeight * 0.45 },
      { x: handleX + escWidth / 2, y: handleY + escHeight * 0.35 },
      { x: handleX, y: handleY + escHeight * 0.5 }, // Arched top
      { x: handleX - escWidth / 2, y: handleY + escHeight * 0.35 },
    ]),
  });

  // Spindle hole
  polylines.push({
    id: 'handle_spindle_hole',
    layerId: '10_MORTISE_HANDLE_REF',
    name: 'Handle Lever Spindle Hole',
    closed: true,
    depth: 25,
    toolType: 'endmill',
    points: transformPts(generateEllipsePolyline(handleX, handleY + 28, 9, 9, 0, 16)),
  });

  // Keyhole slot
  polylines.push({
    id: 'handle_keyhole',
    layerId: '10_MORTISE_HANDLE_REF',
    name: 'Mortise Keyhole Slot',
    closed: true,
    depth: 25,
    toolType: 'endmill',
    points: transformPts([
      { x: handleX - 4, y: handleY - 42 },
      { x: handleX + 4, y: handleY - 42 },
      { x: handleX + 2.5, y: handleY - 60 },
      { x: handleX - 2.5, y: handleY - 60 },
    ]),
  });

  return polylines;
}
