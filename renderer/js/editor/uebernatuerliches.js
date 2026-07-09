/**
 * Skularistool — Editor-Bereich: Übernatürliches (Zauber, Liturgien, Traditionen)
 * Übernatürliche Fertigkeit hinzufügen; je Fertigkeit Wert (Links/Rechts) und
 * Talente (Eingabetaste = Zauber/Liturgien). Live-EP.
 */
import * as editor from './editor.js';
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { wertZeile, aktionZeile, abschnittTitel, infoZeile } from './widgets.js';
import { auswahlDialog } from '../ui/dialog.js';

export function uebernatuerlichesScreen() {
  return {
    title: '',
    build() {
      const char = editor.getChar();
      const db = editor.getDb();
      const frei = editor.aktualisiere();
      this.title = `Übernatürliches, ${frei} EP frei`;

      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';
      wrap.appendChild(abschnittTitel('Übernatürliches: Zauber, Liturgien, Traditionen'));
      wrap.appendChild(infoZeile(
        'Erst die passende übernatürliche Fertigkeit hinzufügen, dann Wert mit Links und Rechts, Talente mit Eingabetaste.'
      ));

      wrap.appendChild(aktionZeile('Übernatürliche Fertigkeit hinzufügen', async () => {
        const haben = new Set(Object.keys(char.uebernatuerlich));
        const offen = db.uebernat.filter(u => !haben.has(u.name));
        const eintraege = offen.map(u => ({ label: `${u.name}, Steigerungsfaktor ${u.steigerungsfaktor}`, wert: u.name }));
        const val = await auswahlDialog({ titel: 'Übernatürliche Fertigkeit', eintraege });
        if (!val) return;
        char.uebernatuerlich[val] = { wert: 0, talente: [] };
        screen.refresh();
        sprache.sage(`${val} hinzugefügt.`);
      }, 'Öffnet eine durchsuchbare Liste'));

      const namen = Object.keys(char.uebernatuerlich);
      if (namen.length === 0) {
        wrap.appendChild(infoZeile('Noch keine übernatürlichen Fertigkeiten.'));
      } else {
        for (const uname of namen) {
          const eintrag = char.uebernatuerlich[uname];
          const udef = db.uebernatByName[uname];
          const attrMax = udef ? Math.max(0, ...udef.attribute.map(a => char.attribute[a] || 0)) + 2 : 20;

          wrap.appendChild(wertZeile({
            label: uname,
            get: () => eintrag.wert,
            set: (v) => { eintrag.wert = v; },
            min: 0,
            max: Math.max(attrMax, eintrag.wert),
            suffix: () => (eintrag.talente.length ? `${eintrag.talente.length} Talente` : ''),
            onChange: () => editor.epAnsage(),
            onActivate: () => import('./talente.js').then(m => screen.push(m.talentScreen(uname, true))),
          }));
          wrap.appendChild(aktionZeile(`${uname} entfernen`, () => {
            delete char.uebernatuerlich[uname];
            const f2 = editor.aktualisiere();
            screen.refresh();
            sprache.sage(`${uname} entfernt, ${f2} EP frei.`);
          }, 'Übernatürliche Fertigkeit entfernen'));
        }
      }

      return wrap;
    },
  };
}
