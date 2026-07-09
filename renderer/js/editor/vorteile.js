/**
 * Skularistool — Editor-Bereich: Vorteile
 * Hinzufügen (durchsuchbare Liste, variable Kosten + Kommentar), entfernen.
 * Voraussetzungen werden geprüft und als Hinweis angesagt (nicht blockierend).
 */
import * as editor from './editor.js';
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { aktionZeile, abschnittTitel, infoZeile } from './widgets.js';
import { zahlDialog, textDialog } from '../ui/dialog.js';
import { auswahlScreen } from '../ui/auswahl-screen.js';
import { pruefeVoraussetzungen } from '../core/regeln.js';

function name(eintrag) { return typeof eintrag === 'string' ? eintrag : eintrag.name; }

export function vorteileScreen() {
  return {
    title: '',
    build() {
      const char = editor.getChar();
      const db = editor.getDb();
      const frei = editor.aktualisiere();
      this.title = `Vorteile, ${frei} EP frei`;

      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';
      wrap.appendChild(abschnittTitel('Vorteile'));

      const habenNamen = new Set(char.vorteile.map(name));

      wrap.appendChild(aktionZeile('Vorteil hinzufügen', () => {
        const offen = db.vorteile.filter(v => !habenNamen.has(v.name));
        const eintraege = offen.map(v => ({
          label: `${v.name}, ${v.variableKosten ? 'variabel' : v.kosten + ' EP'}`,
          wert: v.name,
          detail: `${v.text || ''}${v.voraussetzungen ? ` Voraussetzungen: ${v.voraussetzungen}.` : ''}${v.info ? ` ${v.info}` : ''}`.trim(),
        }));
        auswahlScreen({
          titel: 'Vorteil wählen',
          eintraege,
          onWahl: async (gewaehlt) => {
            const v = db.vorteilByName[gewaehlt];
            let hinweis = '';
            if (!pruefeVoraussetzungen(char, db, v.voraussetzungen)) {
              hinweis = ' Achtung, Voraussetzung nicht erfüllt.';
            }
            let neu;
            if (v.variableKosten) {
              const kosten = await zahlDialog({ titel: `${v.name}: Kosten`, label: 'EP-Kosten', wert: v.kosten, min: -1000, max: 10000 });
              if (kosten === null) return;
              let kommentar = '';
              if (v.kommentar) kommentar = (await textDialog({ titel: `${v.name}: Kommentar`, label: 'Kommentar (z. B. Umgebung, Gruppe)', wert: '' })) || '';
              neu = { name: v.name, kosten, kommentar };
            } else {
              neu = v.name;
            }
            char.vorteile.push(neu);
            const f2 = editor.aktualisiere();
            screen.refresh();
            sprache.sage(`${v.name} hinzugefügt, ${f2} EP frei.${hinweis}`);
          },
        });
      }, 'Öffnet eine durchsuchbare Liste aller Vorteile'));

      if (char.vorteile.length === 0) {
        wrap.appendChild(infoZeile('Noch keine Vorteile gewählt.'));
      } else {
        for (const eintrag of [...char.vorteile]) {
          const n = name(eintrag);
          const v = db.vorteilByName[n];
          const kosten = (typeof eintrag === 'object' && typeof eintrag.kosten === 'number') ? eintrag.kosten : (v ? v.kosten : 0);
          const komm = (typeof eintrag === 'object' && eintrag.kommentar) ? ` (${eintrag.kommentar})` : '';
          wrap.appendChild(aktionZeile(`${n}${komm}, ${kosten} EP — entfernen`, () => {
            char.vorteile = char.vorteile.filter(x => name(x) !== n);
            const f2 = editor.aktualisiere();
            screen.refresh();
            sprache.sage(`${n} entfernt, ${f2} EP frei.`);
          }, 'Vorteil entfernen'));
        }
      }

      return wrap;
    },
  };
}
