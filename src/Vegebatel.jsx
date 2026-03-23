import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Rectangle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";

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

const VegebatelMap = () => {
  const kolkataPosition = [22.5726, 88.3639];
  const [geoData, setGeoData] = useState(null);
  const [vegebatelData, setVegebatelData] = useState(null);
  const [gridCells, setGridCells] = useState([]);

  // Load Kolkata boundary from mamata map hehe
  useEffect(() => {
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

  // Load the fr00tzies and the vegebatels
  useEffect(() => {
    fetch("/kolkata-vegebatels.geojson")
      .then((res) => res.json())
      .then((data) => {
        const niraamishFeature = data.features.filter((f) => {
          return f.geometry.type.toLowerCase() !== "point";
        });
        if (niraamishFeature) setVegebatelData(niraamishFeature);
      })
      .catch(err => console.error("Error loading geojson:", err));
  }, []);

  const cellSize = 0.005; // ~500m in lat/lng degrees -> istg if u flip this

  // All the turds- oops i mean turfs
  useEffect(() => {
    if (!geoData) return;

    const generateGridPoints = (polygon, spacing = cellSize) => {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(polygon);
      const cells = [];

      for (let lat = minLat; lat <= maxLat; lat += spacing) {
        for (let lon = minLng; lon <= maxLng; lon += spacing) {
          const pt = turf.point([lon, lat]);
          if (turf.booleanPointInPolygon(pt, polygon)) {
            cells.push({ center: [lat, lon], vegebatel: null });
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

    try {
      const results = gridCells.map(cell => {
        const [lat, lon] = cell.center;
        var vegebatel = Infinity; // Minimum distance 

        L.geoJSON(vegebatelData).eachLayer(poly => {
          const layerCenter = poly.getBounds().getCenter();
          const layerLat = layerCenter.lat
          const layerLon = layerCenter.lng;
          const dist = Math.sqrt((lat - layerLat) ** 2 + (lon - layerLon) ** 2);

          vegebatel = Math.min(dist, vegebatel);
        });

        return { ...cell, vegebatel };
      });
      setGridCells(results);
    } catch (err) {
      console.error("Error calculating vegetation mapping:", err);
    }
  }, [vegebatelData, gridCells.length]);

  const getColor = (vegebatel) => {
    const sigma = 0.003; // some random ahh parameter :nerd:
    const lerpVal = Math.min(1, vegebatel / sigma);
    // console.log(vegebatel);
    const color0 = [255, 255, 0];
    const color1 = [0, 255, 0];
    const colorLerp = [
      color0[0] * lerpVal + color1[0] * (1 - lerpVal),
      color0[1] * lerpVal + color1[1] * (1 - lerpVal),
      color0[2] * lerpVal + color1[2] * (1 - lerpVal),
    ];
    return `rgb(${colorLerp[0]}, ${colorLerp[1]}, ${colorLerp[2]})`;
  };

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
      {vegebatelData && <FitBounds geoData={vegebatelData} />}
      
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
      {vegebatelData && (
        <GeoJSON
          data={vegebatelData}
          style={{
            color: "green",
            weight: 3,
            fillOpacity: 0.1,
          }}
        />
      )}
      {gridCells.length && gridCells.map((cell, idx) => {
        const [lat, lon] = cell.center;
        return (
          <Rectangle
            key={idx}
            bounds={[
              [lat - cellSize / 2, lon - cellSize / 2],
              [lat + cellSize / 2, lon + cellSize / 2],
            ]}
            pathOptions={{
              color: getColor(cell.vegebatel),
              weight: 0,
              fillOpacity: 0.7,
            }}
          />
        );
      })}
    </MapContainer>
  );
};

export default VegebatelMap;
