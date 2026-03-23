import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Rectangle,
  Circle,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { color } from "framer-motion";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const FitBounds = ({ geoData }) => {
  const map = useMap();

  useEffect(() => {
    if (geoData) {
      const layer = L.geoJSON(geoData);
      map.fitBounds(layer.getBounds());
    }
  }, [geoData]);

  return null;
};

const RainfallMap = ({ setPage }) => {

  const kolkataPosition = [22.5726, 88.3639];
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

  const [geoData, setGeoData] = useState(null);
  const [gridCells, setGridCells] = useState([]);
  const [zonesRain, setZonesRain] = useState([]);

  const [panelOpen, setPanelOpen] = useState(true);
  const [showZoneCircles, setShowZoneCircles] = useState(true);
  const [showGridBorders, setShowGridBorders] = useState(true);

  const [legendOpen, setLegendOpen] = useState(false);
  const [hoveredLevel, setHoveredLevel] = useState(null);

  const cellSize = 0.005;

  const zones = [
    { name: "Park Street", center: [22.5544, 88.3497], area: 1.30 * 1_000_000 },
    { name: "Kankurgachi", center: [22.5763, 88.3875], area: 2.49 * 1_000_000 },
    { name: "Alipore", center: [22.53, 88.33], area: 7.4 * 1_000_000 },
    { name: "Shyambazar", center: [22.5982, 88.3687], area: 1.465 * 1_000_000 },
    { name: "College Street", center: [22.5755, 88.3634], area: 0.63 * 1_000_000 },
    { name: "Esplanade", center: [22.5649, 88.3517], area: 0.83 * 1_000_000 },
    { name: "Chowringhee", center: [22.5539, 88.3516], area: 1.50 * 1_000_000 },
    { name: "Bhowanipore", center: [22.5332, 88.3459], area: 3.59 * 1_000_000 },
    { name: "Sealdah", center: [22.5678, 88.3710], area: 0.99 * 1_000_000 },
    { name: "Ballygunge", center: [22.529, 88.362], area: 5.99 * 1_000_000 },
    { name: "Tollygunge", center: [22.4986, 88.3454], area: 5.39 * 1_000_000 },
    { name: "Kalighat", center: [22.5170, 88.3459], area: 2.77 * 1_000_000 },
    { name: "Jadavpur", center: [22.4955, 88.3709], area: 2.8 * 1_000_000 },
    { name: "Kasba", center: [22.5195, 88.3828], area: 4.18 * 1_000_000 },
    { name: "Metiabruz", center: [22.5455, 88.2631], area: 4.84 * 1_000_000 },
    { name: "Behala", center: [22.5016, 88.3209], area: 12.54 * 1_000_000 },
    { name: "Park Circus", center: [22.5379, 88.3682], area: 0.75 * 1_000_000 },
    { name: "Tangra", center: [22.5563, 88.3888], area: 7.23 * 1_000_000 },
  ];

  const getRainColor = (rain) => {
    if (rain === 0) return "#d3d3d3";
    if (rain <= 2) return "#add8e6";
    if (rain <= 5) return "#1e90ff";
    return "#8b4513";
  };

  const getRainLevel = (rain) => {
    if (rain === 0) return "none";
    if (rain <= 2) return "light";
    if (rain <= 5) return "moderate";
    return "heavy";
  };

  useEffect(() => {
    fetch("/westbengal.geojson")
      .then(res => res.json())
      .then(data => {
        const kolkataFeature = data.features.find(f => {
          const name = (
            f.properties.district ||
            f.properties.DISTRICT ||
            f.properties.name ||
            ""
          ).toLowerCase();

          return name.includes("kolkata");
        });

        if (kolkataFeature) setGeoData(kolkataFeature);
      });
  }, []);

  useEffect(() => {

    if (!geoData) return;

    const [minLng, minLat, maxLng, maxLat] = turf.bbox(geoData);
    const cells = [];

    for (let lat = minLat; lat <= maxLat; lat += cellSize) {

      for (let lon = minLng; lon <= maxLng; lon += cellSize) {

        const pt = turf.point([lon, lat]);

        if (turf.booleanPointInPolygon(pt, geoData)) {
          cells.push({ center: [lat, lon], rain: null });
        }

      }

    }

    setGridCells(cells);

  }, [geoData]);

  useEffect(() => {

    if (!gridCells.length) return;

    const fetchRainfall = async () => {

      const results = [];

      for (let i = 0; i < gridCells.length; i++) {

        const [lat, lon] = gridCells[i].center;

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );

        const data = await res.json();

        const rain =
          data.rain?.["1h"] ??
          data.rain?.["3h"] ??
          0;

        results.push({
          ...gridCells[i],
          rain
        });

        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 120));
        }

      }

      setGridCells(results);

    };

    fetchRainfall();

  }, [gridCells.length]);

  const computeZoneRain = (zone) => {

    const radius = Math.sqrt(zone.area / Math.PI);

    const cells = gridCells.filter(cell => {

      const dist = turf.distance(
        turf.point([cell.center[1], cell.center[0]]),
        turf.point([zone.center[1], zone.center[0]]),
        { units: "meters" }
      );

      return dist <= radius;

    });

    if (!cells.length) return 0;

    const avg =
      cells.reduce((sum, c) => sum + (c.rain ?? 0), 0) /
      cells.length;

    return avg;
  };

  useEffect(() => {

    if (!gridCells.length) return;

    const computed = zones.map(z => {

      const rain = computeZoneRain(z);

      return {
        ...z,
        rain
      };

    });

    setZonesRain(computed);

  }, [gridCells]);

  const rainValues = gridCells.map(c => c.rain ?? 0);

  const minRain = Math.min(...rainValues);
  const maxRain = Math.max(...rainValues);

  return (

    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>

      <div
        style={{
          width: panelOpen ? "160px" : "0px",
          transition: "0.3s",
          overflow: "hidden",
          background: "#111",
          color: "white",
          padding: panelOpen ? "15px" : "0px",
          borderRight: panelOpen ? "1px solid #333" : "none"
        }}
      >

        {panelOpen && (

          <>
            <h2 class="controls-title">Controls</h2>

            <button
  onClick={() => setPage("landing")}
  style={{
    marginBottom: "10px",
    padding: "4px 6px",
    background: "#1a1a1a",
    color: "white",
    border: "1px solid #333",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px"
  }}
>
  ← Back
</button>

            <button
              style={{
                marginBottom: "10px",
                padding: "4px 6px",
                background: "#1a1a1a",
                color: "white",
                border: "1px solid #333",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px"
              }}
              onClick={() => setShowZoneCircles(prev => !prev)}
            >
              {showZoneCircles ? "Hide Localities 🌧️" : "Show Localities ☔"}
            </button>

            <button
              style={{
                padding: "4px 6px",
                background: "#1a1a1a",
                color: "white",
                border: "1px solid #333",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px"
              }}
              onClick={() => setShowGridBorders(prev => !prev)}
            >
              {showGridBorders ? "Hide Grid Borders 🧩" : "Show Grid Borders 🧱"}
            </button>

            <div style={{ marginTop: "15px" }}>
              Min Rainfall: {minRain.toFixed(1)} mm
              <br />
              Max Rainfall: {maxRain.toFixed(1)} mm
            </div>

          </>

        )}

      </div>

      <div style={{ flex: 1, position: "relative" }}>

        <div
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            zIndex: 1000
          }}
        >

          <div
            onClick={() => setLegendOpen(!legendOpen)}
            style={{
              background: "rgba(17,17,17,0.9)",
              color: "white",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #333",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            {legendOpen ? "✕ Legend" : "☰ Legend"}
          </div>

          {legendOpen && (

            <div
              style={{
                marginTop: "6px",
                background: "rgba(17,17,17,0.85)",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #333",
                fontSize: "11px",
                width: "120px",
                backdropFilter: "blur(4px)",
                color: "white"
              }}
            >

              {[
                { color: "#d3d3d3", label: "none" },
                { color: "#add8e6", label: "light" },
                { color: "#1e90ff", label: "moderate" },
                { color: "#8b4513", label: "heavy" }
              ].map((item, i) => (

                <div
                  key={i}
                  onMouseEnter={() => setHoveredLevel(item.label)}
                  onMouseLeave={() => setHoveredLevel(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "4px",
                    cursor: "pointer"
                  }}
                >

                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      background: item.color,
                      marginRight: "6px",
                      borderRadius: "2px"
                    }}
                  />

                  <span>{item.label}</span>

                </div>

              ))}

            </div>

          )}

        </div>

        <MapContainer
          center={kolkataPosition}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
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
                weight: 2,
                fillOpacity: 0.05
              }}
            />
          )}

          {gridCells.map((cell, i) => {

            const level = getRainLevel(cell.rain);
            const isHighlighted = hoveredLevel === level;

            return (

              <Rectangle
                key={i}
                bounds={[
                  [cell.center[0] - cellSize / 2, cell.center[1] - cellSize / 2],
                  [cell.center[0] + cellSize / 2, cell.center[1] + cellSize / 2]
                ]}
                pathOptions={{
                  color: showGridBorders ? "#111" : undefined,
                  weight: showGridBorders ? 1 : 0,
                  fillColor: getRainColor(cell.rain),
                  fillOpacity: hoveredLevel
                    ? isHighlighted ? 0.9 : 0.15
                    : 0.6
                }}
              >
                <Popup>
                  Rainfall: {cell.rain?.toFixed(1) ?? "..."} mm
                </Popup>
              </Rectangle>

            );

          })}

          {showZoneCircles && zonesRain.map((zone, i) => {

            const level = getRainLevel(zone.rain);
            const isHighlighted = hoveredLevel === level;

            return (

              <Circle
                key={i}
                center={zone.center}
                radius={Math.sqrt(zone.area / Math.PI)}
                pathOptions={{
                  stroke: isHighlighted,
                  color: isHighlighted ? "white" : "#fff",
                  weight: isHighlighted ? 3 : 1,
                  fillColor: getRainColor(zone.rain),
                  fillOpacity: hoveredLevel
                    ? isHighlighted ? 0.9 : 0.15
                    : 0.35
                }}
              >
                <Popup>
                  <b>{zone.name}</b><br />
                  🌧️ {zone.rain?.toFixed(1)} mm<br />
                  📐 {(zone.area / 1_000_000).toFixed(2)} sq km
                </Popup>
              </Circle>

            );

          })}

        </MapContainer>

      </div>

    </div>

  );

};

export default RainfallMap;