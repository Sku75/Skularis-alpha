/**
 * Skularistool — Info-Feld (Strg+I): zeigt die Vollinfo eines Eintrags als
 * eigenen, navigierbaren Bildschirm. Blinde gehen mit Pfeil hoch/runter Zeile
 * für Zeile durch; Escape schließt.
 */
import * as screen from './screen.js';

function zerlege(text) {
  let teile = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  if (teile.length <= 1) {
    teile = String(text || '').split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/).map(s => s.trim()).filter(Boolean);
  }
  return teile.length ? teile : ['Keine Informationen.'];
}

export function zeigeInfo(titel, text) {
  screen.push({
    title: `Information: ${titel}`,
    build() {
      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';

      const h = document.createElement('div');
      h.className = 'db-menu__title';
      h.setAttribute('aria-hidden', 'true');
      h.textContent = titel;
      wrap.appendChild(h);

      for (const teil of zerlege(text)) {
        const zeile = document.createElement('div');
        zeile.className = 'db-row ed-info';
        zeile.tabIndex = 0;
        zeile.textContent = teil;
        zeile.setAttribute('data-sr-label', teil);
        zeile.dataset.srValue = teil;
        zeile.setAttribute('aria-label', teil);
        wrap.appendChild(zeile);
      }
      return wrap;
    },
  });
}
