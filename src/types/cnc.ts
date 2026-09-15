/**
 * CNC Door CAD/CAM & VCarve DXF Type Definitions
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface VectorPolyline {
  id: string;
  layerId: string;
  points: Point2D[];
  closed: boolean;
  name?: string;
  depth?: number; // Target cut depth in mm
  toolType?: 'endmill' | 'vbit' | 'ballnose' | 'profile';
}

export interface CADLayer {
  id: string;
  name: string;
  vcarveName: string; // Layer name recognized in VCarve
  color: string; // Hex color for UI
  dxfColor: number; // AutoCAD ACI color index (1=Red, 2=Yellow, 3=Green, 4=Cyan, 5=Blue, 6=Magenta, 7=White/Black)
  visible: boolean;
  locked: boolean;
  description: string;
  defaultTool: 'endmill' | 'vbit' | 'ballnose' | 'profile';
  targetDepth: number; // mm
  toolpathStrategy: 'profile_outside' | 'profile_inside' | 'pocket' | 'vcarve' | 'engrave' | '3d_finish';
  polylineCount?: number;
}

export interface DoorParameters {
  width: number; // Overall door width (mm, default: 900)
  height: number; // Overall door height (mm, default: 2100)
  thickness: number; // Door thickness (mm, default: 40)
  stileWidth: number; // Left/Right stile width (mm, default: 110)
  topRailHeight: number; // Top rail height above arch (mm, default: 150)
  bottomRailHeight: number; // Bottom rail height (mm, default: 180)
  archRise: number; // Top arch center rise (mm, default: 130)
  cofferedGridCols: number; // Grid columns per side (default: 1)
  cofferedGridRows: number; // Grid rows per side (default: 7)
  grooveWidth: number; // Coffered panel bevel groove width (mm, default: 28)
  grooveDepth: number; // Coffered groove depth (mm, default: 8)
  centerPanelWidth: number; // Central floral panel width (mm, default: 290)
  reliefDepth: number; // 2.5D floral relief depth (mm, default: 10)
  vBitAngle: number; // V-carve bit angle in degrees (default: 60)
  ballnoseDiameter: number; // Ballnose bit diameter (mm, default: 3.175)
  endmillDiameter: number; // Clearing endmill diameter (mm, default: 6.35)
  safeZ: number; // Rapid clearance height (mm, default: 10)
  feedRate: number; // Cut feed rate (mm/min, default: 2400)
  plungeRate: number; // Plunge feed rate (mm/min, default: 800)
  spindleRpm: number; // Spindle speed (RPM, default: 18000)
  originPosition: 'bottom_left' | 'center' | 'top_left';
}

export interface CNCPostProcessor {
  id: string;
  name: string;
  extension: string;
  header: (params: DoorParameters) => string[];
  footer: () => string[];
  commentPrefix: string;
}

export interface ToolpathSegment {
  type: 'rapid' | 'feed' | 'arc_cw' | 'arc_ccw' | 'plunge' | 'retract';
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  layerId: string;
  tool: string;
}

export interface ToolpathStats {
  totalDistanceMm: number;
  rapidDistanceMm: number;
  cutDistanceMm: number;
  estimatedTimeMin: number;
  totalGcodeLines: number;
}
