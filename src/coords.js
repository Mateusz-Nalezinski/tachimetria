// Coordinate systems & conversions
export const EPSG_DEFAULT = 'EPSG:2178';

export function definePUWG(){
  // proj4 is global via script tag
  proj4.defs('EPSG:2176','+proj=tmerc +lat_0=0 +lon_0=15 +k=0.999923 +x_0=5500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
  proj4.defs('EPSG:2177','+proj=tmerc +lat_0=0 +lon_0=18 +k=0.999923 +x_0=6500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
  proj4.defs('EPSG:2178','+proj=tmerc +lat_0=0 +lon_0=21 +k=0.999923 +x_0=7500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
  proj4.defs('EPSG:2179','+proj=tmerc +lat_0=0 +lon_0=24 +k=0.999923 +x_0=8500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
}

export function autoDetectEPSG(points){
  if(!points||!points.length) return null;
  const x = points[0].x;
  if(x>=8000000) return 'EPSG:2179';
  if(x>=7000000) return 'EPSG:2178';
  if(x>=6000000) return 'EPSG:2177';
  return 'EPSG:2176';
}

export function toWGS(epsg,p){
  const [lon,lat]=proj4(epsg,'EPSG:4326',[p.x,p.y]);
  return {lon,lat};
}

export function fromWGS(epsg,latlng){
  const [x,y]=proj4('EPSG:4326',epsg,[latlng.lng,latlng.lat]);
  return {x,y};
}
