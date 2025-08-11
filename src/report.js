// Placeholder: report generation (HTML preview + PDF later)
import { state } from './state.js';

export function buildReportHtml(){
  // Minimal HTML preview of current stanowiska & points
  const rows = state.stanowiska.map(st=>{
    const naw = st.nawiazania.map(n=>n.id).join(', ') || '—';
    const pk = st.pikiety.map(p=>p.id).join(', ') || '—';
    return `<tr>
      <td>${st.name}</td>
      <td>${st.stan?st.stan.id:'—'}</td>
      <td>${naw}</td>
      <td>${st.radius} m</td>
      <td>${pk}</td>
    </tr>`;
  }).join('');
  const html = `<!doctype html><html lang="pl"><meta charset="utf-8"><title>Raport – podgląd</title>
  <style>body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:16px;} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:6px;text-align:left} th{background:#f7f7f7}</style>
  <h2>Raport – podgląd</h2>
  <table><thead><tr><th>Stanowisko</th><th>STAN</th><th>Nawiązania</th><th>Promień</th><th>Pikiety</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Brak danych</td></tr>'}</tbody></table>`;
  return html;
}

export function downloadBlob(name, mime, content){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 5000);
}

export function previewHtml(){
  const html = buildReportHtml();
  const w = window.open('', '_blank');
  w.document.open(); w.document.write(html); w.document.close();
}

export function generatePdf(){
  // Placeholder: in next step we will add client-side PDF (e.g. jsPDF) or server-side.
  alert('PDF: placeholder. W kolejnym kroku dodamy generator (jsPDF).');
}
