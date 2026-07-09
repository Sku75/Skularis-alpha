/**
 * Skularistool — Ilaris-Rechenkern (originalgetreu zu Sephrasto)
 * EP-Kosten, abgeleitete Werte, Voraussetzungsprüfung. Reine Funktionen,
 * in Node testbar. Datengetrieben aus der transformierten Datenbank (db.js).
 */

// --- EP-Kosten-Grundformeln ---
// Steigerung eines Werts von 0 auf W kostet die Summe SF·v für v = 1..W.
export function summenKosten(sf, wert) {
  const w = Math.max(0, wert | 0);
  return sf * w * (w + 1) / 2;
}

export function kostenAttribut(db, name, wert) {
  const sf = db.attributByName[name]?.steigerungsfaktor ?? 16;
  return summenKosten(sf, wert);
}

export function kostenFertigkeit(sf, wert) {
  return summenKosten(sf, wert);
}

export function kostenEnergie(sf, punkte) {
  return summenKosten(sf, punkte);
}

/**
 * Talent-Kosten: feste kosten (>=0) oder regelbasiert
 * (SteigerungsfaktorMulti · SF der Fertigkeit; verbilligt entsprechend).
 */
export function kostenTalent(talent, parentSF, db, verbilligt = null) {
  if (!talent) return 0;
  if (talent.kosten >= 0) return talent.kosten;
  const sf = (typeof talent.steigerungsfaktor === 'number') ? talent.steigerungsfaktor : parentSF;
  const istVerbilligt = verbilligt === null ? talent.verbilligt : verbilligt;
  const multi = istVerbilligt ? db.talentMultiVerbilligt : db.talentMulti;
  return multi * sf;
}

/**
 * Freie Fertigkeiten: 4/8/16 je Stufe. Kostenlos sind nur bis zu
 * `Anzahl Kostenlos` Fertigkeiten mit wert==3 (die Muttersprache),
 * exakt wie in Sephrasto (Charakter.py).
 */
export function kostenFreieFertigkeiten(freie, db) {
  let numKostenlos = 0;
  let summe = 0;
  for (const ff of freie || []) {
    const w = Math.max(0, Math.min(3, ff.wert | 0));
    let k = 0;
    for (let s = 0; s < w; s++) k += db.freieKosten[s] || 0;
    if (w === 3 && numKostenlos < (db.freieKostenlos || 0)) { numKostenlos++; continue; }
    summe += k;
  }
  return summe;
}

/**
 * Gesamt ausgegebene EP eines Charakters, mit Aufschlüsselung.
 * @returns {{ total, attribute, vorteile, fertigkeiten, talente, uebernat, uebernatTalente, energien, freie }}
 */
export function gesamtEP(char, db) {
  const b = { attribute: 0, vorteile: 0, fertigkeiten: 0, talente: 0, uebernat: 0, uebernatTalente: 0, energien: 0, freie: 0 };

  // Kostenlose Heimat-Talente (Gebräuche der Heimat ist gratis).
  const gratisTalente = new Set();
  if (char.heimat) gratisTalente.add('Gebräuche: ' + char.heimat);
  // Jedes Talent wird nur EINMAL bezahlt, auch wenn es (zur Anzeige) unter
  // mehreren Fertigkeiten geführt wird. Gratis-Talente gelten als bezahlt.
  const bezahlt = new Set(gratisTalente);

  // Attribute
  for (const [name, wert] of Object.entries(char.attribute || {})) {
    b.attribute += kostenAttribut(db, name, wert);
  }

  // Vorteile
  for (const eintrag of char.vorteile || []) {
    const name = typeof eintrag === 'string' ? eintrag : eintrag.name;
    const v = db.vorteilByName[name];
    if (!v) continue;
    if (v.variableKosten && typeof eintrag === 'object' && typeof eintrag.kosten === 'number') {
      b.vorteile += eintrag.kosten;
    } else {
      b.vorteile += v.kosten;
    }
  }

  // Profane Fertigkeiten + Talente
  let hoechsteNahkampf = 0;
  for (const [fname, fe] of Object.entries(char.fertigkeiten || {})) {
    const f = db.fertigkeitByName[fname];
    const sf = f?.steigerungsfaktor ?? 1;
    b.fertigkeiten += kostenFertigkeit(sf, fe.wert || 0);
    if (f && f.kampffertigkeit === 1) hoechsteNahkampf = Math.max(hoechsteNahkampf, fe.wert || 0);
    for (const tname of fe.talente || []) {
      if (bezahlt.has(tname)) continue;
      bezahlt.add(tname);
      b.talente += kostenTalent(db.talentByName[tname], sf, db);
    }
  }
  // Aufschlag auf die höchste Nahkampf-Kampffertigkeit: 2 · Dreieckssumme(wert)
  // (Sephrasto Core/Fertigkeit.py: getHöchsteKampffertigkeit).
  b.fertigkeiten += 2 * (hoechsteNahkampf * (hoechsteNahkampf + 1) / 2);

  // Übernatürliche Fertigkeiten + Talente (Zauber/Liturgien)
  for (const [uname, ue] of Object.entries(char.uebernatuerlich || {})) {
    const u = db.uebernatByName[uname];
    const sf = u?.steigerungsfaktor ?? 2;
    b.uebernat += kostenFertigkeit(sf, ue.wert || 0);
    for (const tname of ue.talente || []) {
      if (bezahlt.has(tname)) continue;
      bezahlt.add(tname);
      b.uebernatTalente += kostenTalent(db.talentByName[tname], sf, db);
    }
  }

  // Energien (gekaufte Punkte über der Basis)
  for (const [ename, ee] of Object.entries(char.energien || {})) {
    const sf = db.energieByName[ename]?.steigerungsfaktor ?? 1;
    b.energien += kostenEnergie(sf, ee.gekauft || 0);
  }

  // Freie Fertigkeiten
  b.freie = kostenFreieFertigkeiten(char.freieFertigkeiten || [], db);

  b.total = b.attribute + b.vorteile + b.fertigkeiten + b.talente + b.uebernat + b.uebernatTalente + b.energien + b.freie;
  return b;
}

