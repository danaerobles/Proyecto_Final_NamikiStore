// frontend/src/components/MapGoogle.jsx
import React, { useMemo } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

export default function MapGoogle({ center = { lat: -33.45, lng: -70.66 }, zoom = 12, locations = [], routes = [] }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey
  });

  const containerStyle = { width: "100%", height: "100%" };

  // Convert route.path (array of {lat,lng}) to google LatLng literal
  const convertPath = (path) => path.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));

  if (!isLoaded) return <div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>Cargando mapa...</div>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={zoom}>
      {locations.map((loc, i) => (
        <Marker key={i} position={{ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) }} />
      ))}

      {routes.map((route, idx) => {
        const path = convertPath(route.path || []);
        return (
          <Polyline
            key={idx}
            path={path}
            options={{
              strokeColor: "#1976d2",
              strokeOpacity: 0.8,
              strokeWeight: 4
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
