/**
 * Skularistool — barrierefreie Editor-Bausteine.
 */
import * as sounds from '../sounds.js';
import * as sprache from '../sprache.js';

/**
 * Verstellbare Wertzeile (Attribut, Fertigkeit, Energie ...).
 * Fokussierbar; Pfeil links/rechts oder Plus/Minus verändert den Wert.
 * Pfeil hoch/runter (navigation.js) wechselt zwischen Zeilen.
 *
 * @param {object} o
 * @param {string} o.label
 * @param {() => number} o.get
 * @param {(v:number) => void} o.set
 * @param {number} o.min
 * @param {number} o.max
 * @param {(v:number, delta:number) => void} [o.onChange]  liefert die Ansage-Zusatzinfo (z. B. EP)
 * @returns {HTMLElement}
 */
export function wertZeile(o) {
  const row = document.createElement('div');
  row.className = 'db-row ed-zeile';
  row.tabIndex = 0;

  const text = document.createElement('span');
  text.className = 'ed-zeile__text';
  row.appendChild(text);

  const render = () => {
    const v = o.get();
    const extra = o.suffix ? (o.suffix() || '') : '';
    const t = `${o.label}: ${v}${extra ? ', ' + extra : ''}`;
    text.textContent = t;
    row.setAttribute('data-sr-label', t);
    row.dataset.srValue = t;
    row.setAttribute('aria-label', t);
  };
  render();

  row.addEventListener('keydown', (e) => {
    // Enter öffnet optional eine Detailebene (z. B. Talente der Fertigkeit)
    if (e.key === 'Enter' && o.onActivate) {
      e.preventDefault();
      e.stopPropagation();
      o.onActivate();
      return;
    }
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === '+') delta = 1;
    else if (e.key === 'ArrowLeft' || e.key === '-') delta = -1;
    else return;
    e.preventDefault();
    e.stopPropagation();
    const v = o.get();
    const nv = Math.max(o.min, Math.min(o.max, v + delta));
    if (nv === v) { sounds.playError(); return; }
    o.set(nv);
    if (delta > 0) sounds.playWertHoch(); else sounds.playWertRunter();
    render();
    const zusatz = o.onChange ? (o.onChange(nv, delta) || '') : '';
    sprache.sage(`${o.label} ${nv}${zusatz ? ', ' + zusatz : ''}`);
  });

  row.__render = render;
  return row;
}

/** Reine Info-/Statuszeile (fokussierbar, nur Anzeige). */
export function infoZeile(text) {
  const row = document.createElement('div');
  row.className = 'db-row ed-info';
  row.tabIndex = 0;
  row.textContent = text;
  row.setAttribute('data-sr-label', text);
  row.dataset.srValue = text;
  row.setAttribute('aria-label', text);
  return row;
}

/** Aktionszeile als Schalter. */
export function aktionZeile(label, onSelect, hint) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'db-btn ed-aktion';
  b.textContent = label;
  if (hint) b.setAttribute('aria-label', `${label}. ${hint}`);
  b.addEventListener('click', () => { sounds.playClick(); onSelect(); });
  return b;
}

/** Überschrift eines Abschnitts — nur visuell, NVDA bekommt die Ansage per aria-live. */
export function abschnittTitel(titel) {
  const h = document.createElement('div');
  h.className = 'ed-abschnitt';
  h.setAttribute('aria-hidden', 'true');
  h.textContent = titel;
  return h;
}
