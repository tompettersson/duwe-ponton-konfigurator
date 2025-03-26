# Ponton-Konfigurator

Ein interaktiver 3D-Konfigurator für Pontons, basierend auf React, Next.js und Three.js mit React Three Fiber.

## Projektübersicht

Der Ponton-Konfigurator ermöglicht es Kunden, maßgeschneiderte Ponton-Konfigurationen zu erstellen und zu visualisieren. Das Tool bietet sowohl eine 2D- als auch eine 3D-Ansicht und erlaubt es, verschiedene Pontontypen in einem Raster zu platzieren, um individuelle Lösungen zu entwerfen.

### Hauptfunktionen

- Interaktive 2D- und 3D-Ansicht des Konfigurators
- Platzierung von einzelnen und doppelten Pontons auf einem Raster
- Mehrere Ebenen für komplexe Strukturen (inklusive Unterwasserbereich)
- Echtzeit-Visualisierung mit realistischer Wasserdarstellung
- Berechnung von Größen und Kosten basierend auf der Konfiguration
- Exportierbare Ergebnistabelle für Kunden

## Technologie-Stack

- **Frontend**: Next.js 15 (App Router)
- **Rendering**: React 19
- **3D-Visualisierung**: Three.js und React Three Fiber/Drei
- **UI**: Tailwind CSS
- **Interaktivität**: React DnD (Drag and Drop)

## Projektstruktur

```
app/
├── components-src/      # Hauptkomponenten des Konfigurators
│   ├── App.jsx          # Hauptanwendungskomponente
│   ├── PontoonScene.jsx # Steuerung der Szene und Zustand
│   ├── Scene.jsx        # Three.js Canvas und Kameraeinstellungen
│   ├── Toolbar.jsx      # Werkzeugleiste für die Interaktion
│   ├── Grid.jsx         # Rastergitter für Platzierung
│   ├── GridCell.jsx     # Einzelne Zelle im Raster
│   ├── GridElement.jsx  # Pontonelemente (Einzeln/Doppelt)
│   ├── SimpleWater.jsx  # Wasservisualisierung
│   └── Sun.jsx          # Lichtquelle für die Szene
```

## Installation und Einrichtung

Zuerst das Repository klonen und in das Projektverzeichnis wechseln:

```bash
git clone [repository-url]
cd ponton-konfigurator
```

Abhängigkeiten installieren:

```bash
npm install
```

Entwicklungsserver starten:

```bash
npm run dev
```

Die Anwendung ist nun unter [http://localhost:3000](http://localhost:3000) verfügbar.

## Entwicklungsworkflow

### Pontons platzieren und bearbeiten

Der Konfigurator verwendet ein Raster-basiertes System mit den folgenden Werkzeugen:

- **Einzel-Ponton**: Platziert einen quadratischen 1x1 Ponton
- **Doppel-Ponton**: Platziert einen rechteckigen 2x1 Ponton
- **Löschen**: Entfernt platzierte Pontons

### Ebenen

Der Konfigurator unterstützt verschiedene Ebenen:

- **Ebene -1**: Unterwasserbereich
- **Ebene 0**: Grundebene (Wasserlinie)
- **Ebene 1**: Erste Ebene über Wasser
- **Ebene 2**: Zweite Ebene über Wasser

### Kameraansichten

- **2D-Ansicht**: Orthografische Top-Down-Ansicht (ideal für präzise Platzierung)
- **3D-Ansicht**: Perspektivische Ansicht mit OrbitControls (zum Erkunden der Konfiguration)

## Datenmodell

Das Datenmodell für Pontonelemente basiert auf:

- **Position**: [x, y, z] Koordinaten im Raum
- **Typ**: "single" oder "double" für verschiedene Pontongrößen
- **Ebene**: Die vertikale Ebene, auf der der Ponton platziert ist

## Zukünftige Funktionen

- Integration realer Daten zu Größen und Kosten
- Exportfunktion für Kundentabellen
- Speichern und Laden von Konfigurationen
- Erweiterte Material- und Farboptionen
- Physikbasierte Simulation (Schwimmfähigkeit, Balance)
- Mobile Optimierung

## Lizenz

[Lizenzinformationen einfügen]
