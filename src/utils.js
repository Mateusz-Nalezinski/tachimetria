// Utilities shared
export const $ = sel => document.querySelector(sel);

export function splitRow(line){
  const t = String(line).trim();
  if(!t) return null;
  return t.split(/[\s;,]+/).filter(s=>s.length);
}

export function distance2D(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

export function tooltipText(p){
  return `${p.id}<br/>Y: ${p.y.toFixed(3)}<br/>X: ${p.x.toFixed(3)}<br/>Z: ${p.z.toFixed(3)}`;
}
