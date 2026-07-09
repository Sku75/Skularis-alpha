/**
 * Skularistool — Charakter als lesbares, barrierefreies HTML-Blatt exportieren.
 */
import { abgeleiteteWerte } from './regeln.js';

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function vName(v) { return typeof v === 'string' ? v : v.name; }

export function exportHtml(char, db) {
  const w = abgeleiteteWerte(char);
  const finanzen = String(db.einstellungen['Finanzen'] || '').split(',').map(s => s.trim());

  const attrRows = db.attribute.map(a =>
    `<tr><th scope="row">${esc(a.anzeigename)} (${esc(a.name)})</th><td>${char.attribute[a.name] || 0}</td></tr>`
  ).join('');

  const abgRows = ['WS', 'MR', 'GS', 'SB', 'INI', 'DH', 'RS', 'BE', 'SchiP'].map(k =>
    `<tr><th scope="row">${k}</th><td>${w[k]}</td></tr>`).join('');

  const vorteile = (char.vorteile || []).map(v => {
    const n = vName(v);
    const komm = (typeof v === 'object' && v.kommentar) ? ` (${esc(v.kommentar)})` : '';
    return `<li>${esc(n)}${komm}</li>`;
  }).join('') || '<li>keine</li>';

  const fertRows = Object.entries(char.fertigkeiten || {})
    .filter(([, fe]) => fe.wert > 0 || (fe.talente && fe.talente.length))
    .map(([name, fe]) => `<tr><th scope="row">${esc(name)}</th><td>${fe.wert}</td><td>${esc((fe.talente || []).join(', '))}</td></tr>`)
    .join('') || '<tr><td colspan="3">keine</td></tr>';

  const ufRows = Object.entries(char.uebernatuerlich || {})
    .map(([name, ue]) => `<tr><th scope="row">${esc(name)}</th><td>${ue.wert}</td><td>${esc((ue.talente || []).join(', '))}</td></tr>`)
    .join('');

  const freie = (char.freieFertigkeiten || []).filter(f => f.name)
    .map(f => `<li>${esc(f.name)} ${f.wert}</li>`).join('') || '<li>keine</li>';

  const waffen = (char.waffen || []).filter(x => x.name).map(x => `<li>${esc(x.name)}</li>`).join('') || '<li>keine</li>';
  const ruestungen = (char.ruestungen || []).filter(x => x.name).map(x => `<li>${esc(x.name)} (RS ${esc(x.rs)}, BE ${x.be})</li>`).join('') || '<li>keine</li>';
  const gegenstaende = (char.ausruestung || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li>keine</li>';

  const frei = (char.erfahrung.gesamt || 0) - (char.erfahrung.ausgegeben || 0);

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8">
<title>${esc(char.name || 'Charakter')} — Ilaris</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 1rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { margin-bottom: 0.2rem; }
  h2 { margin-top: 1.6rem; border-bottom: 2px solid #888; }
  table { border-collapse: collapse; margin: 0.5rem 0; }
  th, td { border: 1px solid #bbb; padding: 0.3rem 0.6rem; text-align: left; }
  .meta { color: #444; }
</style></head><body>
<h1>${esc(char.name || 'Unbenannter Charakter')}</h1>
<p class="meta">Spezies: ${esc(char.spezies || '—')} · Heimat: ${esc(char.heimat || '—')} · Finanzen: ${esc(finanzen[char.finanzen] || 'Normal')}</p>
<p class="meta">Erfahrung: ${char.erfahrung.gesamt || 0} gesamt, ${char.erfahrung.ausgegeben || 0} ausgegeben, ${frei} frei</p>

<h2>Attribute</h2><table><tbody>${attrRows}</tbody></table>
<h2>Abgeleitete Werte</h2><table><tbody>${abgRows}</tbody></table>
<h2>Vorteile</h2><ul>${vorteile}</ul>
<h2>Fertigkeiten und Talente</h2>
<table><thead><tr><th>Fertigkeit</th><th>Wert</th><th>Talente</th></tr></thead><tbody>${fertRows}</tbody></table>
${ufRows ? `<h2>Übernatürliches</h2><table><thead><tr><th>Fertigkeit</th><th>Wert</th><th>Zauber / Liturgien</th></tr></thead><tbody>${ufRows}</tbody></table>` : ''}
<h2>Freie Fertigkeiten</h2><ul>${freie}</ul>
<h2>Ausrüstung</h2>
<h3>Waffen</h3><ul>${waffen}</ul>
<h3>Rüstungen</h3><ul>${ruestungen}</ul>
<h3>Gegenstände</h3><ul>${gegenstaende}</ul>
<p class="meta">Erstellt mit Skularis 0.01 — Regelwerk Ilaris.</p>
</body></html>
`;
}
