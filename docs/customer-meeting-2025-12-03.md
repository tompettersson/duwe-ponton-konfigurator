# Kundenmeeting 2025-12-03 — Anforderungen → Umsetzungsplan

Quelle: Meeting-Transkript (Robert Duwe & Boris Kube), 3. Dez. 2025, 10:05 CET.

## Zielbild (aus Kundensicht)
- Bessere Standardansichten (CAD-ähnliche Draufsicht/Seite/Hinten etc.)
- Keine Debug-Infos für Anwender
- Verbindungsbolzen/Verbinder-Farbwahl auf Blau/Schwarz/Grau (Sand entfernen)
- Multi-Drop: markierter Bereich muss sichtbar sein
- Randverbinder schnell (de-)aktivierbar
- Wasseroberfläche zuschaltbar
- Showcase als „Katalog“: Auto-Ansicht/Fit, Auswahl per Klick/Dropdown, Rollen (Admin/User)
- Korrekte Artikelzählung (v.a. Doppeldistanzscheiben)
- Arbeitsflächengröße nachträglich änderbar
- Export: Materialliste + visuelle Konfiguration
- Speichern/Weitergeben komplexer Anlagen
- Fehlende Artikel ergänzen; optional Kette zwischen zwei Schienen visualisieren
- Flutschraube nicht in Materialliste

## Produktanforderung (intern, bestätigt)
Das aktuelle Login ist nur Preview. Ziel ist ein echtes System mit:
- Kunden-Accounts: Konfigurationen erstellen, speichern, laden, teilen
- Admin-Accounts (Duwe & Partner): Kunden/Projekte administrieren, Inhalte/Showcase steuern
- Persistenz über Datenbank (voraussichtlich Postgres)

## Abgleich mit aktuellem Repo (Ist-Stand)
- Login: clientseitig `duwe/preview` (`app/components/LoginOverlay.tsx`)
- Debug-UI: Debug-Panel per Env-Flag, „Edge Debug“ aktuell immer sichtbar (`app/components/NewPontoonConfigurator.tsx`)
- Farben: Pontons bieten aktuell auch „Sand“ (`app/lib/domain/PontoonTypes.ts` + Toolbar in `app/components/NewPontoonConfigurator.tsx`)
- Verbinder-Farbe: aktuell fix blau im Renderer (`app/lib/ui/RenderingEngine.ts`)
- Multi-Drop-Preview: Positionen werden berechnet, visuelle Markierung hängt aber an Debug-Overlay (`app/components/NewPontoonConfigurator.tsx`)
- Materialliste: existiert, zählt Edge-Washer über `connectorPlanner`-Spacers; Drain-/Flutschraube wird pro Ponton gelistet (`app/lib/application/materialSummary.ts`)
- Showcase: Dev-Showcase an Bühnenkante mit Toggle, aber ohne Auto-Kamera-Fit/Rollenfilter/Katalog-UI (`app/lib/ui/RenderingEngine.ts`, `app/lib/ui/showcaseAssets.ts`)
- Grid: Domain ist serialisierbar (`Grid.toJSON/fromJSON`), aber keine UI für Save/Load/Resize (`app/lib/domain/Grid.ts`)

## Roadmap (Etappen)

### Phase 1 — Demo/UX-Blocker (P0)
- Debug für User weg (UI + Console)
- Sand entfernen (Farbpalette)
- Multi-Drop Fläche/Preview sichtbar
- Materialliste: Flutschraube raus; Doppeldistanzscheiben-Zählung korrekt + Test
- Randverbinder Toggle (mind. visuell)

### Phase 2 — Bedienung (P1)
- „Ansichten“-Sektion mit Standard-View-Presets (Draufsicht, links/rechts, vorne/hinten, ggf. Iso)
- Wasseroberfläche Toggle (ohne Interaktionsprobleme)
- Showcase: Auto-Zoom/Fit beim Aktivieren (Grid + Showcase sichtbar)

### Phase 3 — Plattform (P2)
- Auth + Rollen (Kunde/Admin) inkl. Mandantenfähigkeit (Kunden sehen nur eigene Projekte)
- Persistenz: Projekte/Konfigurationen speichern & laden (DB)
- Admin-UI: Projekte/Kunden verwalten, Berechtigungen steuern

### Phase 4 — Produktisierung (P3)
- Arbeitsfläche nachträglich vergrößern (Dropdown, expand-only oder mit Validierungsdialog)
- Export: Materialliste (Copy/Print) + Screenshot/PDF
- Save/Load (lokal) + optional Share-Code (Backend-Entscheidung)

