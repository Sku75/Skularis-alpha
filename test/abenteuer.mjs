/**
 * Test des Abenteuer-Datenmodells: erstellen -> serialisieren -> einlesen,
 * Ressourcen aus dem Charakter, Rundlauf verlustfrei.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { transformDb } from '../renderer/js/core/db.js';
import { createCharakter, neuberechne } from '../renderer/js/core/character.js';
import { createAbenteuer, serialisiereAbenteuer, parseAbenteuer, protokolliere } from '../renderer/js/core/abenteuer.js';

const BETA = process.cwd();
const dbParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '_text',
  processEntities: { maxTotalExpansions: 100000, maxExpandedLength: 5000000 },
  isArray: (n) => ['Attribut','AbgeleiteterWert','Energie','Vorteil','Fertigkeit','Talent','ÜbernatürlicheFertigkeit','FreieFertigkeit','Waffe','Waffeneigenschaft','Rüstung','Regel','Einstellung'].includes(n) });
const db = transformDb(dbParser.parse(fs.readFileSync(path.join(BETA, 'daten/datenbank.xml'), 'utf-8')));

let ok = true;
const pruefe = (b, t) => { console.log((b ? 'OK   ' : 'FEHLER ') + t); if (!b) ok = false; };

const c = createCharakter(db, { name: 'Testheld', gesamtEP: 2000 });
c.attribute.KO = 8; c.attribute.KL = 4;
c.vorteile.push('Zauberer I'); // 8 AsP Basis
neuberechne(c, db);

const a = createAbenteuer(c, 'Testabenteuer', 'Testheld', 'C:/x/Testheld.xml');
pruefe(a.name === 'Testabenteuer' && a.spieltag === 1, 'Abenteuer angelegt, Spieltag 1');
pruefe(a.ressourcen.AsP && a.ressourcen.AsP.max === 8, `AsP aus Charakter (max ${a.ressourcen.AsP ? a.ressourcen.AsP.max : '—'})`);
pruefe(a.ressourcen.Wunden && a.ressourcen.Wunden.aktuell === 0, 'Wunden-Zähler vorhanden');
pruefe(a.inventar.geldboerse.dukaten === 0, 'Geldbörse strukturiert (Dukaten/Silber/Kupfer)');

protokolliere(a, 'Etwas getan');
pruefe(a.protokoll.length === 1 && a.protokoll[0].spieltag === 1, 'Protokoll-Eintrag');

// Rundlauf
const a2 = parseAbenteuer(serialisiereAbenteuer(a));
pruefe(a2.name === a.name && a2.spieltag === 1, 'Rundlauf: Name und Spieltag');
pruefe(a2.ressourcen.AsP.max === 8, 'Rundlauf: Ressourcen erhalten');
pruefe(a2.charakter && a2.charakter.name === 'Testheld', 'Rundlauf: Charakter-Momentaufnahme erhalten');
pruefe(a2.protokoll.length === 1, 'Rundlauf: Protokoll erhalten');

console.log('\n' + (ok ? 'ABENTEUER-MODELL OK' : 'ABENTEUER-MODELL FEHLGESCHLAGEN'));
