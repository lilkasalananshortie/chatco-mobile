/** Runs inside the fallback WebView. Keep live data out of its HTML source so
 * GPS fixes update layers without reloading Leaflet, tiles, or the camera. */
export const LEAFLET_LIVE_UPDATE = `
var vehicle=null,circle=null,hailLayer=L.layerGroup().addTo(map),lastHails='';
window.updateLiveMap=function(state){
  var point=[state.latitude,state.longitude];
  var icon=L.divIcon({className:'chatco-vehicle-marker',html:state.vehicleIconHtml,iconSize:[86,80],iconAnchor:[43,40],popupAnchor:[0,-50]});
  if(!vehicle){
    vehicle=L.marker(point,{icon:icon}).addTo(map);
    vehicle.on('click',function(){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'vehicle'}))});
    circle=L.circle(point,{radius:1000,color:neutral,fillColor:neutral,fillOpacity:.05,weight:1.5,opacity:.3,dashArray:'8 4'}).addTo(map);
  }else{vehicle.setLatLng(point).setIcon(icon);circle.setLatLng(point);}
  var signature=JSON.stringify(state.hails);
  if(signature===lastHails)return;
  lastHails=signature;hailLayer.clearLayers();
  state.hails.forEach(function(h){
    var box=document.createElement('div'),title=document.createElement('strong');
    title.textContent='Commuter';title.style.color='#FF6D3A';box.style.minWidth='180px';box.appendChild(title);
    var icon=L.divIcon({className:'chatco-hail-marker',html:state.hailMarkerHtml,iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-19]});
    L.marker([h.latitude,h.longitude],{icon:icon,zIndexOffset:1000}).bindPopup(box,{className:'chatco-hail-popup',closeButton:false}).addTo(hailLayer);
  });
};`;

export function leafletUpdateScript(state: {
  latitude: number; longitude: number; vehicleIconHtml: string;
  hails: unknown[]; hailMarkerHtml: string;
}): string {
  // Escape script delimiters as well as JS line separators in passenger labels.
  const data = JSON.stringify(state).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `window.updateLiveMap && window.updateLiveMap(${data});true;`;
}
