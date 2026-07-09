/**
 * Skularistool — Abenteuer-Bereich: Mitspieler.
 * Liste der Mitspieler-Charaktere (nur Name + Notizen, keine echten Charaktere).
 * Notizen erscheinen bei Shift und Pfeil-runter. Ganz unten Mitspieler hinzufügen.
 */
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { menuScreen } from '../ui/menu-screen.js';
import { textDialog, auswahlDialog } from '../ui/dialog.js';
import { getAbenteuer, speichere } from './state.js';

function notizText(m) {
  return `Notizen zum Spieler: ${m.notizenSpieler || 'keine'}. Notizen zum Charakter: ${m.notizenCharakter || 'keine'}.`;
}

async function hinzufuegen() {
  const a = getAbenteuer();
  const name = await textDialog({ titel: 'Mitspieler hinzufügen', label: 'Name des Mitspieler-Charakters' });
  if (name === null || !name.trim()) return;
  const notizenSpieler = (await textDialog({ titel: 'Notizen zum Spieler', label: 'Notizen zum Spieler (optional)' })) || '';
  const notizenCharakter = (await textDialog({ titel: 'Notizen zum Charakter', label: 'Notizen zum Charakter (optional)' })) || '';
  a.mitspieler.push({ name: name.trim(), notizenSpieler: notizenSpieler.trim(), notizenCharakter: notizenCharakter.trim() });
  await speichere();
  screen.refresh();
  sprache.sage(`Mitspieler ${name.trim()} hinzugefügt.`);
}

function mitspielerDetail(m) {
  return menuScreen({
    title: `Mitspieler ${m.name}`,
    subtitle: 'Escape zurück.',
    items: [
      { label: 'Notizen vorlesen', detail: notizText(m), onSelect: () => sprache.sage(notizText(m)) },
      { label: 'Mitspieler entfernen', onSelect: async () => {
        const ja = await auswahlDialog({ titel: `${m.name} entfernen?`, eintraege: [{ label: 'Ja, entfernen', wert: true }, { label: 'Abbrechen', wert: false }] });
        if (!ja) return;
        const a = getAbenteuer();
        a.mitspieler = a.mitspieler.filter(x => x !== m);
        await speichere();
        sprache.sage(`${m.name} entfernt.`);
        screen.pop();
      } },
    ],
  });
}

export function mitspielerScreen() {
  const obj = {
    title: 'Mitspieler',
    build() {
      const a = getAbenteuer();
      const items = a.mitspieler.map((m, i) => ({
        label: `Mitspieler ${m.name}`,
        detail: notizText(m),
        onSelect: () => screen.push(mitspielerDetail(m)),
      }));
      items.push({ label: 'Mitspieler hinzufügen', hint: 'Name und Notizen', onSelect: hinzufuegen });
      return menuScreen({
        title: obj.title,
        subtitle: 'Shift und Pfeil-runter liest die Notizen. Escape zurück.',
        items,
      }).build();
    },
  };
  return obj;
}
