import { useMap } from "react-leaflet";
import { Polyline } from "react-leaflet";
import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  GeoJSON,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { center } from "@turf/turf";
import { color } from "framer-motion";
import { label } from "framer-motion/client";


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

const KolkataMap = () => {
  const kolkataPosition = [22.5726, 88.3639];
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

  const [geoData, setGeoData] = useState(null);
  const [liveZones, setLiveZones] = useState([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showHeatZones, setShowHeatZones] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoveredLevel, setHoveredLevel] = useState(null);


  const zones = [
    { name: "Park Street", center: [22.5544, 88.3497], area: 1.30 * 1_000_000 },
    { name: "Kankurgachi", center: [22.5763, 88.3875], area: 2.49 * 1_000_000 },
    { name: "Alipore", center: [22.53, 88.33], area: 7.4 * 1_000_000 },
    { name: "Shyambazar", center: [22.5982, 88.3687], area: 1.465 * 1_000_000},
    { name: "College Street", center: [22.5755, 88.3634], area: 0.63 * 1_000_000},
    { name: "Esplanade", center: [22.5649, 88.3517], area: 0.83 * 1_000_000},
    { name: "Chowringhee", center: [22.5539, 88.3516], area: 1.50 * 1_000_000},
    { name: "Bhowanipore", center: [22.5332, 88.3459], area: 3.59 * 1_000_000},
    { name: "Sealdah", center: [22.5678, 88.3710], area: 0.99 * 1_000_000},
    { name: "Ballygunge", center: [22.529, 88.362], area: 5.99 * 1_000_000},
    { name: "Tollygunge", center: [22.4986, 88.3454], area: 5.39 * 1_000_000},
    { name: "Kalighat", center: [22.5170, 88.3459], area: 2.77 * 1_000_000},
    { name: "Jadavpur", center: [22.4955, 88.3709], area: 2.8 * 1_000_000},
    { name: "Kasba", center: [22.5195, 88.3828], area: 4.18 * 1_000_000},
    { name: "Metiabruz", center: [22.5455, 88.2631], area: 4.84 * 1_000_000},
    { name: "Behala", center: [22.5016, 88.3209], area: 12.54 * 1_000_000},
    { name: "Park Circus", center: [22.5379, 88.3682], area: 0.75 * 1_000_000},
    { name: "Tangra", center: [22.5563, 88.3888], area: 7.23 * 1_000_000},
  ];

  const getHeatIndex = (temp, humidity) => (temp + 0.1 * humidity);

  const getColor = (temp, humidity) => {
  if (!temp || !humidity) return "gray";

  const heat = getHeatIndex(temp, humidity);
  const n = normalize(heat);

  if (n > 0.75) return "#8b0000";   // ki rodh ____
  if (n > 0.5) return "red";        // ac chala
  if (n > 0.25) return "orange";    // tao ac chala
  return "yellow";                  // brrr
};

  const getOpacity = (temp, humidity) => {
  if (!temp || !humidity) return 0.3;

  const heat = getHeatIndex(temp, humidity);
  const n = normalize(heat);

  if (n > 0.75) return 0.7;
  if (n > 0.5) return 0.6;
  if (n > 0.25) return 0.5;
  return 0.4;
};

  const FlyToZone = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.panTo(center, { animate: true, duration: 1 });
    }
  }, [center]);

  return null;
};

const getHeatLevel = (temp, humidity) => {
  if (!temp || !humidity) return "loading";

  const heat = getHeatIndex(temp, humidity);
  const n = normalize(heat);

  if (n > 0.75) return "extreme";
  if (n > 0.5) return "high";
  if (n > 0.25) return "moderate";
  return "low";
};

  
  const fetchWeather = async () => {
    try {
      const results = await Promise.all(
        zones
          .filter(zone => Array.isArray(zone.center) && zone.center.length === 2)
          .map(async (zone) => {
            const [lat, lon] = zone.center;
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
            );
            const data = await res.json();
            return {
              ...zone,
              temp: data.main?.temp,
              humidity: data.main?.humidity,
            };
          })
      );
      setLiveZones(results);
    } catch (err) {
      console.error("Error fetching weather data:", err);
    }
  };

  const ResetView = ({ center, zoom, trigger }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [trigger]);

  return null;
};

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 120_000); 
    return () => clearInterval(interval);
  }, []);

  // Load Kolkata boundary from mamata.map
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

  const heatValues = liveZones
  .map(z => getHeatIndex(z.temp, z.humidity))
  .filter(v => v !== undefined && !isNaN(v));

const minHeat = Math.min(...heatValues);
const maxHeat = Math.max(...heatValues);

