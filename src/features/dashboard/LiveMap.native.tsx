import MapView, { Circle, Marker } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import type { HailRequest } from "../../core/domain/types";

export function LiveMap({ latitude, longitude, hails, fill = false }: {
  latitude?: number; longitude?: number; hails: HailRequest[]; fill?: boolean;
}) {
  const lat = latitude ?? 14.8255;
  const lng = longitude ?? 120.8650;
  return (
    <View style={[local.frame, fill && local.fill]}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={{ latitude: lat, longitude: lng, latitudeDelta: .12, longitudeDelta: .12 }}
        showsUserLocation={latitude !== undefined && longitude !== undefined}
        showsMyLocationButton
      >
        <Circle center={{ latitude: lat, longitude: lng }} radius={1000} fillColor="rgba(26,95,180,.12)" strokeColor="#1A5FB4" />
        <Marker coordinate={{ latitude: lat, longitude: lng }} title="Your unit" pinColor="#1A5FB4" />
        {hails.map(h => <Marker key={h.id} coordinate={{ latitude: h.latitude, longitude: h.longitude }} title={h.commuterName} description="Pickup request" pinColor="#F59E0B" />)}
      </MapView>
    </View>
  );
}
const local = StyleSheet.create({
  frame: { height: 300, borderRadius: 18, overflow: "hidden", marginTop: 14 },
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, height: undefined, borderRadius: 0, marginTop: 0 },
});
