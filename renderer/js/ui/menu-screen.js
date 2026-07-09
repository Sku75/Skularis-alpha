/**
 * Skularistool 0.1 — Menü-Bildschirm-Helfer
 * Erzeugt einen Bildschirm mit Titel + vertikaler Liste großer Schalter.
 */

import * as sounds from '../sounds.js';

/**
 * @param {object} opts
 * @param {string} opts.title      Überschrift/Ansage
 * @param {string} [opts.subtitle] Zusatzzeile
 * @param {Array}  opts.items      [{ label, hint?, onSelect(), disabled? }]
 * @param {string} [opts.leer]     Text, falls items leer ist
 * @returns {{title, build}}
 */
export function menuScreen(opts) {
  return {
    title: opts.title,
    build() {
      const wrap = document.createElement('div');
      wrap.className = 'db-menu';

      // Titel + Untertitel nur visuell — die Ansage macht der Bildschirm
      // per aria-live, damit NVDA nichts doppelt vorliest.
      const h = document.createElement('div');
      h.className = 'db-menu__title';
      h.setAttribute('aria-hidden', 'true');
      h.textContent = opts.title;
      wrap.appendChild(h);

      if (opts.subtitle) {
        const p = document.createElement('p');
        p.className = 'db-menu__sub';
        p.setAttribute('aria-hidden', 'true');
        p.textContent = opts.subtitle;
        wrap.appendChild(p);
      }

      const list = document.createElement('div');
      list.className = 'db-menu__list';

      const items = opts.items || [];
      if (items.length === 0 && opts.leer) {
        const leer = document.createElement('div');
        leer.className = 'db-menu__empty';
        leer.tabIndex = 0;
        leer.setAttribute('data-sr-label', opts.leer);
        leer.textContent = opts.leer;
        list.appendChild(leer);
      }

      for (const it of items) {
        const b = document.createElement('button');
        b.className = 'db-btn db-menu__item';
        b.type = 'button';
        if (it.disabled) b.disabled = true;

        const label = document.createElement('span');
        label.className = 'db-menu__label';
        label.textContent = it.label;
        b.appendChild(label);

        if (it.hint) {
          const hint = document.createElement('span');
          hint.className = 'db-menu__hint';
          hint.textContent = it.hint;
          b.appendChild(hint);
          // Für den Screenreader Label + Hinweis zusammenfassen
          b.setAttribute('aria-label', `${it.label}. ${it.hint}`);
        }

        b.addEventListener('click', () => {
          if (it.disabled) { sounds.playError(); return; }
          sounds.playClick();
          try { it.onSelect(); } catch (e) { console.error('Menü-Aktion:', e); }
        });

        list.appendChild(b);
      }

      wrap.appendChild(list);
      return wrap;
    },
  };
}
