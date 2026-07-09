/**
 * Skularistool 0.1 — Charakterverwaltung (Menü)
 */

import * as sprache from '../sprache.js';
import * as screen from '../ui/screen.js';
import { menuScreen } from '../ui/menu-screen.js';

export function build() {
  return menuScreen({
    title: 'Charakterverwaltung',
    subtitle: 'Escape kehrt zum Hauptmenü zurück.',
    items: [
      {
        label: 'Meine Charaktere',
        hint: 'Gespeicherte Charaktere ansehen und verwalten',
        onSelect: () => import('./meine-charaktere.js').then(m => m.oeffne()),
      },
      {
        label: 'Neuen Charakter erstellen',
        hint: 'Das Erstellungs-Tool öffnen (Sephrasto-Regeln)',
        onSelect: () => import('../editor/editor.js')
          .then(m => m.starteNeu())
          .catch(() => sprache.sage('Das Erstellungs-Tool wird gerade gebaut.')),
      },
      {
        label: 'Charakter importieren',
        hint: 'Eine Sephrasto-XML-Datei einlesen',
        onSelect: () => import('./meine-charaktere.js')
          .then(m => m.importieren())
          .catch(() => sprache.sage('Import wird gerade gebaut.')),
      },
      {
        label: 'Charakter exportieren',
        hint: 'Als HTML oder Sephrasto-XML weitergeben',
        onSelect: () => import('./meine-charaktere.js')
          .then(m => m.exportieren())
          .catch(() => sprache.sage('Export wird gerade gebaut.')),
      },
    ],
  });
}
