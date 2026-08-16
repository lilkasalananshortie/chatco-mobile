import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import "./leaflet-base.css";
import type { HailRequest } from "../../core/domain/types";

const RADIUS_METERS = 1000;
const ROUTE_COORDS: [number, number][] = [
  [14.925460996033356, 120.76512235423647], [14.92420402124189, 120.76528787872712],
  [14.920152600670095, 120.76571706129354], [14.915220582966443, 120.76619717003261],
  [14.901323759501945, 120.7719224852731], [14.886458903875173, 120.78596796657541],
  [14.874990764897628, 120.79618423260841], [14.87207763773181, 120.79878589058617],
  [14.865745283697539, 120.80435407290116], [14.860501402001871, 120.80901802051571],
  [14.85778433148678, 120.81163478600241], [14.855388331987022, 120.81368996254061],
  [14.852693386081329, 120.81600207219617], [14.851497406805521, 120.81765988586791],
  [14.849417900874624, 120.8235248577769], [14.845945790029823, 120.83422329239757],
  [14.844320234352493, 120.83905948176812], [14.842383282603786, 120.84506982184078],
  [14.841893283760905, 120.84698408093634], [14.840375174197046, 120.85413496987503],
  [14.839623777400517, 120.85750998638694], [14.838634008132473, 120.86201040680506],
  [14.8371385749864, 120.86297382674883], [14.83612807323988, 120.86333412418747],
  [14.835254069547146, 120.86366551171416], [14.833295288398967, 120.8661891975047],
  [14.8324975199314, 120.86740282879738], [14.831810284552892, 120.86868877790535],
  [14.83035944532852, 120.87094580599025], [14.828506904517909, 120.87400904071411],
  [14.828161518510791, 120.87659402671414], [14.828232464378223, 120.88095495481001],
  [14.828293590064265, 120.88426507598852], [14.828333307002257, 120.886565917288],
  [14.827864597760719, 120.89053477186802], [14.827464358080183, 120.89241460779954],
  [14.826703652032982, 120.89503763480697], [14.826129391774803, 120.89676317509107],
  [14.824720294651351, 120.89902058487867], [14.822990488146456, 120.90083394930517],
  [14.820845909007058, 120.90316146076532], [14.819825636767673, 120.90421208848784],
  [14.818163498638592, 120.90600984388941], [14.81713926187142, 120.90792339416925],
  [14.817003259236085, 120.90825980129833], [14.815860883789151, 120.90986972578348],
  [14.815234108397684, 120.91047524129526], [14.81440037604567, 120.91144161960287],
  [14.813099510668458, 120.91283614016609], [14.811588723108294, 120.91413585780512],
  [14.809543338082284, 120.9159455873501], [14.806525108118892, 120.91850689602882],
  [14.801946360221512, 120.92201682737273], [14.800215165075755, 120.9231979150914],
  [14.798804712598924, 120.92456195413324], [14.798451222604799, 120.92693781063585],
  [14.797677687963592, 120.92897276863408], [14.79630282892156, 120.92974647714638],
  [14.794082971006238, 120.9309174591896], [14.792193992873402, 120.9319309517239],
  [14.789984757130886, 120.93194351724061], [14.786542900321203, 120.93179853039794],
  [14.782758056853037, 120.93416554556896], [14.78116722012781, 120.93525425025881],
  [14.778139275650638, 120.93709526206992], [14.773104742636574, 120.93960422042926],
  [14.766525006702839, 120.94320546363049], [14.765525492192376, 120.94401383576125],
  [14.76072862621141, 120.94974045073359], [14.757057921030993, 120.95282600874056],
  [14.754092913022339, 120.95430633290394], [14.749614776242218, 120.95648776807238],
  [14.743004859115217, 120.95912082860627], [14.738243986091819, 120.96064278809952],
  [14.73118850798765, 120.96137476925526], [14.729202256905156, 120.96135109408412],
  [14.725646764905104, 120.9604838112117],
];

const routeBounds = L.latLngBounds(ROUTE_COORDS);
const MAP_CENTER: [number, number] = [routeBounds.getCenter().lat, routeBounds.getCenter().lng];
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [routeBounds.getSouth() - 0.04, routeBounds.getWest() - 0.10],
  [routeBounds.getNorth() + 0.015, routeBounds.getEast() + 0.10],
];