// --- Abgeleitete Werte (Ilaris-Formeln) ---

export function getRuestungswerte(char) {
  // Erste angelegte Rüstung bestimmt RS/BE (Sephrasto: getRüstung()[0]).
  const r = (char.ruestungen || []).find(x => x && (x.rs || x.be)) || null;
  if (!r) return { rs: 0, be: 0 };
  let rs = 0;
  if (typeof r.rs === 'number') rs = r.rs;
  else if (typeof r.rsGesamt === 'number') rs = r.rsGesamt;
  else if (typeof r.rs === 'string') {
    const zonen = r.rs.split('/').map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
    if (zonen.length) rs = Math.round(zonen.reduce((s, n) => s + n, 0) / zonen.length);
  }
  return { rs, be: r.be || 0 };
}

function finanzenIndex(char) {
  // 0 Sehr Reich .. 2 Normal .. 4 Sehr Arm
  return typeof char.finanzen === 'number' ? char.finanzen : 2;
}

export function abgeleiteteWerte(char) {
  const a = char.attribute || {};
  const at = k => a[k] || 0;
  const { rs, be } = getRuestungswerte(char);
  const fin = finanzenIndex(char);

  const ws = 4 + Math.floor(at('KO') / 4) + rs;
  const mr = 4 + Math.floor(at('MU') / 4);
  const gs = Math.max(4 + Math.floor(at('GE') / 4) - be, 1);
  const sb = Math.floor(at('KK') / 4);
  const ini = at('IN');
  const dh = Math.max(at('KO') - 2 * be, 1);
  const schipBasis = 4 + (char.schipBonus || 0); // Vorteile Glück etc. modifizieren schipBonus
  const schip = schipBasis + (fin >= 2 ? (fin - 2) : -((2 - fin) * 2));

  return { WS: ws, MR: mr, GS: gs, SB: sb, INI: ini, DH: dh, RS: rs, BE: be, SchiP: schip };
}

// --- Voraussetzungsprüfung ---
// Grammatik: Komma = UND; " ODER " = alternative Gruppe; Atome:
// "Vorteil X", "Kein Vorteil X", "Attribut ABK n", "Fertigkeit X n",
// "Talent X", "Kein Talent X". Unbekannte Atome gelten als erfüllt.

function hatVorteil(char, name) {
  return (char.vorteile || []).some(v => (typeof v === 'string' ? v : v.name) === name);
}
function hatTalent(char, name) {
  const inMap = m => Object.values(m || {}).some(e => (e.talente || []).includes(name));
  return inMap(char.fertigkeiten) || inMap(char.uebernatuerlich);
}

function pruefeAtom(char, db, atom) {
  atom = atom.trim();
  if (!atom) return true;
  let m;
  if ((m = atom.match(/^Kein Vorteil (.+)$/))) return !hatVorteil(char, m[1].trim());
  if ((m = atom.match(/^Vorteil (.+)$/))) return hatVorteil(char, m[1].trim());
  if ((m = atom.match(/^Kein Talent (.+)$/))) return !hatTalent(char, m[1].trim());
  if ((m = atom.match(/^Talent (.+)$/))) return hatTalent(char, m[1].trim());
  if ((m = atom.match(/^Attribut ([A-ZÄÖÜ]{2}) (\d+)$/))) return (char.attribute?.[m[1]] || 0) >= parseInt(m[2], 10);
  if ((m = atom.match(/^Fertigkeit (.+) (\d+)$/))) {
    const fw = (char.fertigkeiten?.[m[1].trim()]?.wert) || (char.uebernatuerlich?.[m[1].trim()]?.wert) || 0;
    return fw >= parseInt(m[2], 10);
  }
  return true; // Unbekanntes Atom nicht blockieren
}

export function pruefeVoraussetzungen(char, db, voraussetzungen) {
  const text = String(voraussetzungen || '').trim();
  if (!text) return true;
  // UND über Kommas; jede Klausel darf ODER-Alternativen enthalten
  const klauseln = text.split(',').map(s => s.trim()).filter(Boolean);
  return klauseln.every(kl => {
    const alternativen = kl.split(/\s+ODER\s+/).map(s => s.trim());
    return alternativen.some(alt => pruefeAtom(char, db, alt));
  });
}
