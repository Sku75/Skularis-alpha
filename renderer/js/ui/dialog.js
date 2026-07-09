/**
 * Skularistool — barrierefreie Dialoge (Zahl-Eingabe, Text, Auswahl mit Filter).
 * Nutzen das native <dialog>-Element (showModal) mit eigener Tastatursteuerung
 * und aria-live-Ansagen.
 */

import * as sprache from '../sprache.js';
import * as sounds from '../sounds.js';

function baueDialog(ariaLabel) {
  const dlg = document.createElement('dialog');
  dlg.className = 'db-dialog';
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-label', ariaLabel);
  return dlg;
}

/** Zahl-Eingabe. @returns Promise<number|null> */
export function zahlDialog({ titel, label, wert = 0, min = -100000, max = 100000 }) {
  return new Promise((resolve) => {
    sounds.playClick();
    const dlg = baueDialog(titel);
    dlg.innerHTML = `
      <div class="db-dialog__header"><span class="db-dialog__title">${titel}</span></div>
      <div class="db-dialog__body">
        <label class="db-dialog__label" for="dlg-zahl">${label}</label>
        <input id="dlg-zahl" class="db-input" type="number" inputmode="numeric" value="${wert}">
      </div>
      <div class="db-dialog__footer">
        <button class="db-btn db-btn--primary" id="dlg-ok">OK</button>
        <button class="db-btn" id="dlg-ab">Abbrechen</button>
      </div>`;
    document.body.appendChild(dlg);
    const input = dlg.querySelector('#dlg-zahl');
    const fertig = (val) => { dlg.close(); dlg.remove(); resolve(val); };
    const ok = () => {
      let v = parseInt(input.value, 10);
      if (Number.isNaN(v)) v = 0;
      fertig(Math.max(min, Math.min(max, v)));
    };
    dlg.querySelector('#dlg-ok').addEventListener('click', ok);
    dlg.querySelector('#dlg-ab').addEventListener('click', () => fertig(null));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ok(); }
      else if (e.key === 'Escape') { e.preventDefault(); fertig(null); }
    });
    dlg.showModal();
    input.focus(); input.select();
    sprache.sage(`${titel}. ${label}. Zahl eingeben, Eingabetaste bestätigt.`);
  });
}

/** Text-Eingabe. @returns Promise<string|null> */
export function textDialog({ titel, label, wert = '' }) {
  return new Promise((resolve) => {
    sounds.playClick();
    const dlg = baueDialog(titel);
    dlg.innerHTML = `
      <div class="db-dialog__header"><span class="db-dialog__title">${titel}</span></div>
      <div class="db-dialog__body">
        <label class="db-dialog__label" for="dlg-text">${label}</label>
        <input id="dlg-text" class="db-input" type="text" value="${String(wert).replace(/"/g, '&quot;')}">
      </div>
      <div class="db-dialog__footer">
        <button class="db-btn db-btn--primary" id="dlg-ok">OK</button>
        <button class="db-btn" id="dlg-ab">Abbrechen</button>
      </div>`;
    document.body.appendChild(dlg);
    const input = dlg.querySelector('#dlg-text');
    const fertig = (val) => { dlg.close(); dlg.remove(); resolve(val); };
    dlg.querySelector('#dlg-ok').addEventListener('click', () => fertig(input.value));
    dlg.querySelector('#dlg-ab').addEventListener('click', () => fertig(null));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); fertig(input.value); }
      else if (e.key === 'Escape') { e.preventDefault(); fertig(null); }
    });
    dlg.showModal();
    input.focus(); input.select();
    sprache.sage(`${titel}. ${label}.`);
  });
}

/**
 * Auswahl aus einer Liste, mit Tipp-Filter.
 * @param {object} o
 * @param {string} o.titel
 * @param {Array<{label:string, wert:any, hint?:string}>} o.eintraege
 * @returns Promise<any|null>  (der gewählte wert)
 */
export function auswahlDialog({ titel, eintraege }) {
  return new Promise((resolve) => {
    sounds.playClick();
    const dlg = baueDialog(titel);
    dlg.innerHTML = `
      <div class="db-dialog__header"><span class="db-dialog__title">${titel}</span></div>
      <div class="db-dialog__body">
        <label class="db-dialog__label" for="dlg-filter">Filter (tippen zum Suchen)</label>
        <input id="dlg-filter" class="db-input" type="text" autocomplete="off">
        <div id="dlg-liste" class="db-list" role="listbox" aria-label="${titel}"></div>
      </div>
      <div class="db-dialog__footer">
        <button class="db-btn" id="dlg-ab">Abbrechen</button>
      </div>`;
    document.body.appendChild(dlg);

    const filter = dlg.querySelector('#dlg-filter');
    const liste = dlg.querySelector('#dlg-liste');
    let gefiltert = [];
    let aktiv = 0;

    const fertig = (val) => { dlg.close(); dlg.remove(); resolve(val); };

    function zeichne() {
      const q = filter.value.trim().toLowerCase();
      gefiltert = q ? eintraege.filter(e => e.label.toLowerCase().includes(q)) : eintraege.slice();
      liste.innerHTML = '';
      gefiltert.forEach((e, i) => {
        const item = document.createElement('div');
        item.className = 'db-list__item';
        item.setAttribute('role', 'option');
        item.textContent = e.label;
        item.addEventListener('click', () => fertig(e.wert));
        liste.appendChild(item);
      });
      aktiv = 0;
      markiere(false);
    }

    function markiere(ansagen = true) {
      const items = liste.querySelectorAll('.db-list__item');
      items.forEach((el, i) => el.classList.toggle('db-list__item--selected', i === aktiv));
      const el = items[aktiv];
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
        if (ansagen) sprache.sage(gefiltert[aktiv].label);
      }
      if (gefiltert.length === 0 && ansagen) sprache.sage('Keine Treffer.');
    }

    filter.addEventListener('input', () => { zeichne(); sprache.sage(`${gefiltert.length} Treffer.`); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); fertig(null); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (aktiv < gefiltert.length - 1) { aktiv++; markiere(); } else sounds.playError(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (aktiv > 0) { aktiv--; markiere(); } else sounds.playError(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (gefiltert[aktiv]) fertig(gefiltert[aktiv].wert); }
    });
    dlg.querySelector('#dlg-ab').addEventListener('click', () => fertig(null));

    zeichne();
    dlg.showModal();
    filter.focus();
    sprache.sage(`${titel}. ${eintraege.length} Einträge. Tippen filtert, Pfeil runter zur Liste, Eingabetaste wählt.`);
  });
}
