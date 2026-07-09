/**
 * Skularistool — Abenteuer-Bereich: Notizen und Tagebuch.
 * Freie Notizen (add-only) und ein chronologisches Tagebuch, ein Eintrag je
 * Spieltag. Autospeichern. Tagebuch-Einträge: Text per Shift und Pfeil-runter.
 */
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { menuScreen } from '../ui/menu-screen.js';
import { textDialog } from '../ui/dialog.js';
import { getAbenteuer, speichere } from './state.js';

export function notizenScreen() {
  const obj = {
    title: 'Notizen und Tagebuch',
    build() {
      const a = getAbenteuer();
      const items = [];

      items.push({
        label: 'Freie Notiz hinzufügen',
        onSelect: async () => {
          const t = await textDialog({ titel: 'Notiz', label: 'Notiz eingeben' });
          if (t && t.trim()) {
            a.notizen = (a.notizen ? a.notizen + '\n' : '') + t.trim();
            await speichere();
            screen.refresh();
            sprache.sage('Notiz hinzugefügt.');
          }
        },
      });
      const zeilen = a.notizen ? a.notizen.split('\n').filter(Boolean) : [];
      for (const z of zeilen) items.push({ label: z, detail: z, onSelect: () => {} });

      items.push({
        label: `Tagebuch-Eintrag für Spieltag ${a.spieltag} hinzufügen`,
        onSelect: async () => {
          const t = await textDialog({ titel: `Tagebuch, Spieltag ${a.spieltag}`, label: 'Was ist passiert' });
          if (t && t.trim()) {
            a.tagebuch.push({ spieltag: a.spieltag, text: t.trim() });
            await speichere();
            screen.refresh();
            sprache.sage('Tagebuch-Eintrag hinzugefügt.');
          }
        },
      });
      for (const e of a.tagebuch) {
        items.push({ label: `Spieltag ${e.spieltag}`, detail: e.text, onSelect: () => {} });
      }

      return menuScreen({
        title: obj.title,
        subtitle: 'Notizen und Tagebuch. Shift und Pfeil-runter liest Einträge. Escape zurück.',
        items,
      }).build();
    },
  };
  return obj;
}