function distanceMeters(a: [number, number], b: [number, number]) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function LiveMap({ latitude, longitude, hails, unitNumber = "—", fill = false, routeCoordinates, routeSource = "fallback" }: {
  latitude?: number;
  longitude?: number;
  hails: HailRequest[];
  unitNumber?: string;
  fill?: boolean;
  routeCoordinates?: Array<[number, number]>;
  routeSource?: "backend" | "fallback";
}) {
  const [tilesLoading, setTilesLoading] = useState(true);
  useEffect(() => {
    const fallback = setTimeout(() => setTilesLoading(false), 7000);
    return () => clearTimeout(fallback);
  }, []);
  const routeCoords = routeCoordinates?.length && routeCoordinates.length > 1 ? routeCoordinates : ROUTE_COORDS;
  const routeBounds = useMemo(() => L.latLngBounds(routeCoords), [routeCoords]);
  const mapCenter: [number, number] = [routeBounds.getCenter().lat, routeBounds.getCenter().lng];
  const vehiclePosition: [number, number] = latitude !== undefined && longitude !== undefined
    ? [latitude, longitude]
    : MAP_CENTER;
  const visibleHails = hails.filter(hail =>
    distanceMeters(vehiclePosition, [hail.latitude, hail.longitude]) <= RADIUS_METERS
  );

  const vehicleIcon = useMemo(() => L.divIcon({
    className: "chatco-vehicle-marker",
    html: `<div class="chatco-vehicle-dot">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A5FB4" stroke-width="2">
        <path d="M3 16.5V9.75A2.25 2.25 0 0 1 5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75v6.75M5 16.5h14M7.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm9 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>
      </svg>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  }), []);

  const hailingIcon = useMemo(() => L.divIcon({
    className: "chatco-hail-marker",
    html: `<div class="chatco-hail-dot"><span></span></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -15],
  }), []);

  return (
    <div className={`chatco-map-shell${fill ? " chatco-map-fill" : ""}`}>
      <MapContainer
        center={mapCenter}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        maxBounds={[
          [routeBounds.getSouth() - 0.04, routeBounds.getWest() - 0.10],
          [routeBounds.getNorth() + 0.015, routeBounds.getEast() + 0.10],
        ]}
        maxBoundsViscosity={1}
        minZoom={11}
        style={{ width: "100%", height: "100%", background: "#050F1A" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          keepBuffer={0}
          updateWhenIdle
          updateWhenZooming={false}
          eventHandlers={{
            loading: () => setTilesLoading(true),
            load: () => setTilesLoading(false),
            tileerror: () => setTilesLoading(false),
          }}
        />
        <Polyline positions={routeCoords} pathOptions={{ color: "#62A0EA", weight: 8, opacity: 0.2, lineCap: "round", lineJoin: "round" }} />
        <Polyline positions={routeCoords} pathOptions={{ color: "#62A0EA", weight: 4, opacity: 0.9, dashArray: "10 10", lineCap: "round", lineJoin: "round" }} />
        <Circle center={vehiclePosition} radius={RADIUS_METERS} pathOptions={{ color: "#1A5FB4", fillColor: "#1A5FB4", fillOpacity: 0.05, weight: 1.5, opacity: 0.3, dashArray: "8 4" }} />
        <Marker position={vehiclePosition} icon={vehicleIcon}>
          <Popup>
            <div className="chatco-popup">
              <strong>{unitNumber} (You)</strong><span>Active</span>
              <p>Status: Available</p><p>Radius: 1 km pickup zone</p>
            </div>
          </Popup>
        </Marker>
        {visibleHails.map(hail => (
          <Marker key={hail.id} position={[hail.latitude, hail.longitude]} icon={hailingIcon}>
            <Popup>
              <div className="chatco-popup">
                <strong style={{ color: "#FF6D3A" }}>{hail.commuterName}</strong>
                <p>{hail.label || "Passenger waiting"}{hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {tilesLoading ? <div className="chatco-map-loading"><span></span><strong>Loading route map…</strong></div> : null}
      {routeSource === "fallback" ? <div className="chatco-route-warning">Published route unavailable — showing local fallback</div> : null}
      <style>{`
        .chatco-map-shell{position:relative;height:420px;width:100%;overflow:hidden;border-radius:18px;margin-top:14px;border:1px solid rgba(255,255,255,.09);box-shadow:0 7px 18px rgba(0,0,0,.16);background:#050F1A}
        .chatco-map-shell.chatco-map-fill{position:absolute;inset:0;height:100%;margin:0;border:0;border-radius:0;box-shadow:none}
        .chatco-map-loading{position:absolute;inset:0;z-index:900;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#91A0B4;background:#050F1A;pointer-events:none;font:12px system-ui}
        .chatco-route-warning{position:absolute;top:10px;left:10px;right:10px;z-index:850;text-align:center;color:#FEF3C7;background:rgba(69,26,3,.92);border:1px solid rgba(252,211,77,.3);border-radius:6px;padding:5px 8px;font:700 10px system-ui;pointer-events:none}
        .chatco-map-loading span{width:28px;height:28px;border:3px solid #163452;border-top-color:#62A0EA;border-radius:50%;animation:chatco-spin .8s linear infinite}
        .chatco-map-shell .leaflet-container{background:#050F1A!important;font-family:inherit!important}
        .chatco-vehicle-marker,.chatco-hail-marker{background:transparent!important;border:0!important}
        .chatco-vehicle-dot{width:44px;height:44px;background:#071A2E;border-radius:50%;border:2.5px solid #1A5FB4;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(0,0,0,.5),0 0 8px #1A5FB440}
        .chatco-hail-dot{position:relative;width:20px;height:20px;background:#FF6D3A;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(255,109,58,.6)}
        .chatco-hail-dot span{position:absolute;inset:-8px;background:rgba(255,109,58,.3);border-radius:50%;animation:chatco-pulse 2s infinite}
        .chatco-map-shell .leaflet-popup-content-wrapper{background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.15)}
        .chatco-map-shell .leaflet-popup-content{margin:12px 16px;color:#071A2E;line-height:1.4;min-width:180px}
        .chatco-map-shell .leaflet-popup-tip{background:white}.chatco-popup strong{color:#1A5FB4}.chatco-popup span{float:right;font-size:9px;text-transform:uppercase}.chatco-popup p{margin:5px 0 0;font-size:12px;color:#6b7280}
        @keyframes chatco-pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}@keyframes chatco-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
