/**
 * Skularistool 0.1 — Bildschirm-Verwaltung (Stapel)
 *
 * Ein "Bildschirm" (screen) ist ein Objekt:
 *   { title: string, build(): HTMLElement, onShow?(el), onBack?() }
 *
 * Bildschirme werden gestapelt: push() legt einen neuen oben auf,
 * pop() (Escape) kehrt zum vorigen zurück. Jeder Bildschirm ist ein
 * role="application"-Panel; die Pfeil-Navigation (navigation.js) hält den
 * Fokus darin. Beim Zeigen wird Titel + fokussiertes Element angesagt.
 *
 * Fokus-Merkung: Beim Verlassen eines Bildschirms (push) wird die Position
 * des aktuell fokussierten Punktes gemerkt. Beim Zurückspringen (pop) landet
 * der Fokus wieder genau dort — nicht am Anfang des Menüs.
 */

import * as sprache from '../sprache.js';
import * as sounds from '../sounds.js';
import * as navigation from '../navigation.js';

let _container = null;
const _stack = [];

export function init(container) {
  _container = container;
}

export function push(screen) {
  // Fokus-Position des Bildschirms merken, den wir verlassen.
  const cur = current();
  if (cur) cur._focusIndex = _aktuellerFokusIndex();
  _stack.push(screen);
  _render({ sound: true, restore: false });
}

export function replace(screen) {
  if (_stack.length === 0) _stack.push(screen);
  else _stack[_stack.length - 1] = screen;
  _render({ sound: true, restore: false });
}

export function reset(screen) {
  _stack.length = 0;
  _stack.push(screen);
  _render({ sound: false, restore: false });
}

export function pop() {
  if (_stack.length <= 1) return false;
  _stack.pop();
  sounds.playSchliessen();
  _render({ sound: false, restore: true });
  return true;
}

export function tiefe() {
  return _stack.length;
}

export function current() {
  return _stack[_stack.length - 1] || null;
}

/** Aktuellen Bildschirm neu aufbauen (z. B. nach Datenänderung). */
export function refresh() {
  if (_stack.length) {
    const cur = current();
    if (cur) cur._focusIndex = _aktuellerFokusIndex();
    _render({ sound: false, restore: true });
  }
}

function _aktuellerFokusIndex() {
  const panel = _container && _container.firstElementChild;
  if (!panel) return null;
  const alle = Array.from(panel.querySelectorAll(navigation.FOCUSABLE));
  const idx = alle.indexOf(document.activeElement);
  return idx >= 0 ? idx : null;
}

function _render({ sound, restore }) {
  const screen = current();
  if (!screen || !_container) return;

  _container.innerHTML = '';
  const el = screen.build();
  el.classList.add('screen');
  // role="application": NVDA liest fokussierte Elemente nicht selbst vor —
  // wir steuern die Ansagen über aria-live. Kein aria-label, damit der Titel
  // nicht zusätzlich zur aria-live-Ansage vorgelesen wird.
  el.setAttribute('role', 'application');
  el.tabIndex = -1;
  _container.appendChild(el);

  navigation.setAktivesPanel(el);

  if (sound) sounds.playTab();

  // Fokusziel bestimmen: bei pop() der gemerkte Punkt, sonst der erste.
  const alle = Array.from(el.querySelectorAll(navigation.FOCUSABLE));
  let ziel = alle[0] || null;
  if (restore && typeof screen._focusIndex === 'number' && alle[screen._focusIndex]) {
    ziel = alle[screen._focusIndex];
  }
  screen._focusIndex = null;

  // Kombinierte Ansage VOR dem Fokus (wie im Skularis-Reitersystem),
  // damit NVDA die aria-live-Ansage nicht durch den Focus-Event überschreibt.
  const feldText = ziel ? sprache.getZeilenText(ziel) : '';
  sprache.sage(`${screen.title}. ${feldText}`);

  if (typeof screen.onShow === 'function') {
    try { screen.onShow(el); } catch (e) { console.error('onShow:', e); }
  }

  setTimeout(() => {
    if (!ziel) return;
    ziel.focus();
    if (ziel.tagName === 'INPUT' && (ziel.type === 'text' || ziel.type === 'search')) ziel.select();
    ziel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 80);
}
