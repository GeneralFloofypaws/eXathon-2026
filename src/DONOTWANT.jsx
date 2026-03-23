// Rainfall.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Rectangle, useMap } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
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

const RainfallMap = () => {
  const kolkataPosition = [22.5726, 88.3639];
  const [geoData, setGeoData] = useState(null);
  const [gridCells, setGridCells] = useState([]);

  const apiKey = import.meta.env.VITE_WEATHER_API_KEY; 

  useEffect(() => {
    // Load Kolkata boundary as per Mamata.map
    fetch("/westbengal.geojson")
      .then((res) => res.json())
      .then((data) => {
        const kolkataFeature = data.features.find((f) => {
          const name = (f.properties.district || f.properties.DISTRICT || f.properties.name || "").toLowerCase();
          return name.includes("kolkata");
        });
        if (kolkataFeature) setGeoData(kolkataFeature);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!geoData) return;

    const generateGridPoints = (polygon, spacing = 0.005) => {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(polygon);
      const cells = [];

      for (let lat = minLat; lat <= maxLat; lat += spacing) {
        for (let lon = minLng; lon <= maxLng; lon += spacing) {
          const pt = turf.point([lon, lat]);
          if (turf.booleanPointInPolygon(pt, polygon)) {
            cells.push({ center: [lat, lon], rain: null });
          }
        }
      }

      return cells;
    };

    const cells = generateGridPoints(geoData, 0.005); 
    setGridCells(cells);
  }, [geoData]);

  useEffect(() => {
    if (!gridCells.length) return;

    const fetchRainfall = async () => {
      try {
        const results = await Promise.all(
          gridCells.map(async (cell) => {
            const [lat, lon] = cell.center;
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
            );
            const data = await res.json();
            // rainfall in last 1h or 3h, default 0 ... DO NOT WANT DAYS I NEED TO PAY FOR THAT
            const rain = (data.rain?.["1h"] ?? data.rain?.["3h"] ?? 0);
            return { ...cell, rain };
          })
        );
        setGridCells(results);
      } catch (err) {
        console.error("Error fetching rainfall data:", err);
      }
    };

    fetchRainfall();
  }, [gridCells.length, apiKey]);

  const getColor = (rain) => {
    if (rain === 0) return "#d3d3d3";       // grey for no rain
    if (rain > 0 && rain <= 2) return "#add8e6";  // halka blue
    if (rain > 2 && rain <= 5) return "#1e90ff";  // mamata r shaareer paar blue
    if (rain > 5) return "#8b4513";         // brown
    return "#51174b";
  };

  const cellSize = 0.005; // ~500m in lat/lng degrees -> istg if u flip this

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
          style={{ color: "white", weight: 2, fillOpacity: 0.05 }}
        />
      )}

      {gridCells.map((cell, idx) => {
        const [lat, lon] = cell.center;
        return (
          <Rectangle
            key={idx}
            bounds={[
              [lat - cellSize / 2, lon - cellSize / 2],
              [lat + cellSize / 2, lon + cellSize / 2],
            ]}
            pathOptions={{
              color: getColor(cell.rain),
              weight: 0,
              fillOpacity: 0.7,
            }}
          />
        );
      })}
    </MapContainer>
  );
};

export default RainfallMap;

