/**
 * Integrationstest des Editor-Datenpfads (ohne DOM):
 * createCharakter -> Werte setzen -> neuberechne -> serialisiere ->
 * wieder einlesen -> EP müssen konsistent sein und die Datei Sephrasto-gültig.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { transformDb } from '../renderer/js/core/db.js';
import { gesamtEP } from '../renderer/js/core/regeln.js';
import { createCharakter, neuberechne, verfuegbareEP } from '../renderer/js/core/character.js';
import { serialisiere } from '../renderer/js/core/sephrasto-xml.js';

const BETA = process.cwd();
const dbParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '_text',
  processEntities: { maxTotalExpansions: 100000, maxExpandedLength: 5000000 },
  isArray: (n) => ['Attribut','AbgeleiteterWert','Energie','Vorteil','Fertigkeit','Talent','ÜbernatürlicheFertigkeit','FreieFertigkeit','Waffe','Waffeneigenschaft','Rüstung','Regel','Einstellung'].includes(n) });
const charParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '_text',
  isArray: (n) => ['Vorteil','Fertigkeit','Talent','FreieFertigkeit','ÜbernatürlicheFertigkeit','Rüstung','Waffe','Ausrüstungsstück'].includes(n) });
const db = transformDb(dbParser.parse(fs.readFileSync(path.join(BETA, 'daten/datenbank.xml'), 'utf-8')));

const talN = (c) => (c && c.Talente && typeof c.Talente === 'object' && c.Talente.Talent) ? c.Talente.Talent.map(x => x.name).filter(Boolean) : [];
function baue(xml) {
  const c = charParser.parse(xml).Charakter;
  const char = { attribute: {}, vorteile: [], fertigkeiten: {}, uebernatuerlich: {}, energien: {}, freieFertigkeiten: [],
    heimat: (c.Beschreibung && c.Beschreibung.Heimat) ? String(c.Beschreibung.Heimat) : '' };
  const at = c.Attribute || {};
  for (const k of ['KO','MU','GE','KK','IN','KL','CH','FF']) char.attribute[k] = parseInt(at[k], 10) || 0;
  char.vorteile = (c.Vorteile && c.Vorteile.Vorteil) ? c.Vorteile.Vorteil.map(v => typeof v === 'object' ? (v.variableKosten !== undefined ? { name: v._text, kosten: parseInt(v.variableKosten,10)||0 } : v._text) : v).filter(Boolean) : [];
  for (const f of (c.Fertigkeiten?.Fertigkeit || [])) char.fertigkeiten[f.name] = { wert: parseInt(f.wert,10)||0, talente: talN(f) };
  for (const ff of (c.Fertigkeiten?.FreieFertigkeit || [])) char.freieFertigkeiten.push({ name: ff.name||'', wert: parseInt(ff.wert,10)||0 });
  for (const u of (c['ÜbernatürlicheFertigkeiten']?.['ÜbernatürlicheFertigkeit'] || [])) char.uebernatuerlich[u.name] = { wert: parseInt(u.wert,10)||0, talente: talN(u) };
  for (const k of ['AsP','KaP','GuP']) if (c.Energien && c.Energien[k]) char.energien[k] = { gekauft: parseInt(c.Energien[k].wert,10)||0 };
  return { char, ausgegeben: parseInt(c.Erfahrung?.Ausgegeben, 10) || 0 };
}

let ok = true;
function pruefe(bed, text) { console.log((bed ? 'OK   ' : 'FEHLER ') + text); if (!bed) ok = false; }

// --- Charakter wie im Editor bauen ---
const c = createCharakter(db, { name: 'Testheld', gesamtEP: 2000 });
pruefe(Object.keys(c.fertigkeiten).length === 21, `createCharakter legt 21 Fertigkeiten an (${Object.keys(c.fertigkeiten).length})`);

c.attribute.KO = 4; c.attribute.MU = 6; c.attribute.GE = 3; c.attribute.KK = 4; c.attribute.KL = 2;
c.vorteile.push('Zauberer I');
c.fertigkeiten['Klingenwaffen'].wert = 6;
c.fertigkeiten['Klingenwaffen'].talente.push('Einhandklingenwaffen');
c.uebernatuerlich['Antimagie'] = { wert: 0, talente: [] };

const b = neuberechne(c, db);
console.log(`\nBerechnete EP: ausgegeben ${c.erfahrung.ausgegeben}, frei ${verfuegbareEP(c)}`);
console.log(`  attr ${b.attribute}, vort ${b.vorteile}, fert ${b.fertigkeiten}, tal ${b.talente}`);

// Serialisieren + wieder einlesen
const xml = serialisiere(c, db);
pruefe(xml.includes('<Charakter>') && xml.includes('<DatenbankVersion>3</DatenbankVersion>'), 'Serialisierung ist Sephrasto-XML');
const { char: c2 } = baue(xml);
const ep2 = gesamtEP(c2, db).total;
pruefe(ep2 === c.erfahrung.ausgegeben, `EP nach Serialisieren+Einlesen konsistent (${c.erfahrung.ausgegeben} -> ${ep2})`);
pruefe(c2.vorteile.includes('Zauberer I'), 'Vorteil Zauberer I erhalten');
pruefe(c2.fertigkeiten['Klingenwaffen'].talente.includes('Einhandklingenwaffen'), 'Talent erhalten');

console.log('\n' + (ok ? 'INTEGRATION OK' : 'INTEGRATION FEHLGESCHLAGEN'));
