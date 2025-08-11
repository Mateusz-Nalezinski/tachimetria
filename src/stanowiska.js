import { state } from './state.js';
import { distance2D, $, tooltipText } from './utils.js';
import { makeMarker, makeLabel, toWgsAndAttach, layers, map } from './map.js';

export function addStanowiskoCard(){
  const id = state.nextStanId++;
  const group = L.layerGroup().addTo(map);
  const color = state.colors[state.colorIdx++ % state.colors.length];
  const obj = { id, name:`Stan ${id}`, color, stan:null, nawiazania:[], radius:100, pikietyAll:[], pikiety:[], sort:'dist', clickSeq:new Map(), nextClickSeq:1, group };
  state.stanowiska.push(obj);
  renderStanList();
}

export function sortPikietyForStan(st){
  if(!st.stan) return;
  st.pikietyAll.forEach(pk=>{ pk._dist = distance2D(st.stan, pk); });
  if(st.sort==='click'){
    const getSeq = pk=> st.clickSeq.has(pk.id) ? st.clickSeq.get(pk.id) : Number.MAX_SAFE_INTEGER;
    const cmpClick = (a,b)=> getSeq(a)-getSeq(b);
    st.pikiety.sort(cmpClick);
    st.pikietyAll.sort((a,b)=>{
      const sa = st.clickSeq.has(a.id), sb = st.clickSeq.has(b.id);
      if(sa && sb) return getSeq(a)-getSeq(b);
      if(sa && !sb) return -1;
      if(!sa && sb) return 1;
      return (a._dist||0)-(b._dist||0);
    });
  } else {
    const cmp = st.sort==='alpha'
      ? (a,b)=> String(a.id).localeCompare(String(b.id), 'pl', {numeric:true})
      : (a,b)=> (a._dist||0)-(b._dist||0);
    st.pikietyAll.sort(cmp);
    st.pikiety.sort(cmp);
  }
}

