/**
 * Skularistool — Charakter-Datenmodell (Sephrasto-kompatibel)
 * Reine Datenstruktur + Fabrik + Neuberechnung. Die EP-/Werte-Logik liegt
 * in regeln.js; das Lesen/Schreiben der .xml in sephrasto-xml.js.
 */

import { gesamtEP, abgeleiteteWerte } from './regeln.js';

export const ATTRIBUTE = ['KO', 'MU', 'GE', 'KK', 'IN', 'KL', 'CH', 'FF'];

/**
 * Neuen, leeren Charakter erzeugen. Initialisiert alle profanen Fertigkeiten
 * auf 0 (wie Sephrasto) und die Energien AsP/KaP.
 */
export function createCharakter(db, opts = {}) {
  const c = {
    // Beschreibung
    name: opts.name || '',
    spezies: '',
    heimat: 'Mittelreich',
    finanzen: 2,           // 0 Sehr Reich .. 2 Normal .. 4 Sehr Arm
    status: 2,
    kurzbeschreibung: '',
    schipBonus: 0,         // durch Vorteile (Glück) modifiziert

    // Werte
    attribute: Object.fromEntries(ATTRIBUTE.map(a => [a, 0])),
    vorteile: [],          // string | { name, kosten, kommentar }
    fertigkeiten: {},      // name -> { wert, talente: [] }
    uebernatuerlich: {},   // name -> { wert, talente: [] }
    energien: { AsP: { gekauft: 0 }, KaP: { gekauft: 0 } },
    freieFertigkeiten: [], // { name, wert, kategorie }

    // Objekte
    waffen: [],
    ruestungen: [],
    ausruestung: [],

    // Erfahrung
    erfahrung: { gesamt: opts.gesamtEP || 0, ausgegeben: 0 },

    // Datei
    dateiname: opts.dateiname || null,
  };

  if (db) {
    for (const f of db.fertigkeiten) c.fertigkeiten[f.name] = { wert: 0, talente: [] };
  }
  return c;
}

/** Ausgegebene EP neu berechnen und im Charakter ablegen. Gibt die Aufschlüsselung zurück. */
export function neuberechne(c, db) {
  const b = gesamtEP(c, db);
  c.erfahrung.ausgegeben = b.total;
  // Energie-Basis + SchiP-Bonus aus Vorteil-Skripten aktualisieren
  aktualisiereVorteilEffekte(c, db);
  return b;
}

export function verfuegbareEP(c) {
  return (c.erfahrung.gesamt || 0) - (c.erfahrung.ausgegeben || 0);
}

export function werte(c) {
  return abgeleiteteWerte(c);
}

/**
 * Wertet die Skripte der gewählten Vorteile aus (modifyAsPBasis, modifyKaPBasis,
 * modifyGuPBasis, modifySchiP, modifyRS) und legt Basiswerte im Charakter ab.
 */
export function aktualisiereVorteilEffekte(c, db) {
  let aspBasis = 0, kapBasis = 0, gupBasis = 0, schipBonus = 0, rsMod = 0;
  for (const eintrag of c.vorteile) {
    const name = typeof eintrag === 'string' ? eintrag : eintrag.name;
    const v = db.vorteilByName[name];
    if (!v || !v.script) continue;
    let m;
    if ((m = v.script.match(/modifyAsPBasis\((\d+)\)/))) aspBasis += parseInt(m[1], 10);
    if ((m = v.script.match(/modifyKaPBasis\((\d+)\)/))) kapBasis += parseInt(m[1], 10);
    if ((m = v.script.match(/modifyGuPBasis\((\d+)\)/))) gupBasis += parseInt(m[1], 10);
    if ((m = v.script.match(/modifySchiP\((\d+)\)/))) schipBonus += parseInt(m[1], 10);
    if ((m = v.script.match(/modifyRS\((\d+)\)/))) rsMod += parseInt(m[1], 10);
  }
  if (c.energien.AsP) c.energien.AsP.basis = aspBasis;
  if (kapBasis && !c.energien.KaP) c.energien.KaP = { gekauft: 0 };
  if (c.energien.KaP) c.energien.KaP.basis = kapBasis;
  if (gupBasis) { c.energien.GuP = c.energien.GuP || { gekauft: 0 }; c.energien.GuP.basis = gupBasis; }
  c.schipBonus = schipBonus;
  c.rsMod = rsMod;
}

/** Ob der Charakter zaubern kann (für Anzeige des Übernatürlich-Bereichs). */
export function istZauberer(c, db) {
  return c.vorteile.some(v => {
    const n = typeof v === 'string' ? v : v.name;
    return n === 'Zauberer I' || n === 'Geweiht I' || n === 'Paktierer I' || /^Tradition der /.test(n);
  });
}
