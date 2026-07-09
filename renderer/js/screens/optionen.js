/**
 * Skularis 0.1 — Optionen (Sound, Schrift, Über)
 * Ergänzt die Barrierefreiheits-Box oben rechts um ein volles Menü.
 */

import * as sprache from '../sprache.js';
import * as sounds from '../sounds.js';
import * as einstellungen from './../daten/einstellungen.js';
import { menuScreen } from '../ui/menu-screen.js';

function setFont(neu) {
  neu = Math.max(-4, Math.min(8, neu));
  einstellungen.setWert('schrift_offset', neu);
  document.documentElement.style.setProperty('--db-font-offset', `${neu}px`);
  const anzeige = neu > 0 ? `plus ${neu}` : (neu < 0 ? `minus ${Math.abs(neu)}` : 'normal');
  sprache.sage(`Schriftgröße ${anzeige}.`);
}

async function aktuellerFont() {
  return (await einstellungen.get('schrift_offset')) || 0;
}

function setVolume(prozent) {
  prozent = Math.max(0, Math.min(100, prozent));
  sounds.setVolume(prozent);
  const slider = document.getElementById('volume-slider');
  const anzeige = document.getElementById('volume-display');
  if (slider) slider.value = prozent;
  if (anzeige) anzeige.textContent = String(prozent);
  sprache.sage(`Lautstärke ${prozent} Prozent.`);
}

export function build() {
  return menuScreen({
    title: 'Optionen',
    subtitle: 'Escape kehrt zurück.',
    items: [
      {
        label: 'Sprachausgabe ein oder aus',
        hint: 'Schaltet die gesprochenen Ansagen um (auch mit Strg und M)',
        onSelect: () => {
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
        },
      },
      {
        label: 'Lautstärke erhöhen',
        hint: 'Software-Sounds lauter',
        onSelect: () => setVolume(sounds.getVolume() + 5),
      },
      {
        label: 'Lautstärke verringern',
        hint: 'Software-Sounds leiser',
        onSelect: () => setVolume(sounds.getVolume() - 5),
      },
      {
        label: 'Schrift vergrößern',
        onSelect: async () => setFont((await aktuellerFont()) + 1),
      },
      {
        label: 'Schrift verkleinern',
        onSelect: async () => setFont((await aktuellerFont()) - 1),
      },
      {
        label: 'Schrift auf Normalgröße',
        onSelect: () => setFont(0),
      },
      {
        label: 'Über Skularis',
        hint: 'Programm-Informationen',
        onSelect: () => sprache.sage(
          'Skularis. Barrierefreie Charaktererstellung für das Ilaris-Regelwerk, ' +
          'als barrierefreie Übersetzung von Sephrasto. Regelwerk Ilaris von Lukas Rügge.'
        ),
      },
    ],
  });
}
