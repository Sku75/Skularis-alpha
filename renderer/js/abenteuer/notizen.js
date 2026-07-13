/**
 * Skularistool — Abenteuer-Bereich: Notizen und Tagebuch (ein gemeinsamer Strom).
 *
 * Notizen und Tagebuch-Einträge liegen in einer chronologischen Liste (a.journal)
 * und haben dasselbe Format: Titel + Inhalt. Angezeigt wird "Notiz: Titel" bzw.
 * "Tagebucheintrag N: Titel"; der Inhalt kommt per Shift und Pfeil-runter (und für
 * Sehende im Detailbereich). Tagebuch-Einträge sind fortlaufend nummeriert, damit
 * man das Tagebuch am Ende in Reihenfolge "binden" kann. Neueste stehen oben.
 * Autospeichern.
 */
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { menuScreen } from '../ui/menu-screen.js';
import { textDialog } from '../ui/dialog.js';
import { getAbenteuer, speichere } from './state.js';

async function neuerEintrag(typ) {
  const a = getAbenteuer();
  const wort = typ === 'tagebuch' ? 'Tagebuch-Eintrag' : 'Notiz';
  const titel = await textDialog({ titel: wort, label: 'Titel' });
  if (titel === null || !titel.trim()) return;
  const inhalt = await textDialog({ titel: `${wort}: ${titel.trim()}`, label: 'Inhalt' });
  if (inhalt === null) return;
  a.journal.push({ typ, titel: titel.trim(), inhalt: inhalt.trim(), spieltag: a.spieltag });
  await speichere();
  screen.refresh();
  sprache.sage(`${wort} hinzugefügt.`);
}

export function notizenScreen() {
  const obj = {
    title: 'Notizen und Tagebuch',
    build() {
      const a = getAbenteuer();
      const items = [];

      items.push({
        label: `Tagebuch-Eintrag hinzufügen, Spieltag ${a.spieltag}`,
        hint: 'Erst Titel, dann Inhalt', onSelect: () => neuerEintrag('tagebuch'),
      });
      items.push({
        label: 'Notiz hinzufügen',
        hint: 'Erst Titel, dann Inhalt', onSelect: () => neuerEintrag('notiz'),
      });

      // Tagebuch-Einträge in Erstell-Reihenfolge durchnummerieren.
      let tb = 0;
      const nummeriert = a.journal.map((e) => {
        const nr = e.typ === 'tagebuch' ? ++tb : null;
        return { e, nr };
      });

      // Anzeige neueste zuerst; älteste rutschen nach unten.
      for (const { e, nr } of nummeriert.reverse()) {
        const kopf = e.typ === 'tagebuch' ? `Tagebucheintrag ${nr}` : 'Notiz';
        const label = `${kopf}: ${e.titel}`;
        const detail = e.inhalt || 'Kein Inhalt.';
        items.push({ label, detail, onSelect: () => sprache.sage(`${label}. ${detail}`) });
      }

      return menuScreen({
        title: obj.title,
        subtitle: 'Neueste oben. Shift und Pfeil-runter liest den Inhalt, Eingabetaste liest vor. Escape zurück.',
        items,
        leer: 'Noch keine Einträge.',
      }).build();
    },
  };
  return obj;
}
