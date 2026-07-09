/**
 * Skularistool — Abenteuer-Bereich: Charakterbogen (nur ansehen) + Schnellauskunft.
 * Eine durchsuchbare Liste aller Bogen-Einträge: Attribute, abgeleitete Werte,
 * Fertigkeiten mit Talenten, Vorteile, Übernatürliches, freie Fertigkeiten,
 * Ausrüstung, Erfahrung. Filter oben (Schnellauskunft). Nichts ist änderbar.
 */
import { menuScreen } from '../ui/menu-screen.js';
import { abgeleiteteWerte } from '../core/regeln.js';
import { getAbenteuer } from './state.js';

const ATTR_NAME = {
  KO: 'Konstitution', MU: 'Mut', GE: 'Gewandtheit', KK: 'Körperkraft',
  IN: 'Intuition', KL: 'Klugheit', CH: 'Charisma', FF: 'Fingerfertigkeit',
};

function vName(v) { return typeof v === 'string' ? v : v.name; }

export function charakterbogenScreen() {
  const a = getAbenteuer();
  const char = a.charakter;
  const w = abgeleiteteWerte(char);
  const items = [];
  const eintrag = (label, detail) => items.push({ label, detail: detail || '', onSelect: () => {} });

  eintrag(`Charakter: ${char.name || 'ohne Namen'}`, `Spezies ${char.spezies || 'keine'}, Heimat ${char.heimat || 'keine'}`);
  eintrag(`Erfahrung: ${char.erfahrung.gesamt} gesamt, ${char.erfahrung.ausgegeben} ausgegeben`);

  for (const k of ['KO', 'MU', 'GE', 'KK', 'IN', 'KL', 'CH', 'FF']) {
    eintrag(`${ATTR_NAME[k]} ${k}: ${char.attribute[k] || 0}`);
  }
  eintrag(`Wundschwelle: ${w.WS}`);
  eintrag(`Magieresistenz: ${w.MR}`);
  eintrag(`Geschwindigkeit: ${w.GS}`);
  eintrag(`Initiative: ${w.INI}`);
  eintrag(`Schadensbonus: ${w.SB}`);
  eintrag(`Durchhaltevermögen: ${w.DH}`);
  eintrag(`Rüstungsschutz: ${w.RS}`);
  eintrag(`Behinderung: ${w.BE}`);
  eintrag(`Schicksalspunkte: ${w.SchiP}`);

  for (const [name, fe] of Object.entries(char.fertigkeiten || {})) {
    if ((fe.wert || 0) > 0 || (fe.talente && fe.talente.length)) {
      eintrag(`Fertigkeit ${name}: ${fe.wert || 0}`, (fe.talente || []).length ? `Talente: ${fe.talente.join(', ')}` : '');
    }
  }
  for (const [name, ue] of Object.entries(char.uebernatuerlich || {})) {
    if ((ue.wert || 0) > 0 || (ue.talente && ue.talente.length)) {
      eintrag(`Übernatürlich ${name}: ${ue.wert || 0}`, (ue.talente || []).length ? `${ue.talente.join(', ')}` : '');
    }
  }
  for (const v of char.vorteile || []) {
    const n = vName(v);
    const komm = (typeof v === 'object' && v.kommentar) ? ` (${v.kommentar})` : '';
    eintrag(`Vorteil: ${n}${komm}`);
  }
  for (const ff of char.freieFertigkeiten || []) {
    if (ff.name) eintrag(`Freie Fertigkeit ${ff.name}: ${ff.wert || 0}`);
  }
  for (const wa of (char.waffen || []).filter(x => x.name)) {
    eintrag(`Waffe: ${wa.name}`, `Schaden ${wa.wuerfel || 0} W ${wa.wuerfelSeiten || 6}${wa.plus ? ` plus ${wa.plus}` : ''}, Reichweite ${wa.rw || 0}`);
  }
  for (const r of (char.ruestungen || []).filter(x => x.name)) {
    eintrag(`Rüstung: ${r.name}`, `RS-Zonen ${r.rs}, Behinderung ${r.be}`);
  }

  return menuScreen({
    title: 'Charakterbogen',
    subtitle: 'Nur zum Ansehen. Oben Filtern für die Schnellauskunft. Shift und Pfeil-runter liest Details. Escape zurück.',
    items,
    filter: true,
  });
}
