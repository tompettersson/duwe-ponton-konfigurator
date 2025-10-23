# Nutzbare 3D-Assets (kanonische Liste)

Aktueller Stand aller Assets, die der neue Renderer unmittelbar darstellen kann. Duplikate (z. B. alternative STL/FBX-Exporte derselben Geometrie) sind hier bewusst nicht separat aufgeführt, bleiben aber im Repository für Vergleiche erhalten.

## Kernsystem – produktiv eingebunden

- **Einzelelement (Standard-Ponton)**  
  Dateien: `public/3d/Ponton_single.obj` (+ `.mtl`), alternative Tests: `public/3d/neu/Ponton_single.obj`, `public/3d/neu/ponton.{obj,fbx,stl}`  
  Einsatz: Basiszelle im Raster.  
  Platzierung: Manuell durch den Benutzer (Tool PLACE); alle nachgelagerten Hardware-Bausteine werden automatisch ergänzt.  
  Offene Punkte: Material-/Farbdefinition passt; alternative Exporte nur für QA.

- **Doppelelement**  
  Dateien: `public/3d/fc/Ponton.obj` (+ `.mtl`)  
  Einsatz: Zwei-Zellen-Ponton für breite Stege.  
  Platzierung: Manuell über PLACE/MULTI-DROP; Hardware folgt automatisch.  
  Offene Punkte: Materialzuordnung der Hardware (grau vs. historisches Blau) wird noch abgestimmt.

- **Verbinder kurz**  
  Dateien: `public/3d/fc/Verbinder.obj` (+ `.mtl`)  
  Einsatz: Standard-Kurzverbinder für jede 4-Lug-Kreuzung.  
  Platzierung: Vollautomatisch via `connectorPlanner`; instanziertes Rendering aktiv.  
  Offene Punkte: Optionale Farbsteuerung im UI (siehe interne Notiz 2025‑03‑27).

- **Verbinder lang**  
  Dateien: `public/3d/fc/Verbinderlang.obj` (+ `.mtl`)  
  Einsatz: Für mehrlagige Aufbauten bzw. hohe Bauteile (durch zwei Ebenen).  
  Platzierung: Automatisch, wenn Höhenversatz erkannt wird.  
  Offene Punkte: Keine – Maße validiert.

- **Randverbinder (Bolzen)**  
  Dateien: `public/3d/fc/Randverbinder1.obj` (+ `.mtl`)  
  Einsatz: Abschluss an exponierten Kanten.  
  Platzierung: Automatisch für Kanten mit Lug-Lücken.  
  Offene Punkte: Mechanik bestätigt; Rendering teilt sich Material mit Randverbinder-Nuss.

- **Randverbinder (Mutter)**  
  Dateien: `public/3d/fc/Randverbinder2.obj` (+ `.mtl`)  
  Einsatz: Gegenstück zum Bolzen für die Außenkante.  
  Platzierung: Automatisch gekoppelt an Randverbinder-Bolzen.  
  Offene Punkte: Keine.

- **Distanzscheibe einfach**  
  Dateien: `public/3d/fc/Einzel-Scheibe.obj` (+ `.mtl`)  
  Einsatz: Auffüllen von 3-Lug-Situationen.  
  Platzierung: Automatisch bei LugCount == 3.  
  Offene Punkte: Keine.

- **Distanzscheibe doppelt**  
  Dateien: `public/3d/fc/Scheibe.obj` (+ `.mtl`)  
  Einsatz: Auffüllen von 1–2 Lug-Situationen.  
  Platzierung: Automatisch bei LugCount ≤ 2.  
  Offene Punkte: Keine.

- **Drain-/Entlüftungsschraube**  
  Dateien: `public/3d/fc/Flutschraube.obj` (+ `.mtl`)  
  Einsatz: Seitliche Öffnung jedes Pontons.  
  Platzierung: Automatisch je Ponton (positive Z-Seite); Rotation wird berücksichtigt.  
  Offene Punkte: Optionales Material-Finetuning.

## Zusätzliche Showcase-/Zubehör-Assets (manuell)

Diese Modelle liegen in `public/3d/converted/` als STL vor und werden aktuell nur über den Showcase-Button oder manuell verwendbar gemacht. Für automatische Platzierung existiert noch kein Planner.

- **Referenzplatte 500×500** (`500x500.stl`)  
  Einsatz: Maßprüfung / Visualisierung einer einzelnen Rasterzelle.  
  Platzierung: Rein manuell im Showcase.  
  Offene Punkte: Keine.

- **Pfosten (Grundpfosten)** (`pfosten.stl`)  
  Einsatz: Start-/Endstütze für Geländer oder Zubehör.  
  Platzierung: Manuell. Planner fehlt (Geländer-Layout notwendig).  
  Offene Punkte: Montagepunkte & Rasterlogik definieren.

- **Geländerpfosten – Standard** (`04_gelanderpfosten-standard.stl`)  
  Einsatz: Standard-Zaun mit geschlossener Fläche.  
  Platzierung: Manuell. Geplante Automatik: Linien entlang Außenkante.  
  Offene Punkte: Andock-Regeln, notwendige Verbinder, evtl. Animation.

- **Geländerpfosten – 1 Strebe** (`07_gelanderpfosten-1-strebe.stl`)  
  Einsatz: Geländer mit einer Mittelstrebe.  
  Platzierung: Manuell.  
  Offene Punkte: Siehe Standard-Variante; zusätzlich Strebenabstand klären.

- **Geländerpfosten – 2 Streben** (`10_gelanderpfosten-2-streben.stl`)  
  Einsatz: Geländer mit zwei Streben (höhere Sicherheit).  
  Platzierung: Manuell.  
  Offene Punkte: Wie oben.

- **Bootsklampe** (`bootsklampe.stl`)  
  Einsatz: Festmacherpunkt am Außenrand.  
  Platzierung: Manuell; Planner muss Kanten-Zellen erkennen und Freiraum prüfen.  
  Offene Punkte: Benötigt spezielle Randverbinder? Positionierungsrichtlinie fehlt.

## Nicht gelistete (Duplikate & Rohdaten)

- STL-Duplikate der Pontons (`einzelelement*.stl`, `doppelelement.stl`, `doppelschwimmer.stl`, `verbinder.stl`, `bolzen.stl`, `13/16_*.stl`) werden nicht gesondert aufgeführt – sie spiegeln exakt die bereits produktiv eingebundenen OBJ-Versionen wider.  
- Im Ordner `public/3d/badeleiter/` sowie `public/3d/zubehoer/` liegen weitere CAD-Quellen (IAM/IPT), die erst noch nach STL/OBJ konvertiert und geprüft werden müssen (z. B. Badeleiter, Fender, Randschienen, Rutsche). Automatik-Konzept fehlt.

## Nächste Schritte

1. Planner für Geländer & Bootsklampe entwerfen (Andockpunkte, Abstände, verbauter Hardwarebedarf).  
2. Badeleiter-Modelle konvertieren (fehlt derzeit in `converted/`) und Showcase erweitern.  
3. Material-/Farbsteuerung der Hardware (Verbinder, Randverbinder) finalisieren.
