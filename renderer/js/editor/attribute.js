/**
 * Skularistool — Editor-Bereich: Attribute
 * Acht verstellbare Wertzeilen (Pfeil links/rechts) mit Live-EP-Ansage.
 */
import * as editor from './editor.js';
import { wertZeile, abschnittTitel, infoZeile } from './widgets.js';

export function attributeScreen() {
  return {
    title: '',
    build() {
      const char = editor.getChar();
      const db = editor.getDb();
      const frei = editor.aktualisiere();
      this.title = `Attribute, ${frei} EP frei`;

      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';
      wrap.appendChild(abschnittTitel('Attribute'));
      wrap.appendChild(infoZeile(
        'Pfeil links und rechts verändern den Wert, Pfeil hoch und runter wechseln die Zeile.'
      ));

      for (const a of db.attribute) {
        wrap.appendChild(wertZeile({
          label: `${a.anzeigename} ${a.name}`,
          get: () => char.attribute[a.name] || 0,
          set: (v) => { char.attribute[a.name] = v; },
          min: 0,
          max: 20,
          onChange: () => editor.epAnsage(),
        }));
      }
      return wrap;
    },
  };
}
