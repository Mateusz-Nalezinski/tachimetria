// Global state & constants
export const state = {
  osnowa: [],      // [{id, x, y, z, lat, lon, marker, labelMarker}]
  pikiety: [],     // [{id, x, y, z, lat, lon, marker, labelMarker}]
  stanowiska: [],  // [{id, name, color, stan, nawiazania:[], radius, pikietyAll:[], pikiety:[], sort, clickSeq, nextClickSeq, group}]
  pkOwner: new Map(),
  selection: { active:false, mode:null, stanObj:null },
  nextStanId: 1,
  addMode: 'OFF',
  drawMode: false,
  firstPoint: null,
  colors: [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
    '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe'
  ],
  colorIdx: 0
};

export function resetState(map){
  state.osnowa = [];
  state.pikiety = [];
  state.stanowiska.forEach(s=> map.removeLayer(s.group));
  state.stanowiska = [];
  state.nextStanId = 1;
  state.selection = { active:false, mode:null, stanObj:null };
  state.pkOwner.clear();
}
