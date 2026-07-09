/**
 * Skularistool — Erschaffungsassistent (geführte Erstellung)
 * Bildschirm-Menüs: Spezies -> Kultur -> Profession. Eingabetaste wählt und geht
 * direkt weiter, Escape ist zurück, jeder Schritt hat "überspringen".
 *
 * Idempotent: Auswahlen werden gemerkt und der Charakter wird aus Basis
 * (Name + Start-EP) plus allen gemerkten Paketen neu berechnet. So verdoppelt
 * sich nichts, auch wenn man neu wählt.
 *
 * Jeder Eintrag trägt als Detail eine automatische Zusammenfassung des Pakets
 * (Attribute, Vorteile, Fertigkeiten, Talente, EP) — sichtbar für Sehende,
 * per Shift+Pfeil-runter hörbar für Blinde.
 */
import * as editor from './editor.js';
import * as screen from '../ui/screen.js';
import { menuScreen } from '../ui/menu-screen.js';
import * as sprache from '../sprache.js';
import { parse } from '../core/sephrasto-xml.js';
import { mergePaket } from '../core/paket.js';
import { createCharakter } from '../core/character.js';
import { gesamtEP } from '../core/regeln.js';

const ipc = window.skularis?.ipc;
const NAECHSTE = { Spezies: 'Kultur', Kultur: 'Profession', Profession: null };

let startName = '';
let startEP = 0;
let wahl = {};
const paketCache = {};

async function ladePaket(pfad) {
  if (paketCache[pfad]) return paketCache[pfad];
  const res = await ipc.paketLaden(pfad);
  const p = parse(res.inhalt, editor.getDb());
  paketCache[pfad] = p;
  return p;
}

function fasseZusammen(paket) {
  const db = editor.getDb();
  const t = [];
  const a = Object.entries(paket.attribute || {}).filter(([, v]) => v)
    .map(([k, v]) => `${k} ${v > 0 ? 'plus ' : ''}${v}`);
  if (a.length) t.push('Attribute: ' + a.join(', '));
  const v = (paket.vorteile || []).map(x => (typeof x === 'string' ? x : x.name));
  if (v.length) t.push('Vorteile: ' + v.join(', '));
  const f = Object.entries(paket.fertigkeiten || {}).filter(([, fe]) => fe.wert > 0)
    .map(([n, fe]) => `${n} ${fe.wert}`);
  if (f.length) t.push('Fertigkeiten: ' + f.join(', '));
  const tal = [];
  for (const fe of Object.values(paket.fertigkeiten || {})) tal.push(...(fe.talente || []));
  for (const ue of Object.values(paket.uebernatuerlich || {})) tal.push(...(ue.talente || []));
  if (tal.length) t.push('Talente: ' + [...new Set(tal)].join(', '));
  t.push(`Kostet ${gesamtEP(paket, db).total} EP`);
  return t.join('. ');
}

async function rebuild() {
  const db = editor.getDb();
  const base = createCharakter(db, { name: startName, gesamtEP: startEP });
  for (const kat of ['Spezies', 'Kultur', 'Profession']) {
    const w = wahl[kat];
    if (w) mergePaket(base, await ladePaket(w.pfad), kat, w.name);
  }
  editor.setChar(base);
}

function weiter(kategorie) {
  const n = NAECHSTE[kategorie];
  if (n) zeigeSchritt(n);
  else editor.oeffneHub();
}

async function waehle(kategorie, info) {
  wahl[kategorie] = { pfad: info.pfad, name: info.name };
  await rebuild();
  const frei = editor.aktualisiere();
  sprache.sage(`${info.name} gewählt. ${frei} EP frei.`);
  weiter(kategorie);
}

async function zeigeSchritt(kategorie) {
  let liste = [];
  try { liste = await ipc.paketeListe(kategorie); } catch { liste = []; }

  const items = liste.map(p => {
    // Ordner-Präfix "7 - " entfernen, sonst liest NVDA "sieben minus".
    const gruppe = p.gruppe ? p.gruppe.replace(/^\s*\d+\s*[-–]\s*/, '').trim() : '';
    return {
      label: gruppe ? `${gruppe}: ${p.name}` : p.name,
      detail: async () => fasseZusammen(await ladePaket(p.pfad)),
      onSelect: () => waehle(kategorie, p),
    };
  });
  items.push({
    label: `${kategorie} überspringen`,
    detail: 'Ohne Auswahl weiter.',
    onSelect: () => weiter(kategorie),
  });

  screen.replace(menuScreen({
    title: `${kategorie} wählen`,
    subtitle: 'Eingabetaste wählt und geht weiter. Shift und Pfeil-runter liest Details. Escape ist zurück.',
    items,
  }));
}

export async function starteAssistent() {
  const c = editor.getChar();
  startName = c.name;
  startEP = c.erfahrung.gesamt;
  wahl = {};
  await zeigeSchritt('Spezies');
}
