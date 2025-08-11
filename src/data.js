import { splitRow } from './utils.js';

export function parseTextAsYXZ(text){
  const raw = Papa.parse(text.trim(), { delimiter:"", skipEmptyLines:true }).data;
  const rows = raw.map(r => Array.isArray(r) && r.length>1 ? r : splitRow(Array.isArray(r)?r[0]:r));
  const pts = [];
  for (const row of rows){
    if (!row || row.length<3) continue;
    const id = String(row[0]);
    const Y = parseFloat(String(row[1]).replace(',','.'));
    const X = parseFloat(String(row[2]).replace(',','.'));
    const Z = row[3]!==undefined ? parseFloat(String(row[3]).replace(',','.')) : 0;
    if (isFinite(X) && isFinite(Y)) pts.push({ id, x: X, y: Y, z: isFinite(Z)?Z:0 });
  }
  return pts;
}
