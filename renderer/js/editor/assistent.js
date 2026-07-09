/**
 * Skularistool — Erschaffungsassistent (geführte Erstellung)
 * Wählt nacheinander Spezies, Kultur und Profession und wendet die
 * Sephrasto-Pakete additiv an. Danach geht es in den freien Editor.
 */
import * as editor from './editor.js';
import * as sprache from '../sprache.js';
import { auswahlDialog } from '../ui/dialog.js';
import { parse } from '../core/sephrasto-xml.js';
import { mergePaket } from '../core/paket.js';
import { verfuegbareEP } from '../core/character.js';

const ipc = window.skularis?.ipc;

async function schritt(kategorie) {
  const char = editor.getChar();
  const db = editor.getDb();
  let liste;
  try { liste = await ipc.paketeListe(kategorie); } catch { liste = []; }
  if (!liste || !liste.length) return;

  const eintraege = liste.map(p => ({ label: p.gruppe ? `${p.gruppe}: ${p.name}` : p.name, wert: p.pfad }));
  const pfad = await auswahlDialog({ titel: `${kategorie} wählen (Escape überspringt)`, eintraege });
  if (!pfad) { sprache.sage(`${kategorie} übersprungen.`); return; }

  try {
    const res = await ipc.paketLaden(pfad);
    const paket = parse(res.inhalt, db);
    const name = (liste.find(p => p.pfad === pfad) || {}).name || '';
    mergePaket(char, paket, kategorie, name);
    const frei = editor.aktualisiere();
    sprache.sage(`${name} angewandt. ${frei} EP frei.`);
  } catch (e) {
    console.error('Paket anwenden fehlgeschlagen:', e);
    sprache.sage('Paket konnte nicht angewandt werden.');
  }
}

export async function starteAssistent() {
  const char = editor.getChar();
  sprache.sage('Geführte Erschaffung. Wähle nacheinander Spezies, Kultur und Profession. Escape überspringt einen Schritt.');
  await schritt('Spezies');
  await schritt('Kultur');
  await schritt('Profession');
  editor.aktualisiere();
  sprache.sage(`Erschaffung übernommen. Charakter ${char.name || 'ohne Namen'}, ${verfuegbareEP(char)} EP frei. Freier Editor zum Feinschliff.`);
  editor.oeffneHub();
}
