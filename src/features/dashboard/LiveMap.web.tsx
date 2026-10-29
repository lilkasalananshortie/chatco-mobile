import { useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "./leaflet-base.css";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { LiveMapProps } from "./LiveMap";
import { HAIL_MARKER_HTML, vehicleMarkerHtml, markerPresentation } from "./map-presentation";

const CARTO_API_KEY =
  process.env.EXPO_PUBLIC_CARTO_API_KEY ||
  process.env.NEXT_PUBLIC_CARTO_API_KEY ||
  (Constants.expoConfig?.extra?.cartoApiKey as string | undefined) ||
  "cb1_2dut_1_0bf5bd46e8782ff0b7ba6f38";

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

/** Fit the route into the exposed map area whenever its actual layout changes. */
function ResponsiveMapViewport({ bounds, top, bottom }: { bounds: L.LatLngBounds; top: number; bottom: number }) {
  const map = useMap();
  const west = bounds.getWest(), south = bounds.getSouth(), east = bounds.getEast(), north = bounds.getNorth();
  useEffect(() => {
    const routeBounds = L.latLngBounds([south, west], [north, east]);
    const container = map.getContainer();
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!container.clientWidth || !container.clientHeight) return;
        map.stop();
        map.invalidateSize({ pan: false, debounceMoveend: true });
        const bottomPadding = Math.min(bottom, Math.max(0, container.clientHeight - 96));
        const topPadding = Math.min(top, Math.max(0, container.clientHeight - bottomPadding - 96));
        // getBoundsZoom clamps to the current minimum, so release it before measuring.
        map.setMinZoom(0);
        const fitZoom = map.getBoundsZoom(routeBounds, false, L.point(32, topPadding + bottomPadding + 32));
        // Small screens need a lower zoom to show the entire route between controls.
        map.setMinZoom(Math.max(0, Math.min(11, fitZoom)));
        map.fitBounds(routeBounds, {
          paddingTopLeft: [16, topPadding + 16],
          paddingBottomRight: [16, bottomPadding + 16],
          maxZoom: 14,
          animate: false,
        });
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [map, west, south, east, north, top, bottom]);
  return null;
}

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

export function LiveMap({ latitude, longitude, hails, unitNumber = "—", fill = false, routeCoordinates, viewportInsets, capacity = "AVAILABLE", isOnBreak = false, canOperate = false, onHail }: LiveMapProps) {
  const { colors, isLofi } = useAppTheme();
  const [tilesLoading, setTilesLoading] = useState(true);
  const initialTilesReady = useRef(false);
  const [tileError, setTileError] = useState(false);
  const [hailBusyId, setHailBusyId] = useState<string | null>(null);
  useEffect(() => {
    const fallback = setTimeout(() => { initialTilesReady.current = true; setTilesLoading(false); }, 7000);
    return () => clearTimeout(fallback);
  }, []);
  const routeCoords = routeCoordinates?.length && routeCoordinates.length > 1 ? routeCoordinates : ROUTE_COORDS;
  const routeBounds = useMemo(() => L.latLngBounds(routeCoords), [routeCoords]);
  const mapCenter: [number, number] = [routeBounds.getCenter().lat, routeBounds.getCenter().lng];
  const vehiclePosition: [number, number] = latitude !== undefined && longitude !== undefined
    ? [latitude, longitude]
    : mapCenter;
  const visibleHails = hails.filter(hail =>
    distanceMeters(vehiclePosition, [hail.latitude, hail.longitude]) <= RADIUS_METERS
  );

  const cartoBase = isLofi
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  const tileUrl = tileError
    ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    : `${cartoBase}${CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : ""}`;

  const vehicleIcon = useMemo(() => L.divIcon({
    className: "chatco-vehicle-marker",
    html: vehicleMarkerHtml(capacity, isOnBreak, isLofi ? colors.surface : "#071A2E"),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  }), [capacity, colors.surface, isLofi, isOnBreak]);

  const hailingIcon = useMemo(() => L.divIcon({
    className: "chatco-hail-marker",
    html: HAIL_MARKER_HTML,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -19],
  }), []);

  return (
    <div
      className={`chatco-map-shell${fill ? " chatco-map-fill" : ""}`}
      style={{
        borderRadius: fill ? 0 : 18,
        borderColor: colors.border,
        borderWidth: fill ? 0 : 1,
        background: colors.surface,
        // Match conductor web: contain Leaflet's pane z-indexes below the dashboard.
        zIndex: 0,
        isolation: "isolate",
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        minZoom={11}
        maxZoom={19}
        dragging
        touchZoom
        scrollWheelZoom
        doubleClickZoom
        zoomAnimation={false}
        style={{ width: "100%", height: "100%", background: colors.surface, touchAction: "none" }}
      >
        <ResponsiveMapViewport bounds={routeBounds} top={viewportInsets?.top ?? 0} bottom={viewportInsets?.bottom ?? 0} />
        <TileLayer
          className={isLofi ? "" : "map-tiles-mono"}
          key={tileUrl}
          url={tileUrl}
          keepBuffer={0}
          updateWhenIdle
          updateWhenZooming={false}
          eventHandlers={{
            loading: () => { if (!initialTilesReady.current) setTilesLoading(true); },
            load: () => { initialTilesReady.current = true; setTilesLoading(false); },
            tileerror: () => {
              initialTilesReady.current = true;
              setTilesLoading(false);
              setTileError(true);
            },
          }}
        />
        <Polyline positions={routeCoords} pathOptions={{ color: isLofi ? "#1A5FB4" : "#62A0EA", weight: 8, opacity: 0.2, lineCap: "round", lineJoin: "round" }} />
        <Polyline positions={routeCoords} pathOptions={{ color: isLofi ? "#1A5FB4" : "#62A0EA", weight: 4, opacity: 0.9, dashArray: "10 10", lineCap: "round", lineJoin: "round" }} />
        <Circle center={vehiclePosition} radius={RADIUS_METERS} pathOptions={{ color: isLofi ? "#071A2E" : "#FFFFFF", fillColor: isLofi ? "#071A2E" : "#FFFFFF", fillOpacity: 0.05, weight: 1.5, opacity: 0.3, dashArray: "8 4" }} />
        <Marker position={vehiclePosition} icon={vehicleIcon}>
          <Popup>
            <div className="chatco-popup">
              <strong>{unitNumber}</strong><p>Your unit</p>
              <p>{markerPresentation(capacity, isOnBreak).label}</p>
            </div>
          </Popup>
        </Marker>
        {visibleHails.map(hail => (
          <Marker key={hail.id} position={[hail.latitude, hail.longitude]} icon={hailingIcon}>
            <Popup>
              <div className="chatco-popup">
                <strong style={{ color: "#FF6D3A" }}>{hail.commuterName}</strong>
                <p>{hail.label || "Passenger waiting"}{hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {(["accept", "reject"] as const).map(action => <button key={action} disabled={!canOperate || hailBusyId !== null} onClick={() => {
                    if (!canOperate || hailBusyId) return;
                    setHailBusyId(hail.id);
                    void Promise.resolve(onHail?.(hail.id, action)).finally(() => setHailBusyId(null));
                  }} style={{ flex: 1, padding: "6px 8px", borderRadius: 8, border: "1px solid #D1D5DB", background: action === "accept" ? "#1A5FB4" : "#FFFFFF", color: action === "accept" ? "#FFFFFF" : "#374151", fontSize: 12, fontWeight: 700 }}>{hailBusyId === hail.id && action === "accept" ? "Updating..." : action === "accept" ? "Accept" : "Reject"}</button>)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {tilesLoading ? <div className="chatco-map-loading"><span></span><strong>Loading route map…</strong></div> : null}
      <style>{`
        .map-tiles-mono{filter:grayscale(1)}
        .chatco-map-shell{position:relative;height:420px;width:100%;overflow:hidden;border-radius:18px;margin-top:14px;border:1px solid ${colors.border};box-shadow:0 7px 18px rgba(0,0,0,.16);background:${colors.background}}
        .chatco-map-shell.chatco-map-fill{position:absolute;inset:0;height:100%;margin:0;border:0;border-radius:0;box-shadow:none}
        .chatco-map-loading{position:absolute;inset:0;z-index:900;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:${colors.muted};background:${colors.background};pointer-events:none;font:12px system-ui}
        .chatco-map-loading span{width:28px;height:28px;border:3px solid ${isLofi ? colors.border : "#163452"};border-top-color:${colors.primaryLight};border-radius:50%;animation:chatco-spin .8s linear infinite}
        .chatco-map-shell .leaflet-container{background:${colors.background}!important;font-family:inherit!important}
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
