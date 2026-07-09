/**
 * Skularis 0.1 — Startbildschirm (Hauptmenü mit 5 Punkten)
 */

import { emit } from '../state.js';
import * as sprache from '../sprache.js';
import * as screen from '../ui/screen.js';
import { menuScreen } from '../ui/menu-screen.js';

export function build() {
  return menuScreen({
    title: 'Skularis',
    subtitle: 'Hauptmenü — mit Pfeiltasten wählen, Eingabetaste öffnet, Escape zurück.',
    items: [
      {
        label: 'Charakterverwaltung',
        hint: 'Charaktere erstellen, ansehen, importieren und exportieren',
        onSelect: () => import('./charakterverwaltung.js').then(m => screen.push(m.build())),
      },
      {
        label: 'Abenteuer-Tisch',
        hint: 'Platzhalter, kommt später',
        onSelect: () => sprache.sage('Abenteuer-Tisch. Dieser Bereich kommt später.'),
      },
      {
        label: 'Meister-Tisch',
        hint: 'Platzhalter, kommt später',
        onSelect: () => sprache.sage('Meister-Tisch. Dieser Bereich kommt später.'),
      },
      {
        label: 'Optionen',
        hint: 'Sound und Schrift einstellen',
        onSelect: () => import('./optionen.js').then(m => screen.push(m.build())),
      },
      {
        label: 'Skularis beenden',
        hint: 'Programm schließen',
        onSelect: () => emit('app-beenden'),
      },
    ],
  });
}
