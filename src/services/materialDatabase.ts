/**
 * Material database and CNC machining feed/speed recommendations
 * Tailored for 3-axis CNC router operations (Pocketing, V-Carving, 3D Finish, Profile Cutout)
 */

export interface MaterialConfig {
  id: string;
  name: string;
  category: 'hardwood' | 'softwood' | 'engineered';
  description: string;
  densityKgM3: number;
  jankaHardness: string;
  recommendedFeedRate: number; // mm/min
  recommendedPlungeRate: number; // mm/min
  recommendedSpindleRpm: number; // RPM
  recommendedPassDepth: number; // mm max stepdown
  recommendedBitType: string;
  surfaceColor: string; // Hex for UI badge / 3D viewer texture
  grainColor: string;
  carvingHighlight: string;
  recessShadow: string;
  machiningNotes: string;
}

export const MATERIAL_PRESETS: MaterialConfig[] = [
  {
    id: 'oak',
    name: 'White / Red Oak',
    category: 'hardwood',
    description: 'Dense, durable classic architectural hardwood with pronounced grain',
    densityKgM3: 750,
    jankaHardness: '1,360 lbf (Hard)',
    recommendedFeedRate: 2200,
    recommendedPlungeRate: 700,
    recommendedSpindleRpm: 16000,
    recommendedPassDepth: 2.5,
    recommendedBitType: 'Solid Carbide 2-Flute Downcut / 60° V-Bit',
    surfaceColor: '#c8a165',
    grainColor: '#a8783d',
    carvingHighlight: '#edd7a7',
    recessShadow: '#5c3814',
    machiningNotes: 'Use sharp carbide cutters. Climb milling avoids tearout on open grain pores.',
  },
  {
    id: 'walnut',
    name: 'American Walnut',
    category: 'hardwood',
    description: 'Premium dark luxury furniture hardwood with smooth machinability and crisp carving detail',
    densityKgM3: 650,
    jankaHardness: '1,010 lbf (Medium-Hard)',
    recommendedFeedRate: 2400,
    recommendedPlungeRate: 800,
    recommendedSpindleRpm: 17500,
    recommendedPassDepth: 3.0,
    recommendedBitType: 'Carbide Up/Down Spiral & 3.175mm Tapered Ballnose',
    surfaceColor: '#5c4033',
    grainColor: '#3d281e',
    carvingHighlight: '#9b7156',
    recessShadow: '#26150c',
    machiningNotes: 'Carves exceptionally clean 2.5D relief curves and fine leaf veining with minimal fuzzing.',
  },
  {
    id: 'teak',
    name: 'Teak / Sheesham (Rosewood)',
    category: 'hardwood',
    description: 'Natural high-oil durable wood traditional for carved temple & palace doors',
    densityKgM3: 680,
    jankaHardness: '1,155 lbf (Hard)',
    recommendedFeedRate: 2100,
    recommendedPlungeRate: 650,
    recommendedSpindleRpm: 16500,
    recommendedPassDepth: 2.5,
    recommendedBitType: 'Coated Carbide 2-Flute',
    surfaceColor: '#b46d32',
    grainColor: '#784113',
    carvingHighlight: '#e29e61',
    recessShadow: '#492305',
    machiningNotes: 'High silica content requires durable solid carbide bits; ensure adequate dust extraction.',
  },
  {
    id: 'mahogany',
    name: 'Honduran Mahogany',
    category: 'hardwood',
    description: 'Straight, fine-grained reddish-brown hardwood renowned for intricate sculptural carving',
    densityKgM3: 540,
    jankaHardness: '800 lbf (Medium)',
    recommendedFeedRate: 2600,
    recommendedPlungeRate: 850,
    recommendedSpindleRpm: 18000,
    recommendedPassDepth: 3.2,
    recommendedBitType: 'Carbide Ballnose & 60° Engraving V-Bit',
    surfaceColor: '#93412a',
    grainColor: '#632717',
    carvingHighlight: '#cb7157',
    recessShadow: '#3e150b',
    machiningNotes: 'Takes intricate 3D ballnose profiling crisply with almost zero tool deflection.',
  },
  {
    id: 'pine',
    name: 'Pine / Soft Cedar',
    category: 'softwood',
    description: 'Lightweight softwood for rustic architectural doors and affordable prototypes',
    densityKgM3: 450,
    jankaHardness: '420 lbf (Soft)',
    recommendedFeedRate: 2800,
    recommendedPlungeRate: 900,
    recommendedSpindleRpm: 19000,
    recommendedPassDepth: 4.0,
    recommendedBitType: 'Downcut Spiral Endmill',
    surfaceColor: '#deb887',
    grainColor: '#bfa073',
    carvingHighlight: '#f7dfb8',
    recessShadow: '#6b512a',
    machiningNotes: 'Keep tool feed brisk to prevent thermal burning on resin pockets; use downcut on top pass.',
  },
  {
    id: 'mdf',
    name: 'High-Density MDF / HDF',
    category: 'engineered',
    description: 'Homogeneous engineered board without grain direction, perfect for painted almirah & wardrobe shutters',
    densityKgM3: 780,
    jankaHardness: 'N/A (Engineered Composite)',
    recommendedFeedRate: 3200,
    recommendedPlungeRate: 1000,
    recommendedSpindleRpm: 20000,
    recommendedPassDepth: 4.5,
    recommendedBitType: 'Compression Spiral / PCD Diamond Bit',
    surfaceColor: '#c2a688',
    grainColor: '#ab8f70',
    carvingHighlight: '#dfc7ab',
    recessShadow: '#4e3b2b',
    machiningNotes: 'Zero grain breakout on coffered panels and V-carve chamfers. Generates fine airborne dust; run dust collector.',
  },
  {
    id: 'plywood',
    name: 'Birch Plywood (Multi-Ply)',
    category: 'engineered',
    description: 'Cross-laminated veneer core board offering extreme dimensional stability for flat doors & shutters',
    densityKgM3: 680,
    jankaHardness: 'N/A (Laminated Birch)',
    recommendedFeedRate: 2700,
    recommendedPlungeRate: 800,
    recommendedSpindleRpm: 18000,
    recommendedPassDepth: 3.5,
    recommendedBitType: 'Compression Bit (Mortise Style)',
    surfaceColor: '#e0c89e',
    grainColor: '#baa074',
    carvingHighlight: '#fae7c2',
    recessShadow: '#574221',
    machiningNotes: 'Compression bit prevents top and bottom face veneer splintering during profile cutout.',
  },
];
