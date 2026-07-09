/**
 * Skularistool — Sephrasto-Charakter-XML lesen und schreiben.
 * Erzeugt exakt das <Charakter>-Format von Sephrasto (DatenbankVersion 3),
 * damit gespeicherte Dateien im Original-Sephrasto geöffnet werden können.
 * Parsen im Browser über DOMParser (keine Node-Abhängigkeit).
 */

import { createCharakter, ATTRIBUTE, aktualisiereVorteilEffekte } from './character.js';
import { abgeleiteteWerte } from './regeln.js';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Serialisieren -------------------------------------------------------

export function serialisiere(c, db) {
  aktualisiereVorteilEffekte(c, db);
  const schip = abgeleiteteWerte(c).SchiP;
  const L = [];
  L.push('<Charakter>');
  L.push('  <Version>');
  L.push('    <DatenbankVersion>3</DatenbankVersion>');
  L.push('    <NutzerDatenbankCRC>0</NutzerDatenbankCRC>');
  L.push('    <NutzerDatenbankName></NutzerDatenbankName>');
  L.push('    <Plugins></Plugins>');
  L.push('  </Version>');
  L.push('  <Beschreibung>');
  L.push(`    <Name>${esc(c.name)}</Name>`);
  L.push(`    <Spezies>${esc(c.spezies)}</Spezies>`);
  L.push(`    <Status>${c.status ?? 2}</Status>`);
  L.push(`    <Kurzbeschreibung>${esc(c.kurzbeschreibung)}</Kurzbeschreibung>`);
  L.push(`    <SchiP>${schip}</SchiP>`);
  L.push(`    <Finanzen>${c.finanzen ?? 2}</Finanzen>`);
  L.push(`    <Heimat>${esc(c.heimat)}</Heimat>`);
  L.push('    <Eigenheiten/>');
  L.push('  </Beschreibung>');

  L.push('  <Attribute>');
  for (const a of ATTRIBUTE) L.push(`    <${a}>${c.attribute[a] || 0}</${a}>`);
  L.push('  </Attribute>');

  L.push('  <Energien>');
  L.push(`    <AsP wert="${c.energien?.AsP?.gekauft || 0}"/>`);
  L.push(`    <KaP wert="${c.energien?.KaP?.gekauft || 0}"/>`);
  if (c.energien?.GuP) L.push(`    <GuP wert="${c.energien.GuP.gekauft || 0}"/>`);
  L.push('  </Energien>');

  L.push('  <Vorteile minderpakt="">');
  for (const eintrag of c.vorteile) {
    if (typeof eintrag === 'string') {
      L.push(`    <Vorteil>${esc(eintrag)}</Vorteil>`);
    } else {
      const attrs = [];
      if (typeof eintrag.kosten === 'number') attrs.push(`variableKosten="${eintrag.kosten}"`);
      if (eintrag.kommentar) attrs.push(`kommentar="${esc(eintrag.kommentar)}"`);
      L.push(`    <Vorteil${attrs.length ? ' ' + attrs.join(' ') : ''}>${esc(eintrag.name)}</Vorteil>`);
    }
  }
  L.push('  </Vorteile>');

  L.push('  <Fertigkeiten>');
  for (const f of db.fertigkeiten) {
    const fe = c.fertigkeiten[f.name] || { wert: 0, talente: [] };
    L.push(`    <Fertigkeit name="${esc(f.name)}" wert="${fe.wert || 0}">`);
    if ((fe.talente || []).length) {
      L.push('      <Talente>');
      for (const t of fe.talente) L.push(`        <Talent name="${esc(t)}"/>`);
      L.push('      </Talente>');
    } else {
      L.push('      <Talente/>');
    }
    L.push('    </Fertigkeit>');
  }
  for (const ff of c.freieFertigkeiten || []) {
    L.push(`    <FreieFertigkeit name="${esc(ff.name)}" wert="${ff.wert || 0}"/>`);
  }
  L.push('  </Fertigkeiten>');

  L.push('  <Objekte>');
  L.push('    <Zonensystem>0</Zonensystem>');
  L.push('    <Rüstungen>');
  for (const r of c.ruestungen || []) {
    L.push(`      <Rüstung name="${esc(r.name)}" be="${r.be || 0}" rs="${esc(r.rs || '0/0/0/0/0/0')}"/>`);
  }
  L.push('    </Rüstungen>');
  L.push('    <Waffen>');
  for (const w of c.waffen || []) {
    L.push(`      <Waffe name="${esc(w.name)}" id="${esc(w.id || w.name)}" würfel="${w.wuerfel || 0}" würfelSeiten="${w.wuerfelSeiten || 6}" plus="${w.plus || 0}" eigenschaften="${esc(w.eigenschaften || '')}" härte="${w.haerte || 6}" rw="${w.rw || 0}" kampfstil="${esc(w.kampfstil || '')}" wm="${w.wm || 0}" typ="${esc(w.typ || 'Nah')}"/>`);
  }
  L.push('    </Waffen>');
  L.push('    <Ausrüstung>');
  for (const a of c.ausruestung || []) L.push(`      <Ausrüstungsstück>${esc(a)}</Ausrüstungsstück>`);
  L.push('    </Ausrüstung>');
  L.push('  </Objekte>');

  const ufNamen = Object.keys(c.uebernatuerlich || {});
  if (ufNamen.length) {
    L.push('  <ÜbernatürlicheFertigkeiten>');
    for (const name of ufNamen) {
      const ue = c.uebernatuerlich[name];
      L.push(`    <ÜbernatürlicheFertigkeit name="${esc(name)}" wert="${ue.wert || 0}" exportieren="0">`);
      if ((ue.talente || []).length) {
        L.push('      <Talente>');
        for (const t of ue.talente) L.push(`        <Talent name="${esc(t)}"/>`);
        L.push('      </Talente>');
      } else {
        L.push('      <Talente/>');
      }
      L.push('    </ÜbernatürlicheFertigkeit>');
    }
    L.push('  </ÜbernatürlicheFertigkeiten>');
  } else {
    L.push('  <ÜbernatürlicheFertigkeiten/>');
  }

  L.push('  <Erfahrung>');
  L.push(`    <Gesamt>${c.erfahrung?.gesamt || 0}</Gesamt>`);
  L.push(`    <Ausgegeben>${c.erfahrung?.ausgegeben || 0}</Ausgegeben>`);
  L.push('  </Erfahrung>');
  L.push('  <Notiz/>');
  L.push('  <Einstellungen>');
  L.push('    <VoraussetzungenPrüfen>1</VoraussetzungenPrüfen>');
  L.push('    <Charakterbogen>Standard Charakterbogen</Charakterbogen>');
  L.push('    <FinanzenAnzeigen>1</FinanzenAnzeigen>');
  L.push('    <ÜbernatürlichesPDFSpalteAnzeigen>0</ÜbernatürlichesPDFSpalteAnzeigen>');
  L.push('    <RegelnAnhängen>1</RegelnAnhängen>');
  L.push('    <RegelnGrösse>0</RegelnGrösse>');
  L.push('    <FormularEditierbarkeit>0</FormularEditierbarkeit>');
  L.push('    <Hausregeln></Hausregeln>');
  L.push('  </Einstellungen>');
  L.push('  <BeschreibungDetails>');
  L.push('    <Kultur/>');
  L.push('    <Profession></Profession>');
  L.push('  </BeschreibungDetails>');
  L.push('</Charakter>');
  return L.join('\n') + '\n';
}