const normalize = (value) => {
  if (maxHeat === minHeat) return 0.5; 
  return (value - minHeat) / (maxHeat - minHeat);
};

  
  return (
  <div style={{ 
    display: "flex", 
    height: "100vh", 
    width: "100vw", 
    overflow: "hidden"
  }}>

    {/* SIDE PANEL TOUCH AND YOU DIE */}
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
  style={{
    marginBottom: "10px",
    padding: "4px 6px",
    background: "#1a1a1a",
    color: "white",
    border: "1px solid #333",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "0.2s",
  }}
  onMouseEnter={(e) => e.target.style.background = "#333"}
  onMouseLeave={(e) => e.target.style.background = "#1a1a1a"}
  onClick={() => setShowBoundary(prev => !prev)}>
  {showBoundary ? "Hide Borders 🏕️" : "Show Borders 🚪"}



</button>

<br></br>


          <button
  style={{
    
    padding: "4px 6px",
    background: "#1a1a1a",
    color: "white",
    border: "1px solid #333",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "0.2s",
  }}
  onMouseEnter={(e) => e.target.style.background = "#333"}
  onMouseLeave={(e) => e.target.style.background = "#1a1a1a"}
  onClick={() => setShowHeatZones(prev => !prev)}>
  {showHeatZones ? "Hide Heat Zones 🌤️" : "Show Heat Zones 🔥"}



</button>

{selectedZoneIndex !== null && liveZones[selectedZoneIndex] && (
  <div style={{ marginTop: "10px",
    
   }}>
    <h3>Selected Zone</h3>

    <div><b>{liveZones[selectedZoneIndex].name}</b></div>
    <div>🌡️ {liveZones[selectedZoneIndex].temp ?? "..."} °C</div>
    <div>💦 {liveZones[selectedZoneIndex].humidity ?? "..."} %</div>
    <div>🌞 {getHeatLevel(
      liveZones[selectedZoneIndex].temp,
      liveZones[selectedZoneIndex].humidity
    )}</div>
  </div>
)}

<button onClick={() => setSelectedZoneIndex(null)}
  style={{
    marginTop: "10px",
    padding: "4px 6px",
    background: "#1a1a1a",
    color: "white",
    border: "1px solid #333",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "0.2s",
  }}>
  Clear Selection
</button>

{/*<div style={{ marginTop: "20px" }}>
  <label>🔥 Heat Intensity</label>

  <input
    type="range"
    min="0.5"
    max="2"
    step="0.1"
    value={heatMultiplier}
    onChange={(e) => setHeatMultiplier(parseFloat(e.target.value))}
    style={{ width: "100%" }}
  />

  <div style={{ fontSize: "12px", opacity: 0.7 }}>
    Multiplier: {heatMultiplier.toFixed(1)}
  </div>
</div>*/}

          <br /><br />

        </>
      )}
    </div>

    {/* MAMATA */}
   <div style={{ 
  flex: 1, 
  position: "relative",
  height: "100%",
  width: "100%"
}}>

<div
  style={{
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1000,
  }}
>
  {/* Toggle Button */}
  <div
    onClick={() => setLegendOpen(!legendOpen)}
    style={{
      background: "rgba(17,17,17,0.9)",
      color: "white",
      padding: "6px 10px",
      borderRadius: "6px",
      border: "1px solid #333",
      fontSize: "12px",
      cursor: "pointer",
      textAlign: "center",
    }}
  >
    {legendOpen ? "✕ Legend" : "☰ Legend"}
  </div>

  {/* Expandable Panel */}
  {legendOpen && (
    <div
      style={{
        marginTop: "6px",
        background: "rgba(17,17,17,0.85)",
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #333",
        fontSize: "11px",
        width: "110px",
        backdropFilter: "blur(4px)",
        color: "white",
        transition: "all 0.2s ease",
      }}
    >
      {[
        
  { color: "#8b0000", label: "extreme" },
  { color: "red", label: "high" },
  { color: "orange", label: "moderate" },
  { color: "yellow", label: "low" }

       
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

      {/* FLOATING BUTTON */}
      <button
        onClick={() => setPanelOpen(prev => !prev)}
       style={{marginBottom: "10px",
  width: panelOpen ? "160px" : "0px",
  minWidth: panelOpen ? "160px" : "0px",
  flexShrink: 0,
  transition: "all 0.3s ease",
  overflow: "hidden",
  background: "#0d0d0d",
  color: "white",
  padding: panelOpen ? "12px" : "0px",
  borderRight: panelOpen ? "1px solid #222" : "none",
  display: "flex",
  flexDirection: "column",
  gap: "12px"
}}
      >
        {panelOpen ? "←" : "→"}
      </button>

      <MapContainer
        center={kolkataPosition}
        zoom={11}
        
          style={{ 
    height: "100%", 
    width: "100%",
    position: "absolute", 
    top: 0,
    left: 0
  }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap"
        />


        {geoData && <FitBounds geoData={geoData} />}

        {showBoundary && geoData && (
          <GeoJSON
            data={geoData}
            style={{
              color: "white",
              weight: 3,
              fillOpacity: 0.1,
            }}
          />
        )}

        {/* Meowrrker */}
        <Marker position={kolkataPosition}>
          <Popup>Kolkata</Popup>
        </Marker>

        {/* Hot zones hehehehe iykyk */}
        {showHeatZones && liveZones.map((zone, i) => {
  const level = getHeatLevel(zone.temp, zone.humidity);
  const isHighlighted = hoveredLevel === level;

  return (
    <Circle
      key={i}
      center={zone.center}
      radius={Math.sqrt(zone.area / Math.PI)}
      eventHandlers={{
        click: () => setSelectedZoneIndex(i),
      }}
      pathOptions={{
        stroke: isHighlighted,
        color: isHighlighted ? "white" : undefined,
        weight: isHighlighted ? 3 : 0,
        fillColor: getColor(zone.temp, zone.humidity),
        fillOpacity: hoveredLevel
          ? isHighlighted ? 0.9 : 0.15
          : getOpacity(zone.temp, zone.humidity),
      }}
    >
      <Popup>
        <b>{zone.name}</b><br />
        🌡️ {zone.temp ?? "..."} °C<br />
        💦 {zone.humidity ?? "..."} %<br />
        🌞 {level}<br />
        📐 {(zone.area / 1_000_000).toFixed(2)} sq km
      </Popup>
    </Circle>
  );
})}

        {selectedZoneIndex !== null && (
  <FlyToZone center={liveZones[selectedZoneIndex].center} />
)}
      </MapContainer>
    </div> 

  </div> 
);
};
export default KolkataMap;

