/**
 * Skularis Alpha 0.02.03 — Screenreader-Ansagen (aria-live)
 * Ersetzt gui/sprache.py: statt accessible_output2 werden
 * aria-live-Regionen im DOM befuellt.
 * NVDA/JAWS lesen diese automatisch vor.
 */

import * as einstellungen from './daten/einstellungen.js';

let _an = true;
let _gesperrt = false;
let _warteschlange = [];

// Roemische -> Arabische Ziffern (fuer TTS)
const ROEMISCH_MAP = {
  XVIII:18, XVII:17, XVI:16, XIV:14, XIII:13, XII:12, XIX:19,
  XI:11, XV:15, XX:20, VIII:8, VII:7, VI:6, IV:4, IX:9,
  III:3, II:2, X:10, V:5, I:1,
};
const ROEMISCH_RE = /(?<!\+)\b(XVIII|XVII|XVI|XIV|XIII|XII|XIX|XI|XV|XX|VIII|VII|VI|IV|IX|III|II|X|V|I)\b/g;

function romanZuArabisch(text) {
  if (!text) return text;
  return text.replace(ROEMISCH_RE, m => String(ROEMISCH_MAP[m]));
}

function sonderzeichenErsetzen(text) {
  if (!text) return text;
  text = text.replace(/\+/g, ' plus ');
  text = text.replace(/(?<![a-zA-ZäöüÄÖÜß])-|-(?![a-zA-ZäöüÄÖÜß])/g, ' minus ');
  text = text.replace(/ +/g, ' ');
  return text.trim();
}

function _aufbereiten(text) {
  text = romanZuArabisch(String(text));
  text = sonderzeichenErsetzen(text);
  return text;
}

export async function init() {
  _an = await einstellungen.get('sprache_an') !== false;
}

export function istAn() {
  return _an;
}

export function setAn(b) {
  _an = Boolean(b);
  einstellungen.setWert('sprache_an', _an);
}

/**
 * Warteschlange sperren — verhindert, dass FocusIn-Events
 * wichtige Ansagen unterbrechen (wie in Python: warteschlange_start/ende).
 */
export function warteschlangeStart() {
  _gesperrt = true;
  _warteschlange = [];
}

export function warteschlangeEnde() {
  _gesperrt = false;
  if (_warteschlange.length > 0) {
    sage(_warteschlange.join('. '));
    _warteschlange = [];
  }
}

/**
 * Assertive Ansage — unterbricht laufende Rede.
 * Entspricht sprache.sage() in Python.
 */
export function sage(text) {
  if (!_an || !text) return;
  text = _aufbereiten(text);
  // Wenn gesperrt: in Warteschlange einreihen statt sofort ansagen
  if (_gesperrt) { _warteschlange.push(text); return; }
  const el = document.getElementById('sr-live');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = text; });
}

/**
 * Polite Ansage — reiht sich ein.
 * Entspricht sprache.sage_zusatz() in Python.
 */
export function sageZusatz(text) {
  if (!_an || !text) return;
  text = _aufbereiten(text);
  const el = document.getElementById('sr-polite');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = text; });
}

/**
 * Status-Ansage (polite, fuer Statusleiste).
 */
export function sageStatus(text) {
  if (!_an || !text) return;
  text = _aufbereiten(text);
  const el = document.getElementById('sr-status');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = text; });
}

/**
 * Erzeugt einen Beschreibungstext fuer ein focussierbares Element.
 * Ersetzt sprache.beschreibe(widget) in Python.
 */
export function beschreibe(element) {
  if (!element) return '';

  const label = element.getAttribute('aria-label')
    || element.getAttribute('title')
    || element.textContent?.trim()
    || '';

  const role = element.getAttribute('role') || element.tagName.toLowerCase();

  const parts = [];

  if (element.tagName === 'BUTTON' || role === 'button') {
    parts.push('Schalter');
  }

  parts.push(label);

  if (element.tagName === 'INPUT') {
    const typ = element.type;
    if (typ === 'range') {
      parts.push(`Schieberegler, Wert ${element.value}`);
    } else if (typ === 'checkbox') {
      parts.push(element.checked ? 'aktiviert' : 'nicht aktiviert');
    } else if (typ === 'number') {
      parts.push(`Zahleneingabe, Wert ${element.value}`);
    } else {
      parts.push('Eingabefeld');
      if (element.value) parts.push(element.value);
    }
  } else if (element.tagName === 'SELECT') {
    const opt = element.options[element.selectedIndex];
    parts.push(`Auswahlliste, ${opt ? opt.textContent : ''}`);
  } else if (element.tagName === 'TEXTAREA') {
    parts.push('Mehrzeiliges Textfeld');
  } else if (role === 'tab') {
    const selected = element.getAttribute('aria-selected') === 'true';
    parts.push(selected ? 'Reiter, ausgewählt' : 'Reiter');
    const shortcut = element.getAttribute('aria-keyshortcuts');
    if (shortcut) parts.push(shortcut);
  }

  if (element.disabled) parts.push('deaktiviert');

  return parts.filter(Boolean).join(', ');
}

/**
 * Gibt den Beschreibungstext einer Zeile zurueck (wie sageZeile, aber ohne Ansage).
 */
export function getZeilenText(element) {
  if (!element) return '';
  // Buttons: immer eigenstaendig beschreiben, nie als Teil der Zeile
  if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
    return beschreibe(element);
  }
  const row = element.closest('.db-row');
  if (!row) return beschreibe(element);
  const parts = [];
  row.querySelectorAll('[data-sr-label], [data-sr-value]').forEach(el => {
    // Buttons ueberspringen — werden eigenstaendig angesagt
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return;
    const text = el.getAttribute('data-sr-label')
      || el.getAttribute('data-sr-value')
      || el.textContent?.trim();
    if (text) parts.push(text);
  });
  return parts.length ? parts.join(', ') : beschreibe(element);
}

/**
 * Liest eine komplette Zeile (.db-row) vor.
 */
export function sageZeile(element) {
  const text = getZeilenText(element);
  if (text) sage(text);
}
