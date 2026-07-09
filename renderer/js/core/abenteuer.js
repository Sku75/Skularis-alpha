/**
 * Skularistool — Abenteuer-Datenmodell (Spielsitzung).
 *
 * Ein Abenteuer ist ein eigener Spielstand (JSON). Der Charakter nimmt teil:
 * beim Erstellen wird eine Momentaufnahme übernommen (nur zum Ansehen), der
 * Sitzungszustand (Ressourcen, Inventar, Notizen, Tagebuch, Mitspieler, Protokoll,
 * Spieltag, verdiente AP) ist veränderlich und wird gespeichert.
 */
import { abgeleiteteWerte } from './regeln.js';

export const SCHEMA_VERSION = 1;

/** Ressourcen aus dem Charakter ableiten (Maxima aus dem Bogen, Stand = voll). */
export function ressourcenAusCharakter(char) {
  const w = abgeleiteteWerte(char);
  const res = {
    Wunden: { aktuell: 0 },
    Erschoepfung: { aktuell: 0 },
    SchiP: { aktuell: w.SchiP, max: w.SchiP },
  };
  for (const k of ['AsP', 'KaP', 'GuP']) {
    const e = char.energien && char.energien[k];
    if (e) {
      const max = (e.basis || 0) + (e.gekauft || 0);
      if (max > 0) res[k] = { aktuell: max, max };
    }
  }
  return res;
}

export function createAbenteuer(char, name, charakterName, charakterPfad) {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: name || 'Neues Abenteuer',
    spieltag: 1,
    charakterName: charakterName || char.name || '',
    charakterPfad: charakterPfad || '',
    charakter: char,
    ressourcen: ressourcenAusCharakter(char),
    inventar: {
      geldboerse: { dukaten: 0, silber: 0, kupfer: 0 },
      rucksack: [],
      guertel: [],
    },
    mitspieler: [],
    notizen: '',
    tagebuch: [],
    protokoll: [],
    apGesamt: 0,
  };
}

export function serialisiereAbenteuer(a) {
  return JSON.stringify(a, null, 2);
}

export function parseAbenteuer(text) {
  const a = JSON.parse(text);
  // Weiche Absicherung fehlender Felder (Vorwärtskompatibilität).
  a.spieltag = a.spieltag || 1;
  a.ressourcen = a.ressourcen || {};
  a.inventar = a.inventar || { geldboerse: { dukaten: 0, silber: 0, kupfer: 0 }, rucksack: [], guertel: [] };
  a.inventar.geldboerse = a.inventar.geldboerse || { dukaten: 0, silber: 0, kupfer: 0 };
  a.inventar.rucksack = a.inventar.rucksack || [];
  a.inventar.guertel = a.inventar.guertel || [];
  a.mitspieler = a.mitspieler || [];
  a.tagebuch = a.tagebuch || [];
  a.protokoll = a.protokoll || [];
  a.notizen = a.notizen || '';
  a.apGesamt = a.apGesamt || 0;
  return a;
}

/** Protokoll-Eintrag hinzufügen (neueste oben). */
export function protokolliere(a, text) {
  let zeit = '';
  try { zeit = new Date().toLocaleString('de-DE'); } catch { zeit = ''; }
  a.protokoll.unshift({ spieltag: a.spieltag, zeit, text });
}
