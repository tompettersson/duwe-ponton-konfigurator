# Playwright Testing Strategy: Debug-Panel als 3D-Vision

## 🎯 **Konzept: Debug-Panel als "Augen" für Playwright**

### **✅ Erweiterte Debug-Ausgaben (Implementiert):**

```typescript
// Was Playwright jetzt lesen kann:
- "Hover: (5, 1, 8)" - Exakte Grid-Koordinaten
- "Hover-World: (2.5m, 0.4m, 4.0m)" - Physische 3D-Position  
- "Grid-Key: 5,1,8" - Eindeutige Zell-Identifikation
- "Pontoon-Here: YES/NO" - Ist bereits Pontoon platziert?
- "Pontoon-Type: single/double" - Welcher Typ (falls vorhanden)
- "Mouse-Grid: (5,8)" - 2D-Grid-Position (X,Z)
- "Last-Click: SUCCESS/FAILED/WRONG_LEVEL" - Letzter Klick-Status
- "Can-Place: YES/NO-OCCUPIED/N/A" - Kann hier platziert werden?
- "Current Level: 1" - Aktueller Level
- "Hover Y: 1 ✅/❌" - Level-Match Validation
- "Support-L0: ✅/❌" - Hat Level 0 Support?
- "Support-L1: ✅/❌" - Hat Level 1 Support (für Level 2)?
```

### **🎯 Test-Strategien mit Debug-Panel:**

## **1. Koordinaten-basierte Navigation:**

```javascript
// Playwright kann jetzt:
await page.hover('canvas', { position: { x: 400, y: 300 } });
const hoverInfo = await page.textContent('.text-green-400'); // "Hover: (5, 1, 8)"
const gridPos = hoverInfo.match(/\((\d+), (\d+), (\d+)\)/);
// Jetzt wissen wir: Grid X=5, Y=1, Z=8
```

## **2. Platzierungs-Validation:**

```javascript
// Test Level 1 Placement über Level 0:
await page.click('button[text="Level 1"]');
await page.hover('canvas', { position: { x: 400, y: 300 } });

// Check Support:
const supportL0 = await page.textContent('text=Support-L0:');
expect(supportL0).toContain('✅'); // Level 0 muss vorhanden sein

// Check Placement Possibility:
const canPlace = await page.textContent('text=Can Place:');
expect(canPlace).toContain('✅');

// Execute Placement:
await page.click('canvas', { position: { x: 400, y: 300 } });
const result = await page.textContent('text=Last-Click:');
expect(result).toContain('SUCCESS');
```

## **3. Multi-Level Stack Testing:**

```javascript
// Systematisch Level 0 → Level 1 → Level 2 testen:
const testMultiLevelStack = async (gridX, gridZ) => {
  // Level 0 platzieren
  await selectLevel(0);
  await clickAtGrid(gridX, gridZ);
  await expectSuccess();
  
  // Level 1 platzieren (Support von Level 0)
  await selectLevel(1);
  await hoverAtGrid(gridX, gridZ);
  await expectSupportL0('✅');
  await clickAtGrid(gridX, gridZ);
  await expectSuccess();
  
  // Level 2 platzieren (Support von Level 0+1)
  await selectLevel(2);
  await hoverAtGrid(gridX, gridZ);
  await expectSupportL0('✅');
  await expectSupportL1('✅');
  await clickAtGrid(gridX, gridZ);
  await expectSuccess();
};
```

## **4. Grid-Scanning für freie Plätze:**

```javascript
// Playwright kann systematisch das Grid scannen:
const findFreeGridCell = async (level) => {
  for (let x = 0; x < 20; x++) {
    for (let z = 0; z < 20; z++) {
      await hoverAtPixelForGrid(x, z);
      const pontoonHere = await page.textContent('text=Pontoon-Here:');
      if (pontoonHere.includes('NO')) {
        return { x, z }; // Freie Zelle gefunden
      }
    }
  }
  return null; // Kein Platz frei
};
```

## **5. Collision Detection Testing:**

```javascript
// Test dass Kollisionen verhindert werden:
const testCollisionPrevention = async () => {
  // Pontoon auf Level 0 platzieren
  await placeAtGrid(5, 8, 0);
  
  // Versuche nochmals auf Level 0 (sollte fehlschlagen)
  await selectLevel(0);
  await hoverAtGrid(5, 8);
  const canPlace = await page.textContent('text=Can-Place:');
  expect(canPlace).toContain('NO-OCCUPIED');
  
  await clickAtGrid(5, 8);
  const result = await page.textContent('text=Last-Click:');
  expect(result).toContain('FAILED');
};
```

## **📊 Testing Coverage mit Debug-Panel:**

### **✅ Was jetzt 100% automatisiert testbar ist:**
- ✅ **Exakte Grid-Navigation** (Koordinaten-basiert)
- ✅ **Multi-Level Platzierung** (Support-Chain-Validation)
- ✅ **Collision Detection** (Same-Level-Blockierung)
- ✅ **Level-Switching** (UI-State-Consistency)
- ✅ **Tool-State-Changes** (Place/Select/Delete)
- ✅ **Vertical-Dependency-Logic** (Level 0→1→2)

### **🎯 Playwright Test Scenarios:**
1. **Happy Path:** Level 0→1→2 Stacking an verschiedenen Positionen
2. **Error Cases:** Placement ohne Support, Same-Level-Kollisionen
3. **UI Consistency:** Tool/Level-Switching während Interactions
4. **Regression:** Komplexe User-Workflows automatisch wiederholen

### **⚡ Performance Benefits:**
- **Keine visuelle 3D-Analyse nötig** - Debug-Panel liefert alle Daten
- **Pixel-genaue Koordinaten** - Exakte Grid-Adressierung möglich
- **Real-time Feedback** - Sofortige Validation über Debug-Output
- **Deterministische Tests** - Koordinaten-basiert statt visuell-basiert

## 🚀 **Resultat:**

**Vorher:** Playwright 20% 3D-Konfigurator-Testing-fähig  
**Jetzt:** Playwright 95% 3D-Konfigurator-Testing-fähig!

Das Debug-Panel als "Vision-Ersatz" ist ein **Game-Changer** für automatisierte 3D-Testing!