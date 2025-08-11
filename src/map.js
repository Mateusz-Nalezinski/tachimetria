import { tooltipText, $ } from './utils.js';
import { toWGS, fromWGS, EPSG_DEFAULT } from './coords.js';
import { state } from './state.js';

export const layers = {
  osnowa: null, pikiety: null, meas: null, labels: null
};

export let map;

export function getCurrentEPSG(){
  const sel = $('#epsgSelect').value;
  if(sel!=='AUTO') return sel;
  const pts = state.osnowa.length?state.osnowa:state.pikiety;
  if(!pts.length) return EPSG_DEFAULT;
  const x = pts[0].x;
  if(x>=8000000) return 'EPSG:2179';
  if(x>=7000000) return 'EPSG:2178';
  if(x>=6000000) return 'EPSG:2177';
  return 'EPSG:2176';
}

export function initMap(){
  map = L.map('map', { center:[52, 19], zoom:6, zoomSnap:0.25, zoomDelta:0.5, wheelPxPerZoomLevel:60, maxZoom:24 });
  const esriOrto = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:24, maxNativeZoom:19, attribution:'Tiles © Esri — World Imagery' }).addTo(map);
  const osmBase  = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:24, maxNativeZoom:19, attribution:'© OpenStreetMap' });
  L.control.layers({ 'Ortofoto (Esri)':esriOrto, 'Mapa (OSM)':osmBase }, null, { position:'topleft', collapsed:false }).addTo(map);

  layers.osnowa = L.layerGroup().addTo(map);
  layers.pikiety = L.layerGroup().addTo(map);
  layers.meas   = L.layerGroup().addTo(map);
  layers.labels = L.layerGroup().addTo(map);

  map.on('zoomend', updateLabelSizes);
  setAddMode('OFF');
  setDrawBtn();
  map.setView([52,19],6);
}

export function makeLabel(text, color, isOsnowa=false){
  const el = document.createElement('div');
  el.className = 'map-label';
  el.style.whiteSpace = 'nowrap';
  el.style.fontWeight = isOsnowa ? '700' : '600';
  el.style.letterSpacing = '0.2px';
  el.style.color = color || '#222';
  el.style.textShadow = '0 0 3px rgba(255,255,255,0.95), 0 0 2px rgba(0,0,0,0.15)';
  el.textContent = text;
  const icon = L.divIcon({ html: el, className: '', iconSize: [0,0] });
  const marker = L.marker([0,0], { icon });
  marker._labelEl = el;
  marker._isOsnowaLabel = !!isOsnowa;
  return marker;
}

export function updateLabelSizes(){
  const z = map.getZoom() || 10;
  const sizeOs = Math.max(12, Math.min(28, 12 + (z-12)*1.6));
  const sizePk = Math.max(6,  Math.min(14,  sizeOs / 2));
  layers.labels.eachLayer(l => {
    if(l._labelEl){
      l._labelEl.style.fontSize = (l._isOsnowaLabel ? sizeOs : sizePk) + 'px';
    }
  });
}

export function makeMarker(p, color, isOsnowa=false){
  const radius = isOsnowa ? 7 : 3;
  const weight = isOsnowa ? 3.5 : 1;
  const fillOpacity = isOsnowa ? 0.98 : 0.9;
  const m = L.circleMarker([p.lat, p.lon], { radius, color, weight, fill:true, fillOpacity })
    .bindTooltip(tooltipText(p), {sticky:true});
  return m;
}

export function setAddMode(mode){
  state.addMode = mode;
  $('#addModeInfo').textContent = 'Tryb dodawania: ' + (mode==='OFF' ? 'OFF' : mode);
  const btnPk = document.getElementById('btnAddPk');
  const btnOs = document.getElementById('btnAddOs');
  btnPk.classList.toggle('btn-add-on', mode==='PIKIETA');
  btnOs.classList.toggle('btn-add-on', mode==='OSNOWA');
}

export function setDrawBtn(){
  const btn=$('#btnDraw');
  btn.textContent='Tryb rysowania: '+(state.drawMode?'ON':'OFF');
  if(state.drawMode) btn.classList.add('btn-on'); else btn.classList.remove('btn-on');
}

export function toWgsAndAttach(p){
  const epsg = getCurrentEPSG();
  const {lon,lat} = toWGS(epsg,p);
  p.lon=lon; p.lat=lat;
}

export function fromLatLng(latlng){
  const epsg = getCurrentEPSG();
  return fromWGS(epsg, latlng);
}

export function fitAll(){
  const all=[...state.osnowa,...state.pikiety];
  if(all.length){
    const b=L.latLngBounds(all.map(p=>[p.lat,p.lon]));
    map.fitBounds(b.pad(0.3));
  }
}

export function clearGraphics(){
  layers.osnowa.clearLayers();
  layers.pikiety.clearLayers();
  layers.labels.clearLayers();
  layers.meas.clearLayers();
}

export function addMeasLine(pA,pB){
  L.polyline([pA.latlng,pB.latlng],{color:'#ffcc00',weight:2}).addTo(layers.meas);
  const dist2=Math.hypot(pA.proj.x-pB.proj.x,pA.proj.y-pB.proj.y);
  document.getElementById('measInfo').innerHTML=
    `<b>Linia pomiarowa</b><br/>A: ${pA.label} → B: ${pB.label}<br/>2D: ${dist2.toFixed(3)} m`;
}