### Phase 5 — Content (P4)
- Fehlende Artikel beschaffen/konvertieren/einbinden (Assets, Montagepunkte, Regeln)
- Ketten-Visualisierung zwischen Schienen (benötigt Schienen-Placement + Befestigungspunkte)

## Backlog (To‑Do mit Akzeptanzkriterien)

### P0 — Blocker
- [ ] Preview/Debug-Trennung (bis echte Auth live ist)
  - AK: In „Kundenmodus“ sind Debug-Overlays/Debug-Buttons aus; in Dev/Admin weiterhin verfügbar.
- [ ] Debug entfernen/abschalten für User
  - AK: Kein „Debug Info“-Panel/„Edge Debug“-Button sichtbar für User; Logs reduziert (kein spam).
- [ ] Sand entfernen (Pontons + Hardware-Farbwahl auf Blau/Schwarz/Grau)
  - AK: Toolbar bietet nur Blau/Schwarz/Grau; keine „Sand“-Option.
- [ ] Verbinder/„Bolzen“-Farbe auswählbar (Blau/Schwarz/Grau)
  - AK: Renderer färbt Verbinder entsprechend; Materialliste trennt Farben nur, wenn gefordert (offen).
- [ ] Multi-Drop: Drag-Area sichtbar
  - AK: Beim Ziehen ist markierter Bereich sichtbar; ideal: Valid/Invalid farblich getrennt.
- [ ] Materialliste: Flutschraube entfernen + Doppeldistanzscheiben korrekt zählen
  - AK: Kein „Drain-/Flutschraube“-Eintrag; Washer-Counts stimmen gegen definierte Szenarien; Test vorhanden.
- [ ] Randverbinder Toggle
  - AK: Checkbox blendet Edge-Hardware visuell aus/ein; optional: wirkt auf BOM (Entscheidung offen).

### P1 — Bedienung
- [ ] Standardansichten („Ansichten“-Sektion)
  - AK: Buttons setzen Kamera/Controls reproduzierbar (Top/Left/Right/Front/Back/Iso).
- [ ] Wasseroberfläche Toggle
  - AK: Wasserfläche ein/aus ohne Raycast/Placement zu brechen (ggf. `raycast` ignorieren).
- [ ] Showcase Auto-Fit
  - AK: Beim Aktivieren ist Grid+Showcase komplett im View; beim Deaktivieren Rückkehr zur vorherigen Ansicht.

### P2 — Produktisierung
- [ ] Auth + Datenbank (Kunde/Admin, Projekte speichern/laden)
  - AK: Kunden können Projekte anlegen, speichern, laden (DB); Admin kann Projekte/Kunden verwalten.
- [ ] Rollen & Berechtigungen im Showcase/Katalog
  - AK: Items sind nach Profil (Admin/User/Kunde) filterbar; nicht freigegebene Artikel bleiben verborgen.
- [ ] Showcase als Katalog (Dropdown/Kategorien, Klick selektiert platzierbares Objekt)
  - AK: Auswahl im Showcase setzt „aktives Objekt“; Platzieren möglich; Rollenfilter greift.
- [ ] Arbeitsflächengröße nachträglich ändern
  - AK: Resize erhält vorhandene Platzierungen; Validierung/UX bei Schrumpfen geklärt.
- [ ] Export
  - AK: Materialliste kopier-/druckbar; visuelles Exportformat (Screenshot/PDF) verfügbar.
- [ ] Speichern/Laden
  - AK: Lokales Save/Load (z.B. LocalStorage/Datei) basiert auf `Grid.toJSON/fromJSON`.
  - Optional: Share-Code/Server-Speicher (separat entscheiden).

### P3 — Content
- [ ] Fehlende Artikel-Liste prüfen & umsetzen
  - Badeleiter, Stahlrandschiene, Kunststoffklampen, Außenborderhalterung, Bugelement, Verankerungshalter,
    Abspannse M12/M20, PE/PU Randschiene (Quelle/Export/Conversion klären).
- [ ] Kette zwischen Schienen visualisieren
  - AK: Kette wird optisch auf Pontonseite zwischen zwei Schienen gezeigt (Länge parametrisierbar).

## Offene Fragen an Kunde (für Priorisierung/Scope)
- Verbinder-Farbe: globales Setting oder pro Teil/Artikel? Muss BOM farbgetrennt sein?
- Randverbinder-Toggle: nur visuell oder auch aus Materialliste/BOM entfernen?
- „Vorne/Hinten/Links/Rechts“: welche Achsen-/Orientierungsdefinition gilt im Projekt?
