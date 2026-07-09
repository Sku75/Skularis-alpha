/**
 * Skularis Alpha 0.02.03 — Pfeil-Navigation + Fokus-Containment
 * Portierung der Pfeilsteuerung aus charakter_view.py _nav_pfeil()
 *
 * - Arrow Down/Up: Nächstes/Voriges fokussierbares Element im aktiven Panel
 * - Home/End: Erstes/Letztes Element (außerhalb von Inputs)
 * - Fokus bleibt im aktiven Tab-Panel
 * - Warnton an Panel-Grenzen (kein Wrapping)
 * - Zeile wird bei Fokuswechsel vorgelesen
 * - Textfelder: „markiert"-Ansage bei Selektion
 */

import * as sprache from './sprache.js';
import * as sounds from './sounds.js';

export const FOCUSABLE = [
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex="0"]',
  'a[href]',
].join(', ');

let _aktivesPanel = null;

export function init() {
  document.addEventListener('keydown', _onKeyDown);
}

export function setAktivesPanel(panel) {
  _aktivesPanel = panel;
}

/**
 * Ansage für ein fokussiertes Element erzeugen.
 * Textfelder mit selektiertem Text: „Label: Wert, markiert"
 * Andere Elemente: sageZeile()
 */
function _sageElement(el) {
  if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search') && el.value) {
    const label = el.getAttribute('aria-label') || '';
    sprache.sage(`${label}: ${el.value}, markiert`);
  } else {
    sprache.sageZeile(el);
  }
}

export function fokussiereErstes(container, silent = false) {
  const el = (container || _aktivesPanel)?.querySelector(FOCUSABLE);
  if (el) {
    el.focus();
    if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) el.select();
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (!silent) _sageElement(el);
  }
  return el || null;
}

export function fokussiereLetztes(container) {
  const alle = (container || _aktivesPanel)?.querySelectorAll(FOCUSABLE);
  if (alle && alle.length > 0) {
    const el = alle[alle.length - 1];
    el.focus();
    if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) el.select();
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    _sageElement(el);
  }
}

function _getAlleFokussierbar() {
  if (!_aktivesPanel) return [];
  return Array.from(_aktivesPanel.querySelectorAll(FOCUSABLE));
}

function _naechstesElement(richtung) {
  const alle = _getAlleFokussierbar();
  if (alle.length === 0) return null;

  const aktiv = document.activeElement;
  let idx = alle.indexOf(aktiv);

  if (idx < 0) return alle[0];

  idx += richtung;
  if (idx >= alle.length || idx < 0) {
    return null;  // Grenze erreicht — Warnton wird vom Aufrufer gespielt
  }

  return alle[idx];
}

function _istInEingabefeld(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const typ = el.type;
    return typ === 'text' || typ === 'number' || typ === 'search' || typ === 'url' || typ === 'email';
  }
  if (el.contentEditable === 'true') return true;
  return false;
}

function _onKeyDown(e) {
  // Enter funktioniert ÜBERALL — auch in Dialogen, nicht nur im aktiven Panel
  // (In Python: bind_class("Button", "<Return>", e.widget.invoke()))
  if (e.key === 'Enter') {
    const el = document.activeElement;
    if (el && (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button')) {
      e.preventDefault();
      el.click();
    }
    return;
  }

  // Pfeil-Navigation nur innerhalb des aktiven Panels
  if (!_aktivesPanel) return;
  // Fokus ausserhalb des Panels? → nicht eingreifen (z.B. Dialog offen)
  if (!_aktivesPanel.contains(document.activeElement)) return;

  // In Textfeldern: Pfeiltasten normal verwenden
  if (_istInEingabefeld(document.activeElement)) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Nur wenn nicht in Textarea (dort braucht man die Pfeile)
      if (document.activeElement.tagName === 'TEXTAREA') return;
    } else {
      return;
    }
  }

  switch (e.key) {
    case 'ArrowDown': {
      e.preventDefault();
      const el = _naechstesElement(1);
      if (!el) {
        sounds.playError();
        break;
      }
      el.focus();
      if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) {
        sounds.playEingabeStart();
        el.select();
      } else {
        sounds.playNavigation();
      }
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      _sageElement(el);
      break;
    }
    case 'ArrowUp': {
      e.preventDefault();
      const el = _naechstesElement(-1);
      if (!el) {
        sounds.playError();
        break;
      }
      el.focus();
      if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search')) {
        sounds.playEingabeStart();
        el.select();
      } else {
        sounds.playNavigation();
      }
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      _sageElement(el);
      break;
    }
    case 'Home': {
      if (e.ctrlKey || !_istInEingabefeld(document.activeElement)) {
        e.preventDefault();
        fokussiereErstes();
      }
      break;
    }
    case 'End': {
      if (e.ctrlKey || !_istInEingabefeld(document.activeElement)) {
        e.preventDefault();
        fokussiereLetztes();
      }
      break;
    }
  }
}
