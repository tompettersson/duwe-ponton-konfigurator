import { type GenericAssetOptions } from './ModelLoader';

export interface ShowcaseAssetDefinition extends GenericAssetOptions {
  label: string;
  details?: string[];
  rotationYDeg?: number;
  verticalOffsetMM?: number;
  fixedScale?: number;
  targetHeightMM?: number;
  targetWidthMM?: number;
  targetDepthMM?: number;
}

export const SHOWCASE_ASSETS: ShowcaseAssetDefinition[] = [
  {
    id: 'pontoon-single',
    label: 'Einzelelement',
    format: 'obj',
    path: '/3d/neu/Ponton_single.obj',
    axisPreference: 'smallest',
    details: [
      'Einsatz: Basiszelle 50×50 cm',
      'Platzierung: manuell, Hardware automatisch',
      'Status: produktiv'
    ]
  },
  {
    id: 'pontoon-double',
    label: 'Doppelelement',
    format: 'obj',
    path: '/3d/fc/Ponton.obj',
    mtlPath: '/3d/fc/Ponton.mtl',
    axisPreference: 'smallest',
    details: [
      'Einsatz: breite Stegabschnitte',
      'Platzierung: manuell/Multi-Drop',
      'Status: produktiv'
    ]
  },
  {
    id: 'connector-standard',
    label: 'Verbinder kurz',
    format: 'obj',
    path: '/3d/fc/Verbinder.obj',
    mtlPath: '/3d/fc/Verbinder.mtl',
    axisPreference: 'largest',
    details: [
      'Einsatz: 4-Lug Kreuzungen',
      'Platzierung: automatisch (Connector Planner)',
      'Status: Farbe prüfen (grau/blau)'
    ]
  },
  {
    id: 'connector-long',
    label: 'Verbinder lang',
    format: 'obj',
    path: '/3d/fc/Verbinderlang.obj',
    mtlPath: '/3d/fc/Verbinderlang.mtl',
    axisPreference: 'largest',
    details: [
      'Einsatz: mehrlagige Aufbauten',
      'Platzierung: automatisch bei Höhenversatz',
      'Status: produktiv'
    ]
  },
  {
    id: 'edge-bolt',
    label: 'Randverbinder Bolzen',
    format: 'obj',
    path: '/3d/fc/Randverbinder1.obj',
    mtlPath: '/3d/fc/Randverbinder1.mtl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Kantenabschluss außen',
      'Platzierung: automatisch',
      'Status: produktiv'
    ]
  },
  {
    id: 'edge-nut',
    label: 'Randverbinder Mutter',
    format: 'obj',
    path: '/3d/fc/Randverbinder2.obj',
    mtlPath: '/3d/fc/Randverbinder2.mtl',
    axisPreference: 'smallest',
    details: [
      'Einsatz: Gegenstück zum Bolzen',
      'Platzierung: automatisch gekoppelt',
      'Status: produktiv'
    ]
  },
  {
    id: 'spacer-single',
    label: 'Distanzscheibe einfach',
    format: 'obj',
    path: '/3d/fc/Einzel-Scheibe.obj',
    mtlPath: '/3d/fc/Einzel-Scheibe.mtl',
    axisPreference: 'smallest',
    details: [
      'Einsatz: 3-Lug Übergänge',
      'Platzierung: automatisch',
      'Status: produktiv'
    ]
  },
  {
    id: 'spacer-double',
    label: 'Distanzscheibe doppelt',
    format: 'obj',
    path: '/3d/fc/Scheibe.obj',
    mtlPath: '/3d/fc/Scheibe.mtl',
    axisPreference: 'smallest',
    details: [
      'Einsatz: 1–2 Lug Übergänge',
      'Platzierung: automatisch',
      'Status: produktiv'
    ]
  },
  {
    id: 'drain-plug',
    label: 'Drain-/Entlüftungsschraube',
    format: 'obj',
    path: '/3d/fc/Flutschraube.obj',
    mtlPath: '/3d/fc/Flutschraube.mtl',
    axisPreference: 'smallest',
    details: [
      'Einsatz: Ponton-Seitenöffnung',
      'Platzierung: automatisch je Ponton',
      'Status: produktiv'
    ]
  },
  {
    id: 'reference-plate',
    label: 'Referenzplatte 500×500',
    format: 'stl',
    path: '/3d/converted/500x500.stl',
    axisPreference: 'smallest',
    details: [
      'Einsatz: Maß-Check & Showcase',
      'Platzierung: manuell',
      'Status: nur Demo'
    ]
  },
  {
    id: 'pfosten',
    label: 'Pfosten',
    format: 'stl',
    path: '/3d/converted/pfosten.stl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Geländer-/Zubehörstart',
      'Platzierung: manuell',
      'Fragen: Montagepunkte definieren'
    ]
  },
  {
    id: 'railing-standard',
    label: 'Geländerpfosten Standard',
    format: 'stl',
    path: '/3d/converted/04_gelanderpfosten-standard.stl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Vollfläche-Geländer',
      'Platzierung: manuell (Planner offen)',
      'Fragen: Segmentabstände'
    ]
  },
  {
    id: 'railing-single',
    label: 'Geländerpfosten 1 Strebe',
    format: 'stl',
    path: '/3d/converted/07_gelanderpfosten-1-strebe.stl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Geländer mit 1 Strebe',
      'Platzierung: manuell',
      'Fragen: Kombi mit Pfosten'
    ]
  },
  {
    id: 'railing-double',
    label: 'Geländerpfosten 2 Streben',
    format: 'stl',
    path: '/3d/converted/10_gelanderpfosten-2-streben.stl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Geländer mit 2 Streben',
      'Platzierung: manuell',
      'Fragen: Höhenvariation'
    ]
  },
  {
    id: 'double-bollard',
    label: 'Doppelpoller',
    format: 'stl',
    path: '/3d/converted/doppelpoller.stl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Festmacher schwerer Boote',
      'Platzierung: manuell',
      'Fragen: Verankerung/Hardware'
    ]
  },
  {
    id: 'cleat',
    label: 'Bootsklampe',
    format: 'stl',
    path: '/3d/converted/bootsklampe.stl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Festmacher an Außenkante',
      'Platzierung: manuell',
      'Fragen: Randverbinder-Setup'
    ]
  },
  {
    id: 'tool-key',
    label: 'Verriegelungsschlüssel',
    format: 'obj',
    path: '/3d/fc/Schlüssel.obj',
    mtlPath: '/3d/fc/Schlüssel.mtl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Drehen der Verbinder',
      'Platzierung: manuell (Tool)',
      'Status: optionales Zubehör'
    ]
  },
  {
    id: 'tool-wrench',
    label: 'Mutternschlüssel',
    format: 'obj',
    path: '/3d/fc/Mutternschlüssel.obj',
    mtlPath: '/3d/fc/Mutternschlüssel.mtl',
    axisPreference: 'largest',
    details: [
      'Einsatz: Randverbinder anziehen',
      'Platzierung: manuell (Tool)',
      'Status: optionales Zubehör'
    ]
  }
];