// --- Parsen --------------------------------------------------------------

const kind = (el, tag) => el ? el.getElementsByTagName(tag) : [];
const kind1 = (el, tag) => kind(el, tag)[0] || null;
const txt = (el, tag) => { const k = kind1(el, tag); return k ? k.textContent : ''; };
const zahl = (el, tag, d = 0) => { const v = parseInt(txt(el, tag), 10); return Number.isNaN(v) ? d : v; };

function talNamen(container) {
  const t = kind1(container, 'Talente');
  if (!t) return [];
  return Array.from(t.getElementsByTagName('Talent')).map(x => x.getAttribute('name')).filter(Boolean);
}

export function parse(xml, db) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('Ungültige XML-Datei.');
  }
  const root = doc.getElementsByTagName('Charakter')[0];
  if (!root) throw new Error('Keine Sephrasto-Charakterdatei.');

  const c = createCharakter(db);
  const besch = kind1(root, 'Beschreibung');
  c.name = txt(besch, 'Name');
  c.spezies = txt(besch, 'Spezies');
  c.heimat = txt(besch, 'Heimat') || 'Mittelreich';
  c.finanzen = zahl(besch, 'Finanzen', 2);
  c.status = zahl(besch, 'Status', 2);
  c.kurzbeschreibung = txt(besch, 'Kurzbeschreibung');

  const at = kind1(root, 'Attribute');
  for (const a of ATTRIBUTE) c.attribute[a] = zahl(at, a, 0);

  const vBlock = kind1(root, 'Vorteile');
  c.vorteile = [];
  if (vBlock) {
    for (const v of Array.from(vBlock.getElementsByTagName('Vorteil'))) {
      const name = v.textContent.trim();
      if (!name) continue;
      const vk = v.getAttribute('variableKosten');
      if (vk !== null) {
        c.vorteile.push({ name, kosten: parseInt(vk, 10) || 0, kommentar: v.getAttribute('kommentar') || '' });
      } else {
        c.vorteile.push(name);
      }
    }
  }

  const fBlock = kind1(root, 'Fertigkeiten');
  c.fertigkeiten = {};
  c.freieFertigkeiten = [];
  if (fBlock) {
    for (const f of Array.from(fBlock.getElementsByTagName('Fertigkeit'))) {
      c.fertigkeiten[f.getAttribute('name')] = {
        wert: parseInt(f.getAttribute('wert'), 10) || 0, talente: talNamen(f),
      };
    }
    for (const ff of Array.from(fBlock.getElementsByTagName('FreieFertigkeit'))) {
      c.freieFertigkeiten.push({ name: ff.getAttribute('name') || '', wert: parseInt(ff.getAttribute('wert'), 10) || 0 });
    }
  }

  const uBlock = kind1(root, 'ÜbernatürlicheFertigkeiten');
  c.uebernatuerlich = {};
  if (uBlock) {
    for (const u of Array.from(uBlock.getElementsByTagName('ÜbernatürlicheFertigkeit'))) {
      c.uebernatuerlich[u.getAttribute('name')] = {
        wert: parseInt(u.getAttribute('wert'), 10) || 0, talente: talNamen(u),
      };
    }
  }

  const eBlock = kind1(root, 'Energien');
  if (eBlock) {
    for (const k of ['AsP', 'KaP', 'GuP']) {
      const e = kind1(eBlock, k);
      if (e) c.energien[k] = { gekauft: parseInt(e.getAttribute('wert'), 10) || 0 };
    }
  }

  const erf = kind1(root, 'Erfahrung');
  c.erfahrung = { gesamt: zahl(erf, 'Gesamt', 0), ausgegeben: zahl(erf, 'Ausgegeben', 0) };

  aktualisiereVorteilEffekte(c, db);
  return c;
}
