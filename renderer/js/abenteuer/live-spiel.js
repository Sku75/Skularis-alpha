/**
 * Skularistool — Abenteuer-Bereich: Live-Spiel.
 * Würfelbecher (Schnellwürfe + freier Wurf, Ergebnis ansagen und nachlesbar)
 * und Charakterstatus (Ressourcenzähler verstellbar, Kampfwerte und Waffe lesbar).
 */
import * as screen from '../ui/screen.js';
import * as sprache from '../sprache.js';
import * as sounds from '../sounds.js';
import { menuScreen } from '../ui/menu-screen.js';
import { wertZeile, infoZeile, abschnittTitel } from '../editor/widgets.js';
import { zahlDialog } from '../ui/dialog.js';
import { auswahlScreen } from '../ui/auswahl-screen.js';
import { abgeleiteteWerte } from '../core/regeln.js';
import { protokolliere } from '../core/abenteuer.js';
import { getAbenteuer, speichere } from './state.js';

const RES_NAME = {
  Wunden: 'Wunden', Erschoepfung: 'Erschöpfung', SchiP: 'Schicksalspunkte',
  AsP: 'Astralpunkte', KaP: 'Karmapunkte', GuP: 'Gunstpunkte',
};
const ATTR_NAME = {
  KO: 'Konstitution', MU: 'Mut', GE: 'Gewandtheit', KK: 'Körperkraft',
  IN: 'Intuition', KL: 'Klugheit', CH: 'Charisma', FF: 'Fingerfertigkeit',
};

export function liveSpielScreen() {
  return menuScreen({
    title: 'Live-Spiel',
    subtitle: 'Würfeln und Charakterstatus. Escape zurück.',
    items: [
      { label: 'Schnellwurf 1 W6', onSelect: () => wuerfeln(1, 6, 0) },
      { label: 'Schnellwurf 1 W20', onSelect: () => wuerfeln(1, 20, 0) },
      { label: 'Schnellwurf 3 W20', onSelect: () => wuerfeln(3, 20, 0) },
      { label: 'Freier Wurf', hint: 'Anzahl, Würfeltyp und Modifikator wählen', onSelect: freierWurf },
      { label: 'Charakterstatus', hint: 'Wunden, Energien, Kampfwerte, Waffe', onSelect: () => screen.push(charakterstatusScreen()) },
    ],
  });
}

async function freierWurf() {
  const anzahl = await zahlDialog({ titel: 'Freier Wurf', label: 'Anzahl der Würfel', wert: 1, min: 1, max: 50 });
  if (anzahl === null) return;
  auswahlScreen({
    titel: 'Würfeltyp wählen',
    eintraege: [{ label: 'W6', wert: 6 }, { label: 'W20', wert: 20 }],
    onWahl: async (seiten) => {
      const mod = await zahlDialog({ titel: 'Modifikator', label: 'Modifikator, 0 wenn keiner', wert: 0, min: -100, max: 100 });
      if (mod === null) return;
      wuerfeln(anzahl, seiten, mod);
    },
  });
}

function wuerfeln(anzahl, seiten, mod) {
  const a = getAbenteuer();
  const wuerfe = [];
  for (let i = 0; i < anzahl; i++) wuerfe.push(1 + Math.floor(Math.random() * seiten));
  const summe = wuerfe.reduce((s, n) => s + n, 0) + mod;
  const bez = `${anzahl} W ${seiten}${mod ? (mod > 0 ? ` plus ${mod}` : ` minus ${-mod}`) : ''}`;
  sounds.playClick();
  protokolliere(a, `Wurf ${bez}: ${wuerfe.join(', ')}, Summe ${summe}.`);
  speichere();
  screen.push(becherScreen(bez, wuerfe, mod, summe));
}

function becherScreen(bez, wuerfe, mod, summe) {
  const items = wuerfe.map((r, i) => ({ label: `Würfel ${i + 1}: ${r}`, onSelect: () => {} }));
  if (mod) items.push({ label: `Modifikator: ${mod > 0 ? 'plus ' : 'minus '}${Math.abs(mod)}`, onSelect: () => {} });
  items.push({ label: `Summe: ${summe}`, onSelect: () => {} });
  return menuScreen({
    title: `Würfelbecher, ${bez}, Summe ${summe}`,
    subtitle: 'Pfeiltasten lesen die einzelnen Würfel. Escape zurück.',
    items,
  });
}

function charakterstatusScreen() {
  return {
    title: 'Charakterstatus',
    build() {
      const a = getAbenteuer();
      const char = a.charakter;
      const w = abgeleiteteWerte(char);

      const wrap = document.createElement('div');
      wrap.className = 'db-menu ed-bereich';
      wrap.appendChild(abschnittTitel('Charakterstatus'));

      // Ressourcen, verstellbar
      for (const key of Object.keys(a.ressourcen)) {
        const r = a.ressourcen[key];
        const name = RES_NAME[key] || key;
        wrap.appendChild(wertZeile({
          label: name,
          get: () => r.aktuell,
          set: (v) => { r.aktuell = v; },
          min: 0,
          max: (r.max !== undefined) ? r.max : 999,
          suffix: () => (r.max !== undefined ? `von ${r.max}` : ''),
          onChange: () => { protokolliere(a, `${name} auf ${r.aktuell}.`); speichere(); return (r.max !== undefined ? `von ${r.max}` : ''); },
        }));
      }

      // Kampfwerte, nur lesbar
      wrap.appendChild(abschnittTitel('Werte zum Lesen'));
      for (const k of ['KO', 'MU', 'GE', 'KK', 'IN', 'KL', 'CH', 'FF']) {
        wrap.appendChild(infoZeile(`${ATTR_NAME[k]} ${k}: ${char.attribute[k] || 0}`));
      }
      wrap.appendChild(infoZeile(`Wundschwelle: ${w.WS}`));
      wrap.appendChild(infoZeile(`Magieresistenz: ${w.MR}`));
      wrap.appendChild(infoZeile(`Geschwindigkeit: ${w.GS}`));
      wrap.appendChild(infoZeile(`Initiative: ${w.INI}`));
      wrap.appendChild(infoZeile(`Schadensbonus: ${w.SB}`));
      wrap.appendChild(infoZeile(`Durchhaltevermögen: ${w.DH}`));
      wrap.appendChild(infoZeile(`Rüstungsschutz: ${w.RS}, Behinderung: ${w.BE}`));

      // Ausgerüstete Waffen, nur lesbar
      const waffen = (char.waffen || []).filter(x => x.name);
      if (waffen.length) {
        wrap.appendChild(abschnittTitel('Ausgerüstete Waffen'));
        for (const wa of waffen) {
          const schaden = `${wa.wuerfel || 0} W ${wa.wuerfelSeiten || 6}${wa.plus ? ` plus ${wa.plus}` : ''}`;
          wrap.appendChild(infoZeile(`${wa.name}: Schaden ${schaden}, Reichweite ${wa.rw || 0}`));
        }
      }
      return wrap;
    },
  };
}
