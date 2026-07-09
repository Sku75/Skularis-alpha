/**
 * Rundlauf-Test: echten Sephrasto-Charakter einlesen → in mein Modell →
 * serialisieren → erneut einlesen → EP müssen exakt gleich bleiben.
 * Prüft, dass der XML-Serializer Sephrasto-konform und verlustfrei ist.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { transformDb } from '../renderer/js/core/db.js';
import { gesamtEP } from '../renderer/js/core/regeln.js';
import { serialisiere } from '../renderer/js/core/sephrasto-xml.js';

const BETA = process.cwd();
const SEPH = 'C:/SkuAIBubble/02 Datenbank/Projekte Ideen Sammelordner/Projekt Skularis/Archiv/Vorlagen/Sephrasto_v4.1.0/Sephrasto/Data';

const P = { ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '_text' };
const dbParser = new XMLParser({ ...P, processEntities: { maxTotalExpansions: 100000, maxExpandedLength: 5000000 },
  isArray: (n) => ['Attribut','AbgeleiteterWert','Energie','Vorteil','Fertigkeit','Talent','ÜbernatürlicheFertigkeit','FreieFertigkeit','Waffe','Waffeneigenschaft','Rüstung','Regel','Einstellung'].includes(n) });
const charParser = new XMLParser({ ...P,
  isArray: (n) => ['Vorteil','Fertigkeit','Talent','FreieFertigkeit','ÜbernatürlicheFertigkeit','Rüstung','Waffe','Ausrüstungsstück'].includes(n) });

const db = transformDb(dbParser.parse(fs.readFileSync(path.join(BETA, 'daten/datenbank.xml'), 'utf-8')));

const talN = (cont) => (cont && cont.Talente && typeof cont.Talente === 'object' && cont.Talente.Talent)
  ? cont.Talente.Talent.map(x => x.name).filter(Boolean) : [];

function baue(xml) {
  const c = charParser.parse(xml).Charakter;
  const char = { attribute: {}, vorteile: [], fertigkeiten: {}, uebernatuerlich: {}, energien: {}, freieFertigkeiten: [],
    heimat: (c.Beschreibung && c.Beschreibung.Heimat) ? String(c.Beschreibung.Heimat) : '',
    finanzen: (c.Beschreibung && c.Beschreibung.Finanzen != null) ? parseInt(c.Beschreibung.Finanzen, 10) : 2,
    name: (c.Beschreibung && c.Beschreibung.Name) ? String(c.Beschreibung.Name) : '',
    spezies: '', status: 2, kurzbeschreibung: '',
    erfahrung: { gesamt: 0, ausgegeben: 0 } };
  const at = c.Attribute || {};
  for (const k of ['KO','MU','GE','KK','IN','KL','CH','FF']) char.attribute[k] = parseInt(at[k], 10) || 0;
  char.vorteile = (c.Vorteile && c.Vorteile.Vorteil) ? c.Vorteile.Vorteil.map(v => {
    if (typeof v === 'object') { const name = v._text; return v.variableKosten !== undefined ? { name, kosten: parseInt(v.variableKosten, 10) || 0, kommentar: v.kommentar || '' } : name; }
    return v;
  }).filter(x => x && (typeof x === 'string' ? x : x.name)) : [];
  for (const f of (c.Fertigkeiten?.Fertigkeit || [])) char.fertigkeiten[f.name] = { wert: parseInt(f.wert, 10) || 0, talente: talN(f) };
  for (const ff of (c.Fertigkeiten?.FreieFertigkeit || [])) char.freieFertigkeiten.push({ name: ff.name || '', wert: parseInt(ff.wert, 10) || 0 });
  for (const u of (c['ÜbernatürlicheFertigkeiten']?.['ÜbernatürlicheFertigkeit'] || [])) char.uebernatuerlich[u.name] = { wert: parseInt(u.wert, 10) || 0, talente: talN(u) };
  for (const k of ['AsP','KaP','GuP']) if (c.Energien && c.Energien[k]) char.energien[k] = { gekauft: parseInt(c.Energien[k].wert, 10) || 0 };
  return char;
}

function alleXml(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...alleXml(p));
    else if (e.name.endsWith('.xml')) out.push(p);
  }
  return out;
}

let ok = 0, gesamt = 0;
const fehler = [];
for (const datei of alleXml(path.join(SEPH, 'CharakterAssistent/Ilaris'))) {
  const original = baue(fs.readFileSync(datei, 'utf-8'));
  const ep1 = gesamtEP(original, db).total;
  if (ep1 === 0) continue;
  gesamt++;
  const xml2 = serialisiere(original, db);
  const wieder = baue(xml2);
  const ep2 = gesamtEP(wieder, db).total;
  if (ep1 === ep2) ok++;
  else fehler.push(`${path.basename(datei)}: ${ep1} -> ${ep2}`);
}
console.log(`\nRUNDLAUF: ${ok} / ${gesamt} verlustfrei\n`);
for (const f of fehler.slice(0, 15)) console.log('  ✗', f);