export function renderStanList(){
  const box = $('#stanList');
  box.innerHTML='';
  state.stanowiska.forEach(st =>{
    const div = document.createElement('div');
    div.className='card';

    const chipsStan = st.stan
      ? `<span class="chip" style="border-color:${st.color}; background:${st.color}22">${st.stan.id}</span>` : '—';

    const chipsNaw = st.nawiazania.length
      ? st.nawiazania.map(p=>`<span class="chip" style="border-color:${st.color}; background:${st.color}22" data-act="naw-del" data-stanid="${st.id}" data-pkid="${p.id}">${p.id}<span class="x">×</span></span>`).join(' ')
      : '—';

    const pkControls = st.pikietyAll.length ? `
      <div class="row-flex" style="margin-top:4px; align-items:center;">
        <label style="flex:0 0 auto">Sortuj:</label>
        <select data-act="sort" data-id="${st.id}" style="flex:0 0 180px">
          <option value="dist" ${st.sort==='dist'?'selected':''}>wg odległości</option>
          <option value="alpha" ${st.sort==='alpha'?'selected':''}>alfabetycznie</option>
          <option value="click" ${st.sort==='click'?'selected':''}>kolejność klikania</option>
        </select>
        <button data-act="pk-all" data-mode="on"  data-id="${st.id}">Zaznacz wszystkie</button>
        <button data-act="pk-all" data-mode="off" data-id="${st.id}">Odznacz wszystkie</button>
      </div>
      <div class="pklist" data-stanid="${st.id}">
        ${st.pikietyAll.map(pk=>{
          const checked  = st.pikiety.some(p=>p.id===pk.id) ? 'checked' : '';
          const disabled = state.pkOwner.has(pk.id) && state.pkOwner.get(pk.id)!==st.id ? 'disabled' : '';
          const note     = disabled ? ' <span style="color:#b00">(w innym stanowisku)</span>' : '';
          const distTxt  = (typeof pk._dist==='number') ? ` <span style="opacity:.6">(${pk._dist.toFixed(2)} m)</span>` : '';
          const seqTxt   = st.clickSeq.has(pk.id) ? ` <span style="opacity:.6">[#${st.clickSeq.get(pk.id)}]</span>` : '';
          return `<label class="small"><input type="checkbox" data-act="pk-tgl" data-stanid="${st.id}" data-pkid="${pk.id}" ${checked} ${disabled}/> ${pk.id}${seqTxt}${note}${distTxt} <span style="opacity:.6">Y:${pk.y.toFixed(2)} X:${pk.x.toFixed(2)}</span></label>`;
        }).join('<br/>')}
      </div>` : '<div class="small" style="opacity:.7">Brak pikiet — kliknij „Pobierz pikiety”.</div>';

    const isAddPkActive = state.selection.active && state.selection.mode==='ADD_PK' && state.selection.stanObj && state.selection.stanObj.id===st.id;
    const addBtnClass = isAddPkActive ? 'btn-pick-on' : '';
    const addBtnLabel = isAddPkActive ? 'Tryb: dodawanie AKTYWNY — klikaj pikiety na mapie' : 'Tryb: dodaj pikiety klikając na mapie';

    div.innerHTML = `
      <h4>${st.name} <span class="badge" style="background:${st.color}22; border:1px solid ${st.color}; color:#111">kolor</span></h4>
      <div class="small">ID: ${st.id}</div>
      <div class="row-flex">
        <button data-act="pick" data-mode="STAN" data-id="${st.id}">Wybierz STAN</button>
        <span class="small">STAN:</span> ${chipsStan}
      </div>
      <div class="row-flex">
        <button data-act="pick" data-mode="NAW_MANY" data-id="${st.id}">Wybierz nawiązania (wiele)</button>
        <button data-act="naw-clear" data-id="${st.id}">Wyczyść nawiązania</button>
      </div>
      <div class="small">Nawiązania: ${chipsNaw}</div>
      <div class="row-flex" style="margin-top:6px; align-items:center;">
        <label style="flex:0 0 120px">Promień (m):</label>
        <input type="number" class="inp-radius" data-id="${st.id}" value="${st.radius}" min="1" step="1"/>
        <button data-act="grab" data-id="${st.id}">Pobierz pikiety</button>
        <button data-act="accept" data-id="${st.id}">Zatwierdź</button>
        <button data-act="clear" data-id="${st.id}">Usuń</button>
      </div>
      <div class="row-flex" style="margin-top:6px; align-items:center;">
        <button data-act="mode-addpk" data-id="${st.id}" class="${addBtnClass}">${addBtnLabel}</button>
      </div>
      <div class="small" style="margin-top:6px;">Pikiety przypisane: ${st.pikiety.length ? st.pikiety.map(p=>p.id).join(', ') : '—'}</div>
      ${pkControls}
    `;
    box.appendChild(div);
  });

  // Handlers
  box.querySelectorAll('button[data-act="pick"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const mode = e.currentTarget.getAttribute('data-mode');
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const st = state.stanowiska.find(s=>s.id===id);
      state.selection = { active:true, mode, stanObj: st };
      alert(mode==='STAN' ? 'Kliknij na mapie punkt osnowy jako STAN.' : 'Klikaj punkty osnowy, aby DODAĆ/USUNĄĆ je jako nawiązania.');
      renderStanList();
    });
  });

  box.querySelectorAll('button[data-act="mode-addpk"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const st = state.stanowiska.find(s=>s.id===id);
      if(!st.stan){ alert('Najpierw wybierz STAN.'); return; }
      const isActive = state.selection.active && state.selection.mode==='ADD_PK' && state.selection.stanObj && state.selection.stanObj.id===st.id;
      if(isActive){
        state.selection = { active:false, mode:null, stanObj:null };
        renderStanList();
      } else {
        state.selection = { active:true, mode:'ADD_PK', stanObj: st };
        renderStanList();
        alert('Tryb „ADD_PK” włączony: klikaj pikiety na mapie, aby DODAĆ/USUNĄĆ je w stanowisku. Kliknij ponownie przycisk, aby wyłączyć.');
      }
    });
  });

  box.querySelectorAll('button[data-act="naw-clear"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const st = state.stanowiska.find(s=>s.id===id);
      st.nawiazania = [];
      redrawStanGraphics(st);
      renderStanList();
    });
  });

  box.querySelectorAll('span.chip[data-act="naw-del"]').forEach(chip=>{
    chip.addEventListener('click', e=>{
      const id = Number(e.currentTarget.getAttribute('data-stanid'));
      const pkid = String(e.currentTarget.getAttribute('data-pkid'));
      const st = state.stanowiska.find(s=>s.id===id);
      st.nawiazania = st.nawiazania.filter(p=>p.id!==pkid);
      redrawStanGraphics(st);
      renderStanList();
    });
  });

  box.querySelectorAll('input.inp-radius').forEach(inp=>{
    inp.addEventListener('change', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const st = state.stanowiska.find(s=>s.id===id);
      st.radius = Number(e.currentTarget.value)||100;
      redrawStanGraphics(st);
    });
  });

  box.querySelectorAll('button[data-act="grab"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const st = state.stanowiska.find(s=>s.id===id);
      if(!st.stan){ alert('Najpierw wybierz STAN.'); return; }
      grabPikietyForStan(st);
      sortPikietyForStan(st);
      renderStanList();
    });
  });

  box.querySelectorAll('button[data-act="accept"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const st = state.stanowiska.find(s=>s.id===id);
      alert(`Zapisano stanowisko ${st.name}. Nawiązań: ${st.nawiazania.length}. Pikiety: ${st.pikiety.length}`);
    });
  });

  box.querySelectorAll('button[data-act="clear"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const idx = state.stanowiska.findIndex(s=>s.id===id);
      if(idx>=0){
        state.stanowiska[idx].pikiety.forEach(pk=>{
          if(state.pkOwner.get(pk.id)===state.stanowiska[idx].id) state.pkOwner.delete(pk.id);
        });
        refreshPikietyStyles();
        map.removeLayer(state.stanowiska[idx].group);
        state.stanowiska.splice(idx,1);
        renderStanList();
      }
    });
  });

  box.querySelectorAll('button[data-act="pk-all"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const mode = e.currentTarget.getAttribute('data-mode');
      const st = state.stanowiska.find(s=>s.id===id);
      if(mode==='on'){
        st.pikiety = st.pikietyAll.filter(pk=> !state.pkOwner.has(pk.id) || state.pkOwner.get(pk.id)===st.id);
        st.pikiety.forEach(pk=> state.pkOwner.set(pk.id, st.id));
        if(st.sort==='click'){
          st.clickSeq.clear();
          st.nextClickSeq = 1;
          st.pikiety.forEach(pk=> st.clickSeq.set(pk.id, st.nextClickSeq++));
        }
      } else {
        st.pikiety.forEach(pk=>{
          if(state.pkOwner.get(pk.id)===st.id) state.pkOwner.delete(pk.id);
        });
        st.pikiety = [];
        st.clickSeq.clear();
        st.nextClickSeq=1;
      }
      refreshPikietyStyles();
      redrawStanGraphics(st);
      sortPikietyForStan(st);
      renderStanList();
    });
  });

  box.querySelectorAll('input[type="checkbox"][data-act="pk-tgl"]').forEach(chk=>{
    chk.addEventListener('change', e=>{
      const stanId = Number(e.currentTarget.getAttribute('data-stanid'));
      const pkId = String(e.currentTarget.getAttribute('data-pkid'));
      const st = state.stanowiska.find(s=>s.id===stanId);
      const pk = st.pikietyAll.find(p=>p.id===pkId);
      if(!pk) return;
      if(e.currentTarget.checked){
        if(state.pkOwner.has(pk.id) && state.pkOwner.get(pk.id)!==st.id){
          alert(`Pikieta ${pk.id} jest już przypisana do stanowiska ${state.pkOwner.get(pk.id)}. Najpierw odznacz ją tam.`);
          e.currentTarget.checked = false;
          return;
        }
        if(!st.pikiety.some(p=>p.id===pkId)) st.pikiety.push(pk);
        state.pkOwner.set(pk.id, st.id);
        if(st.sort==='click' && !st.clickSeq.has(pk.id)) st.clickSeq.set(pk.id, st.nextClickSeq++);
      } else {
        st.pikiety = st.pikiety.filter(p=>p.id!==pkId);
        if(state.pkOwner.get(pk.id)===st.id) state.pkOwner.delete(pk.id);
        if(st.clickSeq.has(pk.id)) st.clickSeq.delete(pk.id);
      }
      refreshPikietyStyles();
      redrawStanGraphics(st);
      sortPikietyForStan(st);
      renderStanList();
    });
  });

  box.querySelectorAll('select[data-act="sort"]').forEach(sel=>{
    sel.addEventListener('change', e=>{
      const id = Number(e.currentTarget.getAttribute('data-id'));
      const st = state.stanowiska.find(s=>s.id===id);
      st.sort = e.currentTarget.value==='alpha' ? 'alpha' : (e.currentTarget.value==='click' ? 'click' : 'dist');
      sortPikietyForStan(st);
      renderStanList();
    });
  });
}

export function redrawStanGraphics(st){
  const g = st.group;
  g.clearLayers();
  if(st.stan){
    L.circle([st.stan.lat, st.stan.lon], {radius: st.radius||100, color: st.color, fill:false}).addTo(g);
  }
  if(st.stan && st.nawiazania.length){
    st.nawiazania.forEach(n => {
      L.polyline([[st.stan.lat, st.stan.lon],[n.lat, n.lon]], {color: st.color, weight:3}).addTo(g);
    });
  }
  if(st.stan && st.pikiety.length){
    st.pikiety.forEach(pk=> L.polyline([[st.stan.lat, st.stan.lon],[pk.lat, pk.lon]], {color: st.color, weight:2, dashArray:'4,4'}).addTo(g));
  }
}

export function refreshPikietyStyles(){
  state.pikiety.forEach(pk=>{
    const ownerId = state.pkOwner.get(pk.id);
    let color = '#d00000';
    if(ownerId){
      const st = state.stanowiska.find(s=>s.id===ownerId);
      if(st) color = st.color;
    }
    if(pk.marker && pk.marker.setStyle){
      pk.marker.setStyle({ color, fillColor: color, weight: 1, radius: 3 });
    }
    if(pk.labelMarker && pk.labelMarker._labelEl){
      pk.labelMarker._labelEl.style.color = ownerId ? color : '#a00000';
    }
  });
}

export function grabPikietyForStan(st){
  st.pikietyAll = [];
  st.pikiety = [];
  if(!st.stan) return;
  const R = Number(st.radius)||100;
  const eligible = [];
  state.pikiety.forEach(pk=>{
    if(distance2D(st.stan, pk) <= R + 1e-9){
      st.pikietyAll.push(pk);
      if(!state.pkOwner.has(pk.id) || state.pkOwner.get(pk.id)===st.id){
        eligible.push(pk);
      }
    }
  });
  st.pikiety = eligible.slice();
  st.pikiety.forEach(pk=> state.pkOwner.set(pk.id, st.id));
  if(st.sort==='click'){
    st.clickSeq.clear();
    st.nextClickSeq = 1;
    st.pikiety.forEach(pk=> st.clickSeq.set(pk.id, st.nextClickSeq++));
  }
  refreshPikietyStyles();
  redrawStanGraphics(st);
}

// Draw & attach points
export function drawAll(bindOsnowa, bindPikieta){
  const epsg=getComputedStyle(document.documentElement).getPropertyValue('--epsg'); // not used (kept for parity)
  layers.osnowa.clearLayers();
  layers.pikiety.clearLayers();
  layers.labels.clearLayers();

  state.osnowa.forEach(p=>{
    toWgsAndAttach(p);
    p.marker=makeMarker(p,'#0055ff', true).addTo(layers.osnowa);
    p.labelMarker = makeLabel(p.id, '#0034d6', true).setLatLng([p.lat,p.lon]).addTo(layers.labels);
    bindOsnowa(p);
  });

  state.pikiety.forEach(p=>{
    toWgsAndAttach(p);
    p.marker=makeMarker(p,'#d00000', false).addTo(layers.pikiety);
    p.labelMarker = makeLabel(p.id, '#a00000', false).setLatLng([p.lat,p.lon]).addTo(layers.labels);
    bindPikieta(p);
  });
}
