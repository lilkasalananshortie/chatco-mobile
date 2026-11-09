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
  var signature=JSON.stringify([state.hails,state.canOperate]);
  if(signature===lastHails)return;
  lastHails=signature;hailLayer.clearLayers();
  state.hails.forEach(function(h){
    var box=document.createElement('div'),title=document.createElement('strong'),body=document.createElement('p'),row=document.createElement('div');
    title.textContent=h.commuterName;title.style.color='#FF6D3A';
    body.textContent=(h.label||'Passenger waiting')+(h.etaMinutes?' · '+h.etaMinutes+' min away':'');row.className='hail-actions';
    ['accept','reject'].forEach(function(action){
      var button=document.createElement('button');button.textContent=action==='accept'?'Accept':'Reject';button.disabled=!state.canOperate;
      button.onclick=function(){
        if(!window.ReactNativeWebView||!state.canOperate)return;
        row.querySelectorAll('button').forEach(function(b){b.disabled=true});
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'hail',id:h.id,action:action}));
      };row.appendChild(button);
    });
    box.appendChild(title);box.appendChild(body);box.appendChild(row);
    L.marker([h.latitude,h.longitude]).bindPopup(box).addTo(hailLayer);
  });
};`;

export function leafletUpdateScript(state: {
  latitude: number; longitude: number; vehicleIconHtml: string;
  hails: unknown[]; canOperate: boolean;
}): string {
  // Escape script delimiters as well as JS line separators in passenger labels.
  const data = JSON.stringify(state).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `window.updateLiveMap && window.updateLiveMap(${data});true;`;
}
