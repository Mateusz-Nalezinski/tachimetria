import { definePUWG } from './coords.js';
import { state, resetState } from './state.js';
import { $, tooltipText } from './utils.js';
import { initMap, layers, updateLabelSizes, makeMarker, makeLabel, fitAll, clearGraphics, setAddMode } from './map.js';
import { parseTextAsYXZ } from './data.js';
import { addStanowiskoCard, drawAll, renderStanList, refreshPikietyStyles, sortPikietyForStan } from './stanowiska.js';
import { bindOsnowaEditorOrSelector, bindPikietaEditorOrPicker, installMapClickHandlers } from './interactions.js';
import { previewHtml, generatePdf } from './report.js';
import { APP_VERSION, APP_CHANGELOG } from './version.js'; // <--- dodane

definePUWG();
initMap();
installMapClickHandlers();

document.addEventListener('labels:update', updateLabelSizes);

document.getElementById('btnAddPk').addEventListener('click', ()=> setAddMode(state.addMode==='PIKIETA'?'OFF':'PIKIETA'));
document.getElementById('btnAddOs').addEventListener('click', ()=> setAddMode(state.addMode==='OSNOWA'?'OFF':'OSNOWA'));

document.getElementById('btnDraw').addEventListener('click', ()=>{
  state.drawMode=!state.drawMode;
  document.getElementById('btnDraw').textContent='Tryb rysowania: '+(state.drawMode?'ON':'OFF');
  document.getElementById('btnDraw').classList.toggle('btn-on', state.drawMode);
  state.firstPoint=null;
  document.getElementById('measInfo').textContent = state.drawMode ? 'Tryb rysowania: kliknij punkt A (marker/mapa), potem punkt B.' : '';
});

document.getElementById('btnClearMeas').addEventListener('click', ()=>{
  layers.meas.clearLayers();
  state.firstPoint=null;
  document.getElementById('measInfo').textContent='';
});

document.getElementById('btnClear').addEventListener('click', ()=>{
  resetState(window.__map || null);
  clearGraphics();
  document.getElementById('stanList').innerHTML='';
  setAddMode('OFF');
});

document.getElementById('btnAddStan').addEventListener('click', ()=> addStanowiskoCard());

document.getElementById('btnParse').addEventListener('click', async ()=>{
  const fOs = document.getElementById('fileOsnowa').files[0];
  const fPk = document.getElementById('filePikiety').files[0];
  if(!fOs || !fPk){
    alert('Wczytaj oba pliki: OSNOWA i PIKIETY.');
    return;
  }
  const [tOs, tPk] = await Promise.all([fOs.text(), fPk.text()]);
  state.osnowa = parseTextAsYXZ(tOs);
  state.pikiety = parseTextAsYXZ(tPk);
  if(document.getElementById('epsgSelect').value==='AUTO'){
    // guess zone by X from whichever is present
    const pts = state.osnowa.length?state.osnowa:state.pikiety;
    if(pts.length){
      const x = pts[0].x;
      const v = (x>=8000000)?'EPSG:2179':(x>=7000000)?'EPSG:2178':(x>=6000000)?'EPSG:2177':'EPSG:2176';
      document.getElementById('epsgSelect').value=v;
    }
  }
  drawAll(bindOsnowaEditorOrSelector, bindPikietaEditorOrPicker);
  fitAll();
  refreshPikietyStyles();
  updateLabelSizes();
});

document.getElementById('btnDemo').addEventListener('click', ()=>{
  const osText = `NAW1\t5951700.00\t6507400.00\t120.00
STAN1\t5951777.74\t6507496.84\t124.70
NAW2\t5951850.00\t6507600.00\t119.80`;
  const pkText = `P1\t5951760.00\t6507480.00\t124.10
P2\t5951795.00\t6507515.00\t125.00
P3\t5951810.00\t6507540.00\t123.90
P4\t5951735.00\t6507460.00\t124.30
P5\t5951840.00\t6507585.00\t124.00`;
  state.osnowa=parseTextAsYXZ(osText);
  state.pikiety=parseTextAsYXZ(pkText);
  document.getElementById('epsgSelect').value='AUTO';
  drawAll(bindOsnowaEditorOrSelector, bindPikietaEditorOrPicker);
  updateLabelSizes();
  fitAll();
  refreshPikietyStyles();
});

document.getElementById('epsgSelect').addEventListener('change', ()=>{
  if(state.osnowa.length||state.pikiety.length){
    drawAll(bindOsnowaEditorOrSelector, bindPikietaEditorOrPicker);
    state.stanowiska.forEach(st=>{
      sortPikietyForStan(st);
    });
  }
});

// Reports
document.getElementById('btnReportHtml').addEventListener('click', ()=> previewHtml());
document.getElementById('btnReportPdf').addEventListener('click', ()=> generatePdf());

console.log('[Tachimetria] Modular app loaded.');

// ---- Wersja i opis zmian ----
console.log(`%c[Tachimetria] Wersja ${APP_VERSION}`, "color: green; font-weight: bold;");
console.log(`%cZmiany:${APP_CHANGELOG}`, "color: gray;");
