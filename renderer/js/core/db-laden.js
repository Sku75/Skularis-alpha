/**
 * Skularistool — Datenbank im Renderer laden (über IPC) und transformieren.
 * Cacht das Ergebnis.
 */
import { transformDb } from './db.js';

let _db = null;

export async function ladeDb() {
  if (_db) return _db;
  const raw = await window.skularis.ipc.datenbankLaden();
  _db = transformDb(raw);
  return _db;
}

export function getDb() {
  return _db;
}
