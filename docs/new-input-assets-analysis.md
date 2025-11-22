# Analyse der neuen STEP-Modelle (Ordner `_input/neu`)

Quelle: „Pontoon Assembly and Connector System (Jetfloat/Duwe Style)“ + STEP-Dateien Stand Okt 2025.
Die angegebenen Maße basieren auf den Bounding-Box-Werten der STEP-Dateien (vermutlich Millimeter). Wo die Werte unerwartet groß wirken, deutet das darauf hin, dass die Datei mehr als nur das einzelne Bauteil enthält (z. B. bereits vormontierte Kombinationen).

## Übersicht

| Datei | Approx. Abmessungen (L×B×H) | Beschreibung / Einordnung | Einsatz laut PDF / System | Hinweise zur weiteren Nutzung |
| --- | --- | --- | --- | --- |
| 04_Geländerpfosten Standard.STP | 101 × 109 × 1 283 mm | Einzelner Geländerpfosten ohne Streben | Railing-Start-/Endpfosten, wird über Randverbinder verschraubt | Direkt in glTF konvertieren; benötigt passendes Bracket/Edge-Connector |
| 07_Geländerpfosten 1 Strebe.STP | 1 955 × 7 256 × 2 846 mm | Pfosten mit seitlicher Steg-/Geländerstrebe (vermutlich vormontiertes Modul) | Seitliche Sicherungen/Railing mit einer Querstrebe | Enthält komplette Baugruppe → vor Konvertierung ggf. in Einzelteile zerlegen |
| 10_Geländerpfosten 2 Streben.STP | 1 955 × 7 256 × 2 846 mm | Pfosten mit zwei Streben | Railing-Modul mit beidseitiger Abspannung | Gleich wie oben; Dateigröße/Bounding Box sehr groß, vermutlich komplette Baugruppe |
| 13_Einzeldistanzscheibe.STP | 96 × 0 × 209 mm | dünne Distanzscheibe | Wird an Kanten eingesetzt, wenn <4 Lugs zusammentreffen | sehr dünn → beim Rendern auf Dicke achten, sonst Z-Fighting |
| 16_Doppeldistanzscheibe.STP | 260 × 425 × 33 mm | doppelte Distanzscheibe | Füllt doppelte Lug-Höhe (PDF Abschnitt „Spacer Washer – Double“) | Matches aktuelle Logik; konvertieren und evtl. instanziert rendern |
| 500x500.STP | 683 × 1 982 × 623 mm | vermutlich komplette 500×500 Plattform | Basisplattform, evtl. mehrere Floats + Verbinder | Bounding Box > 0,5 m → Datei enthält Zusatzkomponenten; prüfen vor Konvertierung |
| Bolzen.STP | 596 × 184 × 434 mm | Verbindungsschraube/Bolt (wahrscheinlich langer Verbinder) | Ersetzt Pins an Rändern, laut PDF manuell festziehen | Skaliert plausibel zu 0,43 m Länge → gutes Referenzmodell für „Long Pin“ |
| Bootsklampe.STP | 1 144 × 1 627 × 441 mm | Massive Bootsklampe mit Sockel | Edge-Mount Cleat (PDF Abschnitt „Cleat mounting“) | Sehr großes Modell, vermutlich Sockelplatte + Schrauben – ggf. neu skalieren |
| Doppelelement.STP | 1 516 × 3 362 × 831 mm | Mehrere Floats als Block (vermutlich 2×3) | Fertige Ponton-Sektion | Sinnvoll als Referenz für Layouts, aber zu schwer für Runtime; eher für CAD |
| Doppelpoller.STP | 750 × 809 × 550 mm | Poller mit zwei Pfosten | Mooring / Heavy tying point | Gutes Zubehör; müsste über Edge-Connector montiert werden |
| Doppelschwimmer.STP | 1 074 × 575 × 402 mm | Doppel-Schwimmkörper | Größeres Auftriebselement | Abmessungen passen (~1,07 × 0,57 × 0,40 m) → direkt nutzbar |
| Einzelelement niedrig.STP | 605 × 605 × 402 mm | Einzelmodul niedrige Bauhöhe | Standard 0,5×0,5 Float | Dient als genauer Referenzkörper; konvertieren für Material-Update |
| Einzelelement flach.STP | 934 × 943 × 402 mm | Flaches Einzelmodul (vermutlich 1×1 m) | Alternative Deckelement | Sinnvoll für Varianten (z. B. Stage) |
| Einzelelement.STP | 1 887 × 2 837 × 623 mm | Größere Einheit (evtl. 3×5 Kombination) | Vormontierte Plattform | Für Runtime zu groß → als Referenz/Schnellaufbau |
| Pfosten.STP | 940 × 2 455 × 1 535 mm | Allgemeiner Pfosten (Steg etc.) | Befestigung von Zubehör (z. B. Geländer, Banner) | Prüfen, ob redundante Inhalte mit Geländerpfosten |
| Verbinder.STP | 271 × 826 × 141 mm | Mechanischer Verbinder (wahrscheinlich Edge-Variante) | gem. PDF: wird mit Distanzscheiben + Mutternschlüssel montiert | Wertvoll für Long/Edge connector Visualisierung |

## Bewertung & Empfehlungen

1. **Konvertierbare Assets** – Alle STEP-Dateien lassen sich mit dem neuen Script `python3 tools/convert_step.py` direkt in STL überführen (nutzt `cadquery-ocp`/OpenCascade). Optional können wir sie anschließend via Blender o. Ä. weiter nach GLB/OBJ konvertieren. Kundenseitig wäre es weiterhin ideal, finale GLB/OBJ bereitzustellen.  
2. **Prioritäten**
   1. **Einzelmodule (Einzel niedrig / Doppelschwimmer / Verbinder / Bolzen / Distanzscheiben)** – Diese sind unmittelbar relevant für die Runtime, weil sie vorhandene Funktionen (Pontonplatzierung, Connector-Visualisierung, Leiter- & Zubehörsystem) verbessern. 
   2. **Zubehör (Bootsklampe, Doppelpoller, Geländerpfosten)** – Für das nächste Zubehör-Feature (Cleat, Poller, Railings). Hierzu sollten Montagepunkte definiert werden (welche Randverbinder/Löcher werden genutzt). 
   3. **Komplette Baugruppen (500x500, Einzelelement, Doppelelement)** – wertvoll als Referenz oder Schnellaufbau im CAD, weniger für instanzielles Rendering. Optional können wir daraus Normteile extrahieren. 
3. **Nächste Schritte**
   - Kunden Feedback: Bitte zusätzlich zu den STEP-Dateien exportierte OBJ/FBX/GLB-Versionen bereitstellen (ggf. gleiche Maßstäbe). 
   - Interne Pipeline: Wenn wir regelmäßig STEP erhalten, lohnt sich ein Skript mit `pythonOCC` oder FreeCAD Headless zur automatischen Konvertierung. 
   - Slot-/Montage-Definition: Für Geländer, Cleats, Poller definieren, welche Ponton-Löcher & Distanzscheiben benötigt werden (siehe PDF, Abschnitte zu Edge Connectors & Zubehör). 
   - Material-/Skalierungstest: Nach Konvertierung in Blender die realen Maße prüfen (expected ~500 mm pro Ponton). Bei Abweichungen (z. B. 500x500.STP) ggf. Normierung auf 1.0 für Engine (Skalierungsfaktor dokumentieren).
