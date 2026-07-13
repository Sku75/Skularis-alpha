/**
 * Skularistool — Editor-Bereich: Ausrüstung
 * Waffen und Rüstungen aus der Datenbank, freie Gegenstände als Text.
 * Ausrüstung kostet keine EP (in Ilaris Geld), gehört aber zum Charakter.
 */
import * as editor from './editor.js';
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import { aktionZeile, abschnittTitel, infoZeile, verbindeDetail } from './widgets.js';
import { textDialog, jaNeinDialog } from '../ui/dialog.js';
import { auswahlScreen } from '../ui/auswahl-screen.js';

function waffeAusDb(w) {
  return {
    name: w.name, id: w.name,
    wuerfel: parseInt(w['würfel'], 10) || 0,
    wuerfelSeiten: parseInt(w['würfelSeiten'], 10) || 6,
    plus: parseInt(w.plus, 10) || 0,
    eigenschaften: '',
    haerte: parseInt(w['härte'], 10) || 6,
    rw: parseInt(w.rw, 10) || 0,
    kampfstil: '',
    wm: parseInt(w.wm, 10) || 0,
    typ: (w.fk === '1' || w.fk === 1) ? 'Fern' : 'Nah',
  };
}

function ruestungAusDb(r) {
  const zonen = ['rsBeine', 'rsLArm', 'rsRArm', 'rsBauch', 'rsBrust', 'rsKopf']
    .map(z => parseInt(r[z], 10) || 0);
  const be = Math.round(zonen.reduce((s, n) => s + n, 0) / zonen.length);
  return { name: r.name, be, rs: zonen.join('/') };
}

export function ausruestungScreen() {
  return {
    title: 'Ausrüstung',
    build() {
      const char = editor.getChar();
      const db = editor.getDb();
      char.waffen = char.waffen || [];
      char.ruestungen = char.ruestungen || [];
      char.ausruestung = char.ausruestung || [];

      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';
      wrap.appendChild(abschnittTitel('Ausrüstung'));

      // --- Waffen ---
      wrap.appendChild(aktionZeile('Waffe hinzufügen', () => {
        const eintraege = db.waffen.filter(w => w.name).map(w => ({
          label: w.name,
          wert: w.name,
          detail: `Schaden ${w['würfel'] || 0} W ${w['würfelSeiten'] || 6} plus ${w.plus || 0}. Fertigkeit ${w.fertigkeit || ''}, Talent ${w.talent || ''}.`,
        }));
        auswahlScreen({
          titel: 'Waffe wählen',
          eintraege,
          onWahl: async (val) => {
            if (!await jaNeinDialog({ titel: 'Hinzufügen', frage: `Waffe ${val} wirklich hinzufügen?` })) return;
            const w = db.waffen.find(x => x.name === val);
            char.waffen.push(waffeAusDb(w));
            screen.refresh();
            sprache.sage(`Waffe ${val} hinzugefügt.`);
          },
        });
      }, 'Aus der Waffen-Datenbank'));
      if (char.waffen.length === 0) wrap.appendChild(infoZeile('Keine Waffen.'));
      for (const w of [...char.waffen]) {
        const info = `Schaden ${w.wuerfel || 0} W ${w.wuerfelSeiten || 6}${w.plus ? ` plus ${w.plus}` : ''}, Reichweite ${w.rw || 0}, Härte ${w.haerte || 0}.`;
        wrap.appendChild(aktionZeile(`Waffe ${w.name} — entfernen`, async () => {
          if (!await jaNeinDialog({ titel: 'Entfernen', frage: `Waffe ${w.name} wirklich entfernen?` })) return;
          char.waffen = char.waffen.filter(x => x !== w);
          screen.refresh(); sprache.sage(`Waffe ${w.name} entfernt.`);
        }, 'Waffe entfernen', info));
      }

      // --- Rüstungen ---
      wrap.appendChild(aktionZeile('Rüstung hinzufügen', () => {
        const eintraege = db.ruestungen.filter(r => r.name).map(r => ({
          label: r.name,
          wert: r.name,
          detail: `Rüstungsschutz-Zonen ${ruestungAusDb(r).rs}, Behinderung ${ruestungAusDb(r).be}.`,
        }));
        auswahlScreen({
          titel: 'Rüstung wählen',
          eintraege,
          onWahl: async (val) => {
            if (!await jaNeinDialog({ titel: 'Hinzufügen', frage: `Rüstung ${val} wirklich hinzufügen?` })) return;
            const r = db.ruestungen.find(x => x.name === val);
            char.ruestungen.push(ruestungAusDb(r));
            editor.aktualisiere();
            screen.refresh();
            sprache.sage(`Rüstung ${val} hinzugefügt.`);
          },
        });
      }, 'Aus der Rüstungs-Datenbank'));
      if (char.ruestungen.length === 0) wrap.appendChild(infoZeile('Keine Rüstungen.'));
      for (const r of [...char.ruestungen]) {
        wrap.appendChild(aktionZeile(`Rüstung ${r.name}, RS-Zonen ${r.rs}, Behinderung ${r.be} — entfernen`, async () => {
          if (!await jaNeinDialog({ titel: 'Entfernen', frage: `Rüstung ${r.name} wirklich entfernen?` })) return;
          char.ruestungen = char.ruestungen.filter(x => x !== r);
          editor.aktualisiere(); screen.refresh(); sprache.sage(`Rüstung ${r.name} entfernt.`);
        }, 'Rüstung entfernen', `Rüstungsschutz-Zonen ${r.rs}, Behinderung ${r.be}.`));
      }

      // --- Gegenstände ---
      wrap.appendChild(aktionZeile('Gegenstand hinzufügen', async () => {
        const val = await textDialog({ titel: 'Gegenstand', label: 'Bezeichnung', wert: '' });
        if (!val || !val.trim()) return;
        if (!await jaNeinDialog({ titel: 'Hinzufügen', frage: `${val.trim()} wirklich hinzufügen?` })) return;
        char.ausruestung.push(val.trim()); screen.refresh(); sprache.sage(`${val.trim()} hinzugefügt.`);
      }, 'Freier Text'));
      if (char.ausruestung.length === 0) wrap.appendChild(infoZeile('Keine Gegenstände.'));
      for (const g of [...char.ausruestung]) {
        wrap.appendChild(aktionZeile(`${g} — entfernen`, async () => {
          if (!await jaNeinDialog({ titel: 'Entfernen', frage: `${g} wirklich entfernen?` })) return;
          char.ausruestung = char.ausruestung.filter(x => x !== g);
          screen.refresh(); sprache.sage(`${g} entfernt.`);
        }, 'Gegenstand entfernen'));
      }

      verbindeDetail(wrap);
      return wrap;
    },
  };
}
