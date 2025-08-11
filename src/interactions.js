import { state } from './state.js';
import { $, tooltipText } from './utils.js';
import { getCurrentEPSG, toWgsAndAttach, makeLabel, layers, map, fromLatLng, setAddMode, addMeasLine } from './map.js';
import { refreshPikietyStyles, redrawStanGraphics, sortPikietyForStan, renderStanList } from './stanowiska.js';

export function bindPikietaEditorOrPicker(p){
  if(p._clickBound) return;
  p._clickBound=true;
  const onClick = ()=>{
    if(state.selection.active && state.selection.mode==='ADD_PK' && state.selection.stanObj){
      const st = state.selection.stanObj;
      if(!st.stan){ alert('Najpierw wybierz STAN.'); return; }
      if(state.pkOwner.has(p.id) && state.pkOwner.get(p.id)!==st.id){
        alert(`Pikieta ${p.id} jest już przypisana do stanowiska ${state.pkOwner.get(p.id)}.`);
        return;
      }
      const exists = st.pikiety.some(k=>k.id===p.id);
      if(exists){
        st.pikiety = st.pikiety.filter(k=>k.id!==p.id);
        if(state.pkOwner.get(p.id)===st.id) state.pkOwner.delete(p.id);
        if(st.clickSeq && st.clickSeq.has(p.id)) st.clickSeq.delete(p.id);
      } else {
        st.pikiety.push(p);
        state.pkOwner.set(p.id, st.id);
        if(!st.pikietyAll.some(k=>k.id===p.id)) st.pikietyAll.push(p);
        if(st.clickSeq){ st.clickSeq.set(p.id, st.nextClickSeq++); }
      }
      sortPikietyForStan(st);
      refreshPikietyStyles();
      redrawStanGraphics(st);
      renderStanList();
      return;
    }
    openPikietaEditor(p);
  };
  p.marker.on('click', onClick);
  if(p.labelMarker) p.labelMarker.on('click', onClick);
}

export function openPikietaEditor(p){
  const form = document.createElement('div');
  form.innerHTML = `
    <div class="small"><b>Edycja pikiety</b> (${p.id})</div>
    <div class="form-inline small">Y: <input id="ey" type="number" step="0.001" value="${p.y.toFixed(3)}"/>
       X: <input id="ex" type="number" step="0.001" value="${p.x.toFixed(3)}"/>
       Z: <input id="ez" type="number" step="0.001" value="${p.z.toFixed(3)}"/></div>
    <div class="form-inline small">ID: <input id="eid" type="text" value="${p.id}"/></div>
    <div style="margin-top:6px">
      <button id="esave">Zapisz</button>
      <button id="ecancel">Anuluj</button>
    </div>`;
  const popup = L.popup({ autoClose:true, closeOnClick:true }).setLatLng([p.lat,p.lon]).setContent(form);
  popup.openOn(map);
  form.querySelector('#ecancel').addEventListener('click', ()=> map.closePopup(popup));
  form.querySelector('#esave').addEventListener('click', ()=>{
    const ny = Number(form.querySelector('#ey').value);
    const nx = Number(form.querySelector('#ex').value);
    const nz = Number(form.querySelector('#ez').value);
    const nid = String(form.querySelector('#eid').value||p.id);
    if(nid!==p.id && state.pikiety.some(k=>k.id===nid)){
      alert('ID pikiety już istnieje.');
      return;
    }
    p.y = isFinite(ny)?ny:p.y;
    p.x = isFinite(nx)?nx:p.x;
    p.z = isFinite(nz)?nz:p.z;
    p.id = nid;
    toWgsAndAttach(p);
    p.marker.setLatLng([p.lat,p.lon]);
    p.marker.setTooltipContent(tooltipText(p));
    if(p.labelMarker){
      p.labelMarker.setLatLng([p.lat,p.lon]);
      if(p.labelMarker._labelEl) p.labelMarker._labelEl.textContent = p.id;
    }
    state.stanowiska.forEach(st=>{
      if(st.stan){ sortPikietyForStan(st); redrawStanGraphics(st); }
    });
    refreshPikietyStyles();
    map.closePopup(popup);
  });
}

export function bindOsnowaEditorOrSelector(p){
  if(p._osBound) return;
  p._osBound = true;
  const onClick = ()=>{
    if(state.selection.active && (state.selection.mode==='STAN' || state.selection.mode==='NAW_MANY')){
      const st = state.selection.stanObj;
      if(state.selection.mode==='STAN'){
        st.stan = p;
        state.selection = {active:false, mode:null, stanObj:null};
      } else {
        const exists = st.nawiazania.some(n=>n.id===p.id);
        if(exists) st.nawiazania = st.nawiazania.filter(n=>n.id!==p.id);
        else st.nawiazania.push(p);
      }
      renderStanList();
      redrawStanGraphics(st);
      return;
    }
    openOsnowaEditor(p);
  };
  p.marker.on('click', onClick);
  if(p.labelMarker) p.labelMarker.on('click', onClick);
}

