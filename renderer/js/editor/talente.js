/**
 * Skularistool — Talent-Verwaltung für eine (übernatürliche) Fertigkeit.
 * Talent hinzufügen (Auswahl mit Filter) + vorhandene entfernen. Live-EP.
 * Wird von Fertigkeiten- und Übernatürlich-Bereich genutzt.
 */
import * as editor from './editor.js';
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { aktionZeile, abschnittTitel, infoZeile } from './widgets.js';
import { auswahlDialog } from '../ui/dialog.js';
import { kostenTalent } from '../core/regeln.js';

export function talentScreen(fname, isUeber) {
  return {
    title: '',
    build() {
      const char = editor.getChar();
      const db = editor.getDb();
      const fdef = isUeber ? db.uebernatByName[fname] : db.fertigkeitByName[fname];
      const map = isUeber ? char.uebernatuerlich : char.fertigkeiten;
      if (!map[fname]) map[fname] = { wert: 0, talente: [] };
      const eintrag = map[fname];
      const sf = fdef ? fdef.steigerungsfaktor : (isUeber ? 2 : 1);

      const frei = editor.aktualisiere();
      this.title = `Talente ${fname}, ${frei} EP frei`;

      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';
      wrap.appendChild(abschnittTitel(`Talente: ${fname}`));

      const alle = db.talenteByFertigkeit[fname] || [];
      const offen = alle.filter(t => !eintrag.talente.includes(t.name));

      wrap.appendChild(aktionZeile(
        `Talent hinzufügen (${offen.length} verfügbar)`,
        async () => {
          if (!offen.length) { sprache.sage('Keine weiteren Talente verfügbar.'); return; }
          const eintraege = offen.map(t => {
            const k = kostenTalent(t, sf, db);
            return { label: `${t.name}, ${k} EP`, wert: t.name };
          });
          const val = await auswahlDialog({ titel: `Talent für ${fname}`, eintraege });
          if (val) {
            eintrag.talente.push(val);
            const f2 = editor.aktualisiere();
            screen.refresh();
            sprache.sage(`${val} hinzugefügt, ${f2} EP frei.`);
          }
        },
        'Öffnet eine durchsuchbare Liste',
      ));

      if (eintrag.talente.length === 0) {
        wrap.appendChild(infoZeile('Noch keine Talente gewählt.'));
      } else {
        for (const tname of [...eintrag.talente]) {
          wrap.appendChild(aktionZeile(`${tname} — entfernen`, () => {
            eintrag.talente = eintrag.talente.filter(x => x !== tname);
            const f2 = editor.aktualisiere();
            screen.refresh();
            sprache.sage(`${tname} entfernt, ${f2} EP frei.`);
          }, 'Talent entfernen'));
        }
      }

      return wrap;
    },
  };
}
