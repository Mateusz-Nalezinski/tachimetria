// report.js – generowanie raportu HTML + PDF
import { state } from './state.js';
import { distance2D } from './utils.js';

export function buildReportHtml(){
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
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:16px;}
    h1{margin:0 0 8px 0}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ddd;padding:6px;text-align:left}
    th{background:#f7f7f7}
    .muted{opacity:.7;font-size:12px}
  </style>
  <h1>Raport – podgląd</h1>
  <div class="muted">Data: ${new Date().toLocaleString()}</div>
  <table><thead><tr><th>Stanowisko</th><th>STAN</th><th>Nawiązania</th><th>Promień</th><th>Pikiety</th></tr></thead>
  <tbody>${rows||'<tr><td colspan="5">Brak danych</td></tr>'}</tbody></table>`;
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

// === PDF ===
function fmt(n){ return typeof n==='number' && isFinite(n) ? n.toFixed(3) : '—'; }

// Uwaga o fontach: aby w PDF działały w 100% polskie znaki, doładuj własny font TTF i zarejestruj w jsPDF.
// Tu używamy domyślnej Helvetica (zwykle OK), ale dla pełnej zgodności polecam dodać np. Roboto (TTF).
async function tryGrabMapImage(maxW=180, maxH=120){
  const el = document.getElementById('map');
  if(!el || !window.html2canvas) return null;
  try{
    const canvas = await window.html2canvas(el, {useCORS:true, backgroundColor:null, scale:1});
    // skalowanie do miniatury
    let {width, height} = canvas;
    const r = Math.min(maxW/width, maxH/height);
    width = Math.round(width*r); height = Math.round(height*r);
    const tmp = document.createElement('canvas');
    tmp.width = width; tmp.height = height;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(canvas, 0, 0, width, height);
    return tmp.toDataURL('image/png');
  } catch(e){
    console.warn('Map snapshot failed:', e);
    return null;
  }
}

export async function generatePdf(){
  const { jsPDF } = window.jspdf || {};
  if(!jsPDF){
    alert('Brak jsPDF – sprawdź, czy dodałeś skrypty CDN w index.html.');
    return;
  }

  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const left = 14, top = 14, line = 6;

  // Nagłówek
  doc.setFont('helvetica','bold');
  doc.setFontSize(16);
  doc.text('Raport – stanowiska i pikiety', left, top);
  doc.setFont('helvetica','normal');
  doc.setFontSize(10);
  doc.text('Wygenerowano: ' + new Date().toLocaleString(), left, top + line);

  // Miniatura mapy (opcjonalnie)
  const img = await tryGrabMapImage();
  if(img){
    doc.addImage(img, 'PNG', 210-14-60, 10, 60, 40); // prawa góra
  }

  let y = top + line*2 + (img ? 36 : 0);

  // Sekcja: podsumowanie stanowisk
  doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text('Podsumowanie stanowisk', left, y); y += 2;
  doc.setFont('helvetica','normal'); doc.setFontSize(10);

  const sumRows = state.stanowiska.map(st=>{
    return [
      st.name,
      st.stan ? st.stan.id : '—',
      st.nawiazania.length ? st.nawiazania.map(n=>n.id).join(', ') : '—',
      String(st.radius) + ' m',
      String(st.pikiety.length)
    ];
  });

  doc.autoTable({
    startY: y + 2,
    head: [['Stanowisko','STAN','Nawiązania','Promień','# pikiet']],
    body: sumRows.length ? sumRows : [['—','—','—','—','—']],
    styles: { font:'helvetica', fontSize:9, cellPadding:1.5 },
    headStyles: { fillColor:[247,247,247], textColor:20 },
    margin: { left, right:14 },
    theme: 'grid'
  });

  // Dla każdego stanowiska – osobna tabela z pikietami (ID, Y, X, Z, odległość od STAN)
  for(const st of state.stanowiska){
    const after = doc.previousAutoTable ? doc.previousAutoTable.finalY + 8 :  doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : doc.internal.pageSize.getHeight();
    const startY = Math.max(after, 30);
    if(startY > doc.internal.pageSize.getHeight() - 40) doc.addPage();

    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(`${st.name} — pikiety`, left, doc.previousAutoTable ? doc.previousAutoTable.finalY + 8 : doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : left);

    const head = [['ID','Y','X','Z','Odległość [m]']];
    const body = (st.pikietyAll.length? st.pikietyAll : []).map(pk=>{
      const dist = st.stan ? distance2D(st.stan, pk) : NaN;
      return [pk.id, fmt(pk.y), fmt(pk.x), fmt(pk.z), isFinite(dist)?dist.toFixed(3):'—'];
    });

    doc.autoTable({
      startY: (doc.previousAutoTable ? doc.previousAutoTable.finalY : y) + 10,
      head, body: body.length ? body : [['—','—','—','—','—']],
      styles: { font:'helvetica', fontSize:9, cellPadding:1.5 },
      headStyles: { fillColor:[247,247,247], textColor:20 },
      margin: { left, right:14 },
      theme: 'grid',
      didDrawPage: (d)=>{
        // Stopka z numerem strony
        const pageSize = doc.internal.pageSize;
        const pageW = pageSize.getWidth();
        const pageH = pageSize.getHeight();
        doc.setFont('helvetica','normal'); doc.setFontSize(8);
        doc.text(`Strona ${doc.internal.getNumberOfPages()}`, pageW - 20, pageH - 8);
      }
    });
  }

  // Zapis
  doc.save(`raport_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`);
}
