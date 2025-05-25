# Tiefgreifende Systemanalyse - 3D Pontoon Configurator

## 1. KOORDINATENSYSTEM ANALYSE

### 1.1 3D-Raum Koordinaten
- **X-Achse**: Links/Rechts (horizontal)
- **Y-Achse**: Hoch/Runter (vertikal/Höhe)
- **Z-Achse**: Vor/Zurück (Tiefe)

### 1.2 Grid-System
- Grid erstreckt sich in X-Z Ebene (horizontal)
- Y-Achse wird für Level-Höhen verwendet
- Level 0 = Y: 0, Level 1 = Y: 1 * LEVEL_HEIGHT, etc.

## 2. KOMPONENTEN-HIERARCHIE & VERANTWORTLICHKEITEN

### 2.1 PontoonScene.jsx (Orchestrator)
**Aufgaben:**
- State Management (Zustand Store Integration)
- Event Handler Definition
- Grid-Generierung Koordination
- Tool-Management

**Probleme identifiziert:**
- Koordinaten-Verwirrung zwischen Y/Z für Level
- Inkonsistente Position-Handling

### 2.2 Scene.jsx (3D Canvas Manager)
**Aufgaben:**
- Three.js Canvas Setup
- Kamera-Management (Orthographic/Perspective)
- Komponenten-Positioning im 3D-Raum
- Group-Hierarchie für Level

**Kritische Erkenntnisse:**
- `<group position={[0, currentLevel * levelHeight, 0]}>` verschiebt ALLES vertikal
- Grid UND GridCells werden zusammen verschoben
- Pontons werden SEPARAT positioniert

### 2.3 Grid.jsx (Visuelle Linien)
**Aufgaben:**
- Zeichnet nur visuelle Gitterlinien
- Rein dekorativ, keine Interaktion
- LineSegments in X-Z Ebene

### 2.4 SimpleGridSystem.jsx (Interaktive Bereiche)
**Aufgaben:**
- Erstellt klickbare Grid-Zellen
- Hover-Effekte
- Event-Weiterleitung

**Kritischer Punkt:**
- Zellen werden bei (x, 0, z) erstellt
- Aber die Gruppe wird um Y-Offset verschoben
- Pontons werden bei ABSOLUTEN Koordinaten platziert

### 2.5 PontoonInstances.jsx (Rendering)
**Aufgaben:**
- Instanced Rendering für Performance
- Verwendet ABSOLUTE Positionen aus Store

## 3. LEVEL-SYSTEM ANALYSE

### 3.1 Wie Level funktionieren SOLLTEN:
```
Level -1: Y = -1 * LEVEL_HEIGHT = -1
Level 0:  Y = 0 * LEVEL_HEIGHT = 0 
Level 1:  Y = 1 * LEVEL_HEIGHT = 1
Level 2:  Y = 2 * LEVEL_HEIGHT = 2
```

### 3.2 Problem im aktuellen System:
1. **Scene Group**: Verschiebt Grid+Cells um `currentLevel * levelHeight`
2. **Pontoon Placement**: Berechnet ABSOLUTE Y-Position
3. **Mismatch**: Grid ist bei Y=currentLevel, Pontoon bei Y=currentLevel

## 4. EVENT-FLOW ANALYSE

### 4.1 Aktueller Flow:
```
1. User klickt Tool → selectedTool State
2. User hovert Grid → GridCell zeigt Farbe
3. User klickt GridCell → handleCellClick(position)
4. handleCellClick → addElement mit ABSOLUTER Position
5. Pontoon wird bei ABSOLUTER Position gerendert
```

### 4.2 Problem:
- GridCell Position: Relativ zur Group (Y=0 in Group)
- Group Position: Verschoben um currentLevel
- Pontoon Position: Absolut im Weltkoordinatensystem

## 5. STORE SYSTEM ANALYSE

### 5.1 Element Format:
```javascript
{
  position: { x: number, y: number, z: number }, // ABSOLUTE Weltkoordinaten
  type: 'single' | 'double',
  rotation: 0 | 90 | 180 | 270
}
```

### 5.2 Level-Zuordnung:
- Element gehört zu Level basierend auf Y-Koordinate
- `elementLevel = element.position.y / LEVEL_HEIGHT`

## 6. KRITISCHE PROBLEME IDENTIFIZIERT

### 6.1 Koordinaten-Chaos:
- **3 verschiedene Koordinatensysteme gleichzeitig**
- Grid-Gruppe: Verschoben
- Grid-Zellen: Relativ zur Gruppe
- Pontons: Absolut

### 6.2 Level-Inkonsistenz:
- Grid wird für aktuelles Level verschoben
- Pontons werden IMMER bei aktueller Group-Position platziert
- Aber sie sollen bei ABSOLUTER Level-Position sein

### 6.3 Event-Koordinaten-Mismatch:
- Click gibt relative Position zur Gruppe
- Aber Pontoon braucht absolute Weltposition

## 7. LÖSUNGSANSATZ

### 7.1 Koordinaten-Klarstellung:
- **EINE einheitliche Koordinaten-Referenz**
- Entweder ALLES relativ oder ALLES absolut
- Grid-Zellen müssen ABSOLUTE Koordinaten liefern

### 7.2 Level-System Korrektur:
```javascript
// GridCell Click Handler sollte liefern:
const absolutePosition = {
  x: clickX,           // Grid X
  y: currentLevel * LEVEL_HEIGHT,  // Absolute Y für Level
  z: clickZ            // Grid Z
}
```

### 7.3 Rendering-Konsistenz:
- Alle Pontons bei absoluten Koordinaten
- Grid-Gruppe NICHT verschieben
- Level-Sichtbarkeit über Opacity/Filtering

## 8. EMPFOHLENE REFACTORING-STRATEGIE

### 8.1 Schritt 1: Koordinaten-Vereinheitlichung
- Alle Positionen in ABSOLUTEN Weltkoordinaten
- Grid-Gruppe bei (0,0,0) lassen
- Level-Anzeige über separate Logik

### 8.2 Schritt 2: Event-System Korrektur
- GridCell liefert korrekte absolute Position
- handleCellClick verwendet Position direkt

### 8.3 Schritt 3: Level-Rendering
- Pontons aller Level rendern
- Aktuelle Level: Opacity 1.0
- Andere Level: Opacity 0.3
- Grid nur für aktuelles Level sichtbar

## 9. FAZIT

Das System hat fundamentale Koordinaten- und Level-Management Probleme:
1. **Drei verschiedene Koordinatensysteme** verwirren die Platzierung
2. **Group-Verschiebung** vs. **absolute Pontoon-Positionen** sind inkompatibel
3. **Level-System** ist nicht konsistent implementiert

**Lösung**: Komplette Koordinaten-Vereinheitlichung auf ABSOLUTE Weltkoordinaten.