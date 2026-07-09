/**
 * Skularistool — Erstellungs-Tool (freier Editor)
 * Verwaltet den aktuellen Charakter + Datenbank, den Editor-Hub (mit Live-EP),
 * das Speichern als Sephrasto-.xml und den Wechsel in die Bereiche.
 */

import * as screen from '../ui/screen.js';
import { menuScreen } from '../ui/menu-screen.js';
import * as sprache from '../sprache.js';
import * as sounds from '../sounds.js';
import { ladeDb } from '../core/db-laden.js';
import { createCharakter, neuberechne, verfuegbareEP, istZauberer } from '../core/character.js';
import { serialisiere } from '../core/sephrasto-xml.js';
import { zahlDialog } from '../ui/dialog.js';

const ipc = window.skularis?.ipc;

let db = null;
let char = null;

export function getChar() { return char; }
export function getDb() { return db; }
export function setChar(c) { char = c; }

/** Den Editor-Hub anzeigen (vom Assistenten nach der Paketauswahl genutzt). */
export function oeffneHub() {
  aktualisiere();
  screen.replace(hub);
}

/** EP neu berechnen; gibt die verfügbaren EP zurück. */
export function aktualisiere() {
  neuberechne(char, db);
  return verfuegbareEP(char);
}

/** Kurze EP-Ansage-Zusatzinfo (für wertZeile.onChange). */
export function epAnsage() {
  return `${aktualisiere()} EP frei`;
}

// --- Start: neuen Charakter anlegen ---

export async function starteNeu() {
  db = await ladeDb();
  char = createCharakter(db, { name: '', gesamtEP: 0 });
  screen.push(neuScreen());
}

/** Vorhandenen Charakter (bereits geparst) im Editor öffnen. */
export async function bearbeite(vorhandenerChar) {
  db = await ladeDb();
  char = vorhandenerChar;
  aktualisiere();
  screen.push(hub);
}

function neuScreen() {
  return {
    title: 'Neuen Charakter erstellen',
    build() {
      const wrap = document.createElement('div');
      wrap.className = 'db-menu';

      const feld = (labelText, id, typ, wert) => {
        const box = document.createElement('div');
        box.className = 'db-row ed-feld';
        const label = document.createElement('label');
        label.className = 'ed-feld__label';
        label.setAttribute('for', id);
        label.textContent = labelText;
        const input = document.createElement('input');
        input.className = 'db-input';
        input.id = id;
        input.type = typ;
        if (typ === 'number') input.inputMode = 'numeric';
        input.value = wert;
        input.setAttribute('aria-label', labelText);
        box.appendChild(label);
        box.appendChild(input);
        wrap.appendChild(box);
        return input;
      };

      const nameInput = feld('Name des Charakters', 'ed-name', 'text', char.name || '');
      const epInput = feld('Erfahrungspunkte gesamt', 'ed-gesamt', 'number', String(char.erfahrung.gesamt || 0));

      const uebernehmen = () => {
        char.name = nameInput.value.trim();
        char.erfahrung.gesamt = parseInt(epInput.value, 10) || 0;
        sounds.playClick();
        aktualisiere();
      };

      const knopf = (label, primary, onClick) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'db-btn ed-aktion' + (primary ? ' db-btn--primary' : '');
        b.textContent = label;
        b.addEventListener('click', onClick);
        wrap.appendChild(b);
        return b;
      };

      knopf('Geführte Charaktererstellung', true, () => {
        uebernehmen();
        import('./assistent.js').then(m => m.starteAssistent())
          .catch(() => { sprache.sage('Assistent wird gerade gebaut, starte freien Editor.'); screen.replace(hub); });
      });
      knopf('Freier Editor', false, () => { uebernehmen(); screen.replace(hub); });
      knopf('Abbrechen', false, () => { sounds.playSchliessen(); screen.pop(); });
      return wrap;
    },
  };
}

// --- Editor-Hub (Live-EP, Bereiche, Speichern) ---

const hub = {
  title: '',
  build() {
    const frei = aktualisiere();
    const name = char.name || 'ohne Namen';
    hub.title = `Editor: ${name}, ${frei} von ${char.erfahrung.gesamt} EP frei`;

    const zauber = istZauberer(char, db);
    const items = [
      { label: `Erfahrungspunkte: ${char.erfahrung.gesamt} gesamt, ${frei} frei`,
        hint: 'Gesamt-EP ändern', onSelect: () => aendereGesamtEP() },
      { label: 'Attribute', hint: 'Die acht Grundeigenschaften',
        onSelect: () => import('./attribute.js').then(m => screen.push(m.attributeScreen())) },
      { label: 'Fertigkeiten und Talente', hint: 'Profane Fertigkeiten und ihre Talente',
        onSelect: () => import('./fertigkeiten.js').then(m => screen.push(m.fertigkeitenScreen()))
          .catch(() => sprache.sage('Fertigkeiten-Bereich wird gerade gebaut.')) },
      { label: 'Vorteile', hint: 'Vor- und Nachteile',
        onSelect: () => import('./vorteile.js').then(m => screen.push(m.vorteileScreen()))
          .catch(() => sprache.sage('Vorteile-Bereich wird gerade gebaut.')) },
      { label: 'Übernatürliches', hint: zauber ? 'Zauber, Liturgien, Traditionen' : 'Erst mit Zauberer- oder Geweiht-Vorteil',
        onSelect: () => import('./uebernatuerliches.js').then(m => screen.push(m.uebernatuerlichesScreen()))
          .catch(() => sprache.sage('Übernatürlich-Bereich wird gerade gebaut.')) },
      { label: 'Ausrüstung', hint: 'Waffen, Rüstungen, Gegenstände',
        onSelect: () => import('./ausruestung.js').then(m => screen.push(m.ausruestungScreen()))
          .catch(() => sprache.sage('Ausrüstungs-Bereich wird gerade gebaut.')) },
      { label: 'Beschreibung', hint: 'Name, Heimat, Finanzen, Spezies',
        onSelect: () => import('./beschreibung.js').then(m => screen.push(m.beschreibungScreen())) },
      { label: 'Charakter speichern', hint: 'Als Sephrasto-Datei in Meine Charaktere',
        onSelect: () => speichere() },
    ];

    return menuScreen({
      title: hub.title,
      subtitle: 'Pfeiltasten wählen, Eingabetaste öffnet, Escape zurück.',
      items,
    }).build();
  },
};

async function aendereGesamtEP() {
  const eingabe = await zahlDialog({ titel: 'Erfahrungspunkte gesamt', label: 'Gesamt-EP', wert: char.erfahrung.gesamt, min: 0, max: 100000 });
  if (eingabe === null || eingabe === undefined) return;
  char.erfahrung.gesamt = eingabe;
  aktualisiere();
  screen.refresh();
}

async function speichere() {
  try {
    aktualisiere();
    const xml = serialisiere(char, db);
    const name = char.name || 'Neuer Charakter';
    const res = await ipc.bibliothekSpeichern({ name, inhalt: xml });
    char.dateiname = res.pfad;
    sounds.playSpeichern();
    sprache.sage(`Charakter ${res.name} gespeichert. ${verfuegbareEP(char)} EP frei.`);
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e);
    sounds.playError();
    sprache.sage('Speichern fehlgeschlagen.');
  }
}
