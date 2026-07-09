/**
 * Skularis 0.1 — App-Bootstrap
 * Initialisiert die Bedienschicht und zeigt das Hauptmenü.
 */

import { on, emit } from './state.js';
import * as sounds from './sounds.js';
import * as sprache from './sprache.js';
import * as shortcuts from './shortcuts.js';
import * as navigation from './navigation.js';
import * as einstellungen from './daten/einstellungen.js';
import * as screen from './ui/screen.js';
import * as startScreen from './screens/start.js';

const ipc = window.skularis?.ipc;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Einstellungen + Sound
  await einstellungen.laden();
  await sounds.init();
  sounds.playStart();
  await new Promise(r => setTimeout(r, 900));

  // Sprache
  await sprache.init();
  const spracheAn = await einstellungen.get('sprache_an');
  if (spracheAn === false) sprache.setAn(false);

  // Schriftgröße anwenden
  const fontOffset = (await einstellungen.get('schrift_offset')) || 0;
  document.documentElement.style.setProperty('--db-font-offset', `${fontOffset}px`);

  // Bedienschicht
  shortcuts.init();
  navigation.init();
  screen.init(document.getElementById('app-content'));

  registriereShortcuts();
  initKopfzeile();
  registriereEscape();
  registriereQuit();

  // Fokus außerhalb des aktiven Panels (Kopfzeile) ansagen
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!el) return;
    if (['sr-live', 'sr-polite', 'sr-status'].includes(el.id)) return;
    if (el.closest('[role="application"]')) return; // navigation.js sagt an
    if (el.dataset && el.dataset.srSkip) return;
    sprache.sageZusatz(sprache.beschreibe(el));
  });

  // Hauptmenü zeigen
  screen.reset(startScreen.build());
  sprache.sageStatus('Pfeiltasten hoch und runter zum Wählen, Eingabetaste öffnet, Escape zurück, Tabulator erreicht die Sound- und Schrift-Einstellungen.');
}

// --- Escape = zurück ---

function registriereEscape() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Offener Dialog? Dann Dialog-eigenes Escape wirken lassen.
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    if (!screen.pop()) {
      sprache.sage('Hauptmenü. Bereits oberste Ebene.');
    }
  });
}

// --- Beenden ---

function registriereQuit() {
  on('app-beenden', () => beenden());

  // Fenster-Schließen (X) — keine ungespeicherten Daten auf Menü-Ebene.
  if (ipc && ipc.onVorSchliessen) {
    ipc.onVorSchliessen(() => {
      if (ipc.antworteSchliessen) ipc.antworteSchliessen(true);
    });
  }
}

function beenden() {
  sounds.playSchliessen();
  sprache.sage('Skularis wird beendet.');
  setTimeout(() => {
    if (ipc && ipc.antworteSchliessen) ipc.antworteSchliessen(true);
  }, 250);
}

// --- Shortcuts (nur global sinnvolle) ---

function registriereShortcuts() {
  shortcuts.registriere('Ctrl+M', () => {
    const neu = !sprache.istAn();
    sprache.setAn(neu);
    sounds.playClick();
    const st = document.getElementById('sprache-status-text');
    if (st) st.textContent = neu ? 'Sprache an' : 'Sprache aus';
    if (neu) sprache.sage('Sprachausgabe aktiviert.');
    else {
      const el = document.getElementById('sr-live');
      if (el) { el.textContent = ''; requestAnimationFrame(() => { el.textContent = 'Sprachausgabe deaktiviert.'; }); }
    }
  }, 'Sprachausgabe ein/aus');

  shortcuts.registriere('Ctrl++', () => schriftAendern(1), 'Schrift vergrößern');
  shortcuts.registriere('Ctrl+-', () => schriftAendern(-1), 'Schrift verkleinern');
  shortcuts.registriere('Ctrl+0', () => schriftReset(), 'Schrift zurücksetzen');

  // Info zum fokussierten Eintrag vorlesen (überall gleich)
  shortcuts.registriere('Shift+ArrowDown', async () => {
    const t = await detailText(document.activeElement);
    sprache.sage(t || 'Keine weiteren Informationen.');
  }, 'Info zum Eintrag vorlesen');

  // Info als navigierbares Feld öffnen
  shortcuts.registriere('Ctrl+I', async () => {
    const el = document.activeElement;
    const t = await detailText(el);
    if (!t) { sprache.sage('Keine weiteren Informationen.'); return; }
    const titel = (el.querySelector && el.querySelector('.db-menu__label')?.textContent)
      || el.getAttribute('aria-label') || 'Eintrag';
    const m = await import('./ui/info-screen.js');
    m.zeigeInfo(titel, t);
  }, 'Info-Feld öffnen');
}

/** Vollinfo eines fokussierten Elements ermitteln (auch verzögert geladene). */
async function detailText(el) {
  if (!el) return '';
  if (el.__detailText !== undefined) return el.__detailText;
  let d = el.__detail;
  if (d === undefined) return '';
  if (typeof d === 'function') { try { d = await d(); } catch { d = ''; } }
  el.__detailText = (typeof d === 'string' ? d : '');
  return el.__detailText;
}

async function schriftAendern(delta) {
  const aktuell = (await einstellungen.get('schrift_offset')) || 0;
  const neu = Math.max(-4, Math.min(8, aktuell + delta));
  einstellungen.setWert('schrift_offset', neu);
  document.documentElement.style.setProperty('--db-font-offset', `${neu}px`);
  sounds.playClick();
  sprache.sage(`Schriftgröße ${neu >= 0 ? '+' : ''}${neu}`);
}

function schriftReset() {
  einstellungen.setWert('schrift_offset', 0);
  document.documentElement.style.setProperty('--db-font-offset', '0px');
  sounds.playClick();
  sprache.sage('Schriftgröße zurückgesetzt.');
}

// --- Kopfzeile (Barrierefreiheits-Box) ---

function initKopfzeile() {
  const volumeSlider = document.getElementById('volume-slider');
  const volumeDisplay = document.getElementById('volume-display');
  const btnSprache = document.getElementById('btn-sprache-toggle');
  const btnFontPlus = document.getElementById('btn-font-plus');
  const btnFontMinus = document.getElementById('btn-font-minus');

  if (volumeSlider) {
    volumeSlider.value = sounds.getVolume();
    if (volumeDisplay) volumeDisplay.textContent = String(sounds.getVolume());
    volumeSlider.addEventListener('input', () => {
      const v = parseInt(volumeSlider.value, 10);
      sounds.setVolume(v);
      if (volumeDisplay) volumeDisplay.textContent = String(v);
    });
  }

  if (btnSprache) {
    btnSprache.addEventListener('click', () => {
      const neu = !sprache.istAn();
      sprache.setAn(neu);
      sounds.playClick();
      const st = document.getElementById('sprache-status-text');
      if (st) st.textContent = neu ? 'Sprache an' : 'Sprache aus';
      if (neu) sprache.sage('Sprachausgabe aktiviert.');
    });
  }

  if (btnFontPlus) btnFontPlus.addEventListener('click', () => schriftAendern(1));
  if (btnFontMinus) btnFontMinus.addEventListener('click', () => schriftAendern(-1));
}
