/**
 * Skularistool — Editor-Bereich: Übernatürliches (Zauber, Liturgien, Traditionen)
 * Übernatürliche Fertigkeit hinzufügen; je Fertigkeit Wert (Links/Rechts) und
 * Talente (Eingabetaste = Zauber/Liturgien). Live-EP.
 */
import * as editor from './editor.js';
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { wertZeile, aktionZeile, abschnittTitel, infoZeile, verbindeDetail } from './widgets.js';
import { auswahlScreen } from '../ui/auswahl-screen.js';
import { jaNeinDialog } from '../ui/dialog.js';
import { fertigkeitBasiswert } from '../core/regeln.js';

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

      wrap.appendChild(aktionZeile('Übernatürliche Fertigkeit hinzufügen', () => {
        const haben = new Set(Object.keys(char.uebernatuerlich));
        const offen = db.uebernat.filter(u => !haben.has(u.name));
        const eintraege = offen.map(u => ({
          label: `${u.name}, Steigerungsfaktor ${u.steigerungsfaktor}`,
          wert: u.name,
          detail: u.text || '',
        }));
        auswahlScreen({
          titel: 'Übernatürliche Fertigkeit',
          eintraege,
          onWahl: async (val) => {
            if (!await jaNeinDialog({ titel: 'Hinzufügen', frage: `${val} wirklich hinzufügen?` })) return;
            char.uebernatuerlich[val] = { wert: 0, talente: [] };
            editor.aktualisiere();
            screen.refresh();
            sprache.sage(`${val} hinzugefügt.`);
          },
        });
      }, 'Öffnet eine durchsuchbare Liste'));

      const namen = Object.keys(char.uebernatuerlich);
      if (namen.length === 0) {
        wrap.appendChild(infoZeile('Noch keine übernatürlichen Fertigkeiten.'));
      } else {
        for (const uname of namen) {
          const eintrag = char.uebernatuerlich[uname];
          const udef = db.uebernatByName[uname];
          const attrMax = udef ? Math.max(0, ...udef.attribute.map(a => char.attribute[a] || 0)) + 2 : 20;

          const basis = udef ? fertigkeitBasiswert(char, udef) : 0;
          wrap.appendChild(wertZeile({
            label: `${uname}, Basiswert ${basis}`,
            get: () => eintrag.wert,
            set: (v) => { eintrag.wert = v; },
            min: 0,
            max: Math.max(attrMax, eintrag.wert),
            suffix: () => (eintrag.talente.length ? `${eintrag.talente.length} Talente` : ''),
            onChange: () => editor.epAnsage(),
            onActivate: () => import('./talente.js').then(m => screen.push(m.talentScreen(uname, true))),
            detail: () => {
              if (!udef) return '';
              const b = fertigkeitBasiswert(char, udef);
              const fw = eintrag.wert;
              const attrText = udef.attribute.map(a => `${a} ${char.attribute[a] || 0}`).join(', ');
              let d = `Probenwert ${b + fw} gleich Basiswert ${b} plus Fertigkeitswert ${fw}. `
                + `Basiswert ist der gerundete Mittelwert der Attribute ${attrText}. Steigerungsfaktor ${udef.steigerungsfaktor}.`;
              if (eintrag.talente.length) d += ` Zauber oder Liturgien: ${eintrag.talente.join(', ')}.`;
              return d;
            },
          }));
          wrap.appendChild(aktionZeile(`${uname} entfernen`, async () => {
            if (!await jaNeinDialog({ titel: 'Entfernen', frage: `${uname} wirklich entfernen?` })) return;
            delete char.uebernatuerlich[uname];
            const f2 = editor.aktualisiere();
            screen.refresh();
            sprache.sage(`${uname} entfernt, ${f2} EP frei.`);
          }, 'Übernatürliche Fertigkeit entfernen'));
        }
      }

      verbindeDetail(wrap);
      return wrap;
    },
  };
}