export function openOsnowaEditor(p){
  const form = document.createElement('div');
  form.innerHTML = `
    <div class="small"><b>Edycja osnowy</b> (${p.id})</div>
    <div class="form-inline small">Y: <input id="oy" type="number" step="0.001" value="${p.y.toFixed(3)}"/>
       X: <input id="ox" type="number" step="0.001" value="${p.x.toFixed(3)}"/>
       Z: <input id="oz" type="number" step="0.001" value="${p.z.toFixed(3)}"/></div>
    <div class="form-inline small">ID: <input id="oid" type="text" value="${p.id}"/></div>
    <div style="margin-top:6px">
      <button id="osave">Zapisz</button>
      <button id="ocancel">Anuluj</button>
    </div>`;
  const popup = L.popup({ autoClose:true, closeOnClick:true }).setLatLng([p.lat,p.lon]).setContent(form);
  popup.openOn(map);
  form.querySelector('#ocancel').addEventListener('click', ()=> map.closePopup(popup));
  form.querySelector('#osave').addEventListener('click', ()=>{
    const ny = Number(form.querySelector('#oy').value);
    const nx = Number(form.querySelector('#ox').value);
    const nz = Number(form.querySelector('#oz').value);
    const nid = String(form.querySelector('#oid').value||p.id);
    if(nid!==p.id && state.osnowa.some(k=>k.id===nid)){
      alert('ID osnowy już istnieje.');
      return;
    }
    p.y = isFinite(ny)?ny:p.y;
    p.x = isFinite(nx)?nx:p.x;
    p.z = isFinite(nz)?nz:p.z;
    p.id = nid;
    toWgsAndAttach(p);
    p.marker.setLatLng([p.lat,p.lon]);
    p.marker.setTooltipContent(tooltipText(p));
    if(p.labelMarker){
      p.labelMarker.setLatLng([p.lat,p.lon]);
      if(p.labelMarker._labelEl) p.labelMarker._labelEl.textContent = p.id;
    }
    state.stanowiska.forEach(st=> redrawStanGraphics(st));
    map.closePopup(popup);
  });
}

// Map clicks: draw mode & add point modes
export function installMapClickHandlers(){
  map.on('click',e=>{
    if(state.drawMode){
      const proj = fromLatLng(e.latlng);
      const p = { latlng:e.latlng, proj, label:`MAP[${e.latlng.lat.toFixed(5)},${e.latlng.lng.toFixed(5)}]`, z:0 };
      if(!state.firstPoint){
        state.firstPoint = p;
        document.getElementById('measInfo').innerHTML=`<b>Punkt A</b>: ${p.label} — kliknij punkt B`;
      } else {
        addMeasLine(state.firstPoint,p);
        state.firstPoint=null;
      }
      return;
    }
    if(state.addMode==='PIKIETA'){
      createPointAt('PIKIETA', e.latlng);
    } else if(state.addMode==='OSNOWA'){
      createPointAt('OSNOWA', e.latlng);
    }
  });
}

export function createPointAt(kind, latlng){
  const {x,y} = fromLatLng(latlng);
  const baseId = kind==='PIKIETA' ? 'P' : 'O';
  const arr = (kind==='PIKIETA') ? state.pikiety : state.osnowa;
  let id = baseId + (arr.length+1);
  // ensure unique
  const has = x=> arr.some(p=>p.id===x);
  let i=1; let cand=id;
  while(has(cand)){ cand = id + '_' + (++i); }
  id = cand;

  const zStr = prompt(`${kind}: ID=${id}\nPodaj H (Z). Pozostaw puste dla 0:`, '');
  const z = zStr ? Number(zStr.replace(',', '.')) : 0;
  const p = { id, x, y, z };
  toWgsAndAttach(p);
  if(kind==='PIKIETA'){
    p.marker = L.circleMarker([p.lat,p.lon], { radius:3, color:'#d00000', weight:1, fill:true, fillOpacity:0.9 }).bindTooltip(tooltipText(p), {sticky:true}).addTo(layers.pikiety);
    p.labelMarker = L.marker([p.lat,p.lon], { icon: L.divIcon({ html:`<div style="white-space:nowrap;font-weight:600;color:#a00000;text-shadow:0 0 3px rgba(255,255,255,0.95),0 0 2px rgba(0,0,0,0.15)">${p.id}</div>`, className:'', iconSize:[0,0] }) }).addTo(layers.labels);
    state.pikiety.push(p);
    bindPikietaEditorOrPicker(p);
    refreshPikietyStyles();
  } else {
    p.marker = L.circleMarker([p.lat,p.lon], { radius:7, color:'#0055ff', weight:3.5, fill:true, fillOpacity:0.98 }).bindTooltip(tooltipText(p), {sticky:true}).addTo(layers.osnowa);
    p.labelMarker = L.marker([p.lat,p.lon], { icon: L.divIcon({ html:`<div style="white-space:nowrap;font-weight:700;color:#0034d6;text-shadow:0 0 3px rgba(255,255,255,0.95),0 0 2px rgba(0,0,0,0.15)">${p.id}</div>`, className:'', iconSize:[0,0] }) }).addTo(layers.labels);
    state.osnowa.push(p);
    bindOsnowaEditorOrSelector(p);
  }
  document.dispatchEvent(new CustomEvent('labels:update')); // signal resize
  setAddMode('OFF');
}
