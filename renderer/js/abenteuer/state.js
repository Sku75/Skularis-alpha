/**
 * Skularistool — gemeinsamer Zustand des aktiven Abenteuers + Autospeichern.
 * Alle Abenteuer-Bereiche greifen hierauf zu.
 */
import { serialisiereAbenteuer } from '../core/abenteuer.js';

const ipc = window.skularis?.ipc;
let aktuell = null;

export function getAbenteuer() { return aktuell; }
export function setAbenteuer(a) { aktuell = a; }

/** Aktuellen Spielstand sicher speichern (atomar im Hauptprozess). */
export async function speichere() {
  if (!aktuell) return false;
  try {
    const r = await ipc.abenteuerSpeichern({ name: aktuell.name, inhalt: serialisiereAbenteuer(aktuell) });
    aktuell._pfad = r.pfad;
    return true;
  } catch (e) {
    console.error('Abenteuer speichern:', e);
    return false;
  }
}
