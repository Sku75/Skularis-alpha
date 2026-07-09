/**
 * Headless-Verifikation der Rechen-Engine gegen echte Sephrasto-Charaktere.
 * Temporär — nach Gebrauch löschen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { transformDb } from '../renderer/js/core/db.js';
import { gesamtEP } from '../renderer/js/core/regeln.js';

const BETA = process.cwd();
const SEPH = 'C:/SkuAIBubble/02 Datenbank/Projekte Ideen Sammelordner/Projekt Skularis/Archiv/Vorlagen/Sephrasto_v4.1.0/Sephrasto/Data';

const dbParser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '_text',
  processEntities: { maxTotalExpansions: 100000, maxExpandedLength: 5000000 },
  isArray: (n) => ['Attribut','AbgeleiteterWert','Energie','Vorteil','Fertigkeit','Talent',
    'ÜbernatürlicheFertigkeit','FreieFertigkeit','Waffe','Waffeneigenschaft','Rüstung','Regel','Einstellung'].includes(n),
});
const charParser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '_text',
  isArray: (n) => ['Vorteil','Fertigkeit','Talent','FreieFertigkeit','ÜbernatürlicheFertigkeit','Rüstung','Waffe','Ausrüstungsstück'].includes(n),
});

const db = transformDb(dbParser.parse(fs.readFileSync(path.join(BETA, 'daten/datenbank.xml'), 'utf-8')));

function talentNamen(container) {
  const t = container && container.Talente;
  if (!t || typeof t !== 'object' || !t.Talent) return [];
  return t.Talent.map(x => x.name).filter(Boolean);
}

function baueCharakter(xml) {
  const c = charParser.parse(xml).Charakter;
  const char = { attribute: {}, vorteile: [], fertigkeiten: {}, uebernatuerlich: {}, energien: {}, freieFertigkeiten: [] };

  char.heimat = (c.Beschreibung && c.Beschreibung.Heimat) ? String(c.Beschreibung.Heimat) : '';

  const at = c.Attribute || {};
  for (const k of ['KO','MU','GE','KK','IN','KL','CH','FF']) char.attribute[k] = parseInt(at[k], 10) || 0;

  char.vorteile = (c.Vorteile && c.Vorteile.Vorteil) ? c.Vorteile.Vorteil.map(v => {
    if (typeof v === 'object') {
      const name = v._text;
      if (v.variableKosten !== undefined) return { name, kosten: parseInt(v.variableKosten, 10) || 0 };
      return name;
    }
    return v;
  }).filter(x => x && (typeof x === 'string' ? x : x.name)) : [];

  const fert = c.Fertigkeiten || {};
  for (const f of (fert.Fertigkeit || [])) {
    char.fertigkeiten[f.name] = { wert: parseInt(f.wert, 10) || 0, talente: talentNamen(f) };
  }
  for (const ff of (fert.FreieFertigkeit || [])) {
    char.freieFertigkeiten.push({ name: ff.name || '', wert: parseInt(ff.wert, 10) || 0 });
  }

  const uf = c['ÜbernatürlicheFertigkeiten'] || {};
  for (const u of (uf['ÜbernatürlicheFertigkeit'] || [])) {
    char.uebernatuerlich[u.name] = { wert: parseInt(u.wert, 10) || 0, talente: talentNamen(u) };
  }

  const en = c.Energien || {};
  for (const k of ['AsP','KaP','GuP']) {
    if (en[k]) char.energien[k] = { gekauft: parseInt(en[k].wert, 10) || 0 };
  }

  const ausgegeben = parseInt(c.Erfahrung?.Ausgegeben, 10) || 0;
  return { char, ausgegeben };
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

const dateien = alleXml(path.join(SEPH, 'CharakterAssistent/Ilaris'));
let treffer = 0, gesamt = 0;
const abweichungen = [];

for (const datei of dateien) {
  const { char, ausgegeben } = baueCharakter(fs.readFileSync(datei, 'utf-8'));
  if (ausgegeben === 0) continue;
  gesamt++;
  const b = gesamtEP(char, db);
  if (b.total === ausgegeben) treffer++;
  else abweichungen.push({ name: path.basename(datei), berechnet: b.total, gespeichert: ausgegeben, diff: b.total - ausgegeben, b });
}

console.log(`\nTREFFER: ${treffer} / ${gesamt} Charaktere exakt\n`);
for (const a of abweichungen.slice(0, 15)) {
  console.log(`✗ ${a.name}: berechnet ${a.berechnet}, gespeichert ${a.gespeichert} (diff ${a.diff})`);
  console.log(`   attr ${a.b.attribute}, vort ${a.b.vorteile}, fert ${a.b.fertigkeiten}, tal ${a.b.talente}, uf ${a.b.uebernat}, ufTal ${a.b.uebernatTalente}, en ${a.b.energien}, frei ${a.b.freie}`);
}
if (abweichungen.length > 15) console.log(`... und ${abweichungen.length - 15} weitere Abweichungen`);
