/**
 * Skularistool — Editor-Bereich: Fertigkeiten und Talente
 * Jede Fertigkeit: Links/Rechts ändert den Wert, Eingabetaste öffnet ihre Talente.
 * Maximalwert nach Ilaris: höchstes zugehöriges Attribut + 2.
 */
import * as editor from './editor.js';
import * as screen from '../ui/screen.js';
import { wertZeile, abschnittTitel, infoZeile, verbindeDetail } from './widgets.js';
import { fertigkeitBasiswert } from '../core/regeln.js';

export function fertigkeitenScreen() {
  return {
    title: '',
    build() {
      const char = editor.getChar();
      const db = editor.getDb();
      const frei = editor.aktualisiere();
      this.title = `Fertigkeiten und Talente, ${frei} EP frei`;

      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';
      wrap.appendChild(abschnittTitel('Fertigkeiten und Talente'));
      wrap.appendChild(infoZeile(
        'Links und rechts ändern den Fertigkeitswert, Eingabetaste öffnet die Talente.'
      ));

      for (const f of db.fertigkeiten) {
        if (!char.fertigkeiten[f.name]) char.fertigkeiten[f.name] = { wert: 0, talente: [] };
        const eintrag = char.fertigkeiten[f.name];
        const attrMax = Math.max(0, ...f.attribute.map(a => char.attribute[a] || 0)) + 2;
        const basis = fertigkeitBasiswert(char, f);

        wrap.appendChild(wertZeile({
          label: `${f.name}, Basiswert ${basis}`,
          get: () => eintrag.wert,
          set: (v) => { eintrag.wert = v; },
          min: 0,
          max: Math.max(attrMax, eintrag.wert),
          suffix: () => (eintrag.talente.length ? `${eintrag.talente.length} Talente` : ''),
          onChange: () => editor.epAnsage(),
          onActivate: () => import('./talente.js').then(m => screen.push(m.talentScreen(f.name, false))),
          // Live-Detail: Probenwert wächst mit dem Fertigkeitswert.
          detail: () => {
            const b = fertigkeitBasiswert(char, f);
            const fw = eintrag.wert;
            const attrText = f.attribute.map(a => `${a} ${char.attribute[a] || 0}`).join(', ');
            let d = `Probenwert ${b + fw} gleich Basiswert ${b} plus Fertigkeitswert ${fw}. `
              + `Basiswert ist der gerundete Mittelwert der Attribute ${attrText}. Steigerungsfaktor ${f.steigerungsfaktor}.`;
            if (eintrag.talente.length) d += ` Talente: ${eintrag.talente.join(', ')}.`;
            return d;
          },
        }));
      }
      verbindeDetail(wrap);
      return wrap;
    },
  };
}
