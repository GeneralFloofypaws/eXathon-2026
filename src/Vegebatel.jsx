import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";


const FitBounds = ({ geoData }) => {
  const map = useMap();

  useEffect(() => {
    if (geoData) {
      const layer = L.geoJSON(geoData);
      map.fitBounds(layer.getBounds());
    }
  }, [geoData, map]);

  return null;
};

const KolkataMap = () => {
  const kolkataPosition = [22.5726, 88.3639];
  const [geoData, setGeoData] = useState(null);

  // Load Kolkata boundary from mamata map hehe
  useEffect(() => {
    fetch("/westbengal.geojson")
      .then((res) => res.json())
      .then((data) => {
        const kolkataFeature = data.features.find((f) => {
          const name = (
            f.properties.district ||
            f.properties.DISTRICT ||
            f.properties.name ||
            ""
          ).toLowerCase();
          return name.includes("kolkata");
        });
        if (kolkataFeature) setGeoData(kolkataFeature);
      })
      .catch(err => console.error("Error loading geojson:", err));
  }, []);

  return (
    <MapContainer
      center={kolkataPosition}
      zoom={11}
      style={{ height: "100vh", width: "100%" }}
    >
     
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap"
      />

      
      {geoData && <FitBounds geoData={geoData} />}

      
      {geoData && (
        <GeoJSON
          data={geoData}
          style={{
            color: "white",
            weight: 3,
            fillOpacity: 0.1,
          }}
        />
      )}
    </MapContainer>
  );
};

export default KolkataMap;