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
import "leaflet/dist/leaflet.css";
import * as turf from "@turf/turf";
import L from "leaflet";

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

const VegebatelMap = ({ setPage }) => {

  const kolkataPosition = [22.5726, 88.3639];

  const [panelOpen] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showGridBorders, setShowGridBorders] = useState(true);
  const [showVegetation, setShowVegetation] = useState(true);
  const [showZones, setShowZones] = useState(true);

  const [legendOpen, setLegendOpen] = useState(false);
  const [hoveredLevel, setHoveredLevel] = useState(null);

  const [geoData, setGeoData] = useState(null);
  const [vegetationData, setVegetationData] = useState(null);
  const [gridCells, setGridCells] = useState([]);
  const [zonesVeg, setZonesVeg] = useState([]);

  const cellSize = 0.005;

  const zones = [
    { name:"Park Street",center:[22.5544,88.3497],area:1.30e6},
    { name:"Kankurgachi",center:[22.5763,88.3875],area:2.49e6},
    { name:"Alipore",center:[22.53,88.33],area:7.4e6},
    { name:"Shyambazar",center:[22.5982,88.3687],area:1.465e6},
    { name:"College Street",center:[22.5755,88.3634],area:0.63e6},
    { name:"Esplanade",center:[22.5649,88.3517],area:0.83e6},
    { name:"Chowringhee",center:[22.5539,88.3516],area:1.50e6},
    { name:"Bhowanipore",center:[22.5332,88.3459],area:3.59e6},
    { name:"Sealdah",center:[22.5678,88.371],area:0.99e6},
    { name:"Ballygunge",center:[22.529,88.362],area:5.99e6},
    { name:"Tollygunge",center:[22.4986,88.3454],area:5.39e6},
    { name:"Kalighat",center:[22.517,88.3459],area:2.77e6},
    { name:"Jadavpur",center:[22.4955,88.3709],area:2.8e6},
    { name:"Kasba",center:[22.5195,88.3828],area:4.18e6},
    { name:"Metiabruz",center:[22.5455,88.2631],area:4.84e6},
    { name:"Behala",center:[22.5016,88.3209],area:12.54e6},
    { name:"Park Circus",center:[22.5379,88.3682],area:0.75e6},
    { name:"Tangra",center:[22.5563,88.3888],area:7.23e6}
  ];

  useEffect(()=>{
    fetch("/westbengal.geojson")
      .then(r=>r.json())
      .then(data=>{
        const k=data.features.find(f=>{
          const name=(f.properties.district||f.properties.DISTRICT||f.properties.name||"").toLowerCase();
          return name.includes("kolkata");
        });
        if(k) setGeoData(k);
      });
  },[]);

  useEffect(()=>{
    fetch("/kolkata-vegebatels.geojson")
      .then(r=>r.json())
      .then(data=>{
        const polys=data.features.filter(f=>f.geometry.type.toLowerCase()!=="point");
        setVegetationData(polys);
      });
  },[]);

  useEffect(()=>{
    if(!geoData) return;

    const [minLng,minLat,maxLng,maxLat]=turf.bbox(geoData);
    const cells=[];

    for(let lat=minLat;lat<=maxLat;lat+=cellSize){
      for(let lon=minLng;lon<=maxLng;lon+=cellSize){
        const pt=turf.point([lon,lat]);
        if(turf.booleanPointInPolygon(pt,geoData)){
          cells.push({center:[lat,lon],vegDist:null});
        }
      }
    }

    setGridCells(cells);

  },[geoData]);

  useEffect(()=>{

    if(!vegetationData||!gridCells.length) return;

    const results=gridCells.map(cell=>{

      const [lat,lon]=cell.center;

      let vegDist=Infinity;

      vegetationData.forEach(poly=>{
        const center=turf.center(poly).geometry.coordinates;
        const layerLat=center[1];
        const layerLon=center[0];

        const dist=Math.sqrt((lat-layerLat)**2+(lon-layerLon)**2);

        vegDist=Math.min(vegDist,dist);
      });

      return {...cell,vegDist};

    });

    setGridCells(results);

  },[vegetationData,gridCells.length]);

  const sigma=0.003;

  const getColor=(d)=>{

    const t=Math.min(1,d/sigma);

    const dark=[0,100,0];
    const light=[144,238,144];
    const yellow=[255,255,0];

    let r,g,b;

    if(t<0.5){

      const p=t*2;

      r=dark[0]*(1-p)+light[0]*p;
      g=dark[1]*(1-p)+light[1]*p;
      b=dark[2]*(1-p)+light[2]*p;

    }else{

      const p=(t-0.5)*2;

      r=light[0]*(1-p)+yellow[0]*p;
      g=light[1]*(1-p)+yellow[1]*p;
      b=light[2]*(1-p)+yellow[2]*p;

    }

    return `rgb(${r},${g},${b})`;
  };

  const getZoneColor = (level) => {
  if (level === "dense") return "rgb(0,100,0)";
  if (level === "moderate") return "rgb(144,238,144)";
  return "rgb(255,255,0)";
}; 

  const getLevel=(d)=>{
    if(d<sigma*0.33) return "Dense";
    if(d<sigma*0.66) return "Moderate";
    return "Sparse";
  };

useEffect(() => {

  if (!gridCells.length) return;

  const results = zones.map(zone => {

    const radius = Math.sqrt(zone.area / Math.PI);

    let counts = {
      dense: 0,
      moderate: 0,
      sparse: 0
    };

    const cellsInside = gridCells.filter(cell => {
      const d = Math.sqrt(
        (cell.center[0] - zone.center[0]) ** 2 +
        (cell.center[1] - zone.center[1]) ** 2
      );
      return d <= radius;
    });

    if (!cellsInside.length) {
      return { ...zone, level: "Sparse" };
    }

    cellsInside.forEach(cell => {
      const level = getLevel(cell.vegDist).toLowerCase();

      if (level === "dense") counts.dense++;
      else if (level === "moderate") counts.moderate++;
      else counts.sparse++;
    });

    // find majority
    const dominant = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      ...zone,
      level: dominant 
    };

  });

  setZonesVeg(results);

}, [gridCells]);

  const densestZone =
    zonesVeg
      .filter(z=>z.veg!==null)
      .sort((a,b)=>a.veg-b.veg)[0];

  return(

    <div style={{display:"flex",height:"100vh",width:"100vw"}}>

      <div style={{
        width:"160px",
        background:"#111",
        color:"white",
        padding:"15px",
        borderRight:"1px solid #333"
      }}>

        <h2 className="controls-title">Controls</h2>

        <button
  onClick={() => setPage("landing")}
  style={{
    marginBottom:"10px",
    padding:"4px 6px",
    background:"#1a1a1a",
    color:"white",
    border:"1px solid #333",
    borderRadius:"6px",
    cursor:"pointer",
    fontSize:"13px",
    transition:"0.2s"
  }}
  onMouseEnter={e=>e.target.style.background="#333"}
  onMouseLeave={e=>e.target.style.background="#1a1a1a"}
>
  ← Back
</button>

        <button
        style={{
          marginBottom:"10px",
          padding:"4px 6px",
          background:"#1a1a1a",
          color:"white",
          border:"1px solid #333",
          borderRadius:"6px",
          cursor:"pointer",
          fontSize:"13px",
          transition:"0.2s"
        }}
        onMouseEnter={e=>e.target.style.background="#333"}
        onMouseLeave={e=>e.target.style.background="#1a1a1a"}
        onClick={()=>setShowZones(v=>!v)}
        >
        {showZones?"Hide Zones":"Show Zones"}
        </button>

        <button
        style={{
          marginBottom:"10px",
          padding:"4px 6px",
          background:"#1a1a1a",
          color:"white",
          border:"1px solid #333",
          borderRadius:"6px",
          cursor:"pointer",
          fontSize:"13px",
          transition:"0.2s"
        }}
        onMouseEnter={e=>e.target.style.background="#333"}
        onMouseLeave={e=>e.target.style.background="#1a1a1a"}
        onClick={()=>setShowGridBorders(v=>!v)}
        >
        {showGridBorders?"Hide Grid Borders":"Show Grid Borders"}
        </button>

        <button
        style={{
          padding:"4px 6px",
          background:"#1a1a1a",
          color:"white",
          border:"1px solid #333",
          borderRadius:"6px",
          cursor:"pointer",
          fontSize:"13px",
          transition:"0.2s"
        }}
        onMouseEnter={e=>e.target.style.background="#333"}
        onMouseLeave={e=>e.target.style.background="#1a1a1a"}
        onClick={()=>setShowVegetation(v=>!v)}
        >
        {showVegetation?"Hide Vegetation":"Show Vegetation"}
        </button>

        {densestZone && (
          <div style={{marginTop:"15px"}}>
            Densest Vegetation:
            <br/>
            <b>{densestZone.name}</b>
          </div>
        )}

      </div>



      <div style={{flex:1,position:"relative"}}>

        <div
  style={{
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 1000,
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
      cursor: "pointer",
      textAlign: "center",
    }}
  >
    {legendOpen ? "✕ Veg Legend" : "☰ Veg Legend"}
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
      }}
    >
      {[
        { color: "rgb(0,100,0)", label: "dense" },
        { color: "rgb(144,238,144)", label: "moderate" },
        { color: "rgb(255,255,0)", label: "sparse" },
      ].map((item, i) => (
        <div
          key={i}
          onMouseEnter={() => setHoveredLevel(item.label)}
          onMouseLeave={() => setHoveredLevel(null)}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "4px",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              background: item.color,
              marginRight: "6px",
            }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )}
</div>

        <MapContainer center={kolkataPosition} zoom={11} style={{height:"100%",width:"100%"}}>

          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>

          {geoData && <FitBounds geoData={geoData}/>}

          {showBoundary && geoData && (
            <GeoJSON data={geoData} style={{color:"white",weight:2,fillOpacity:0.05}}/>
          )}

          {gridCells.map((cell,i)=>{

  const level = getLevel(cell.vegDist).toLowerCase();
  const highlight = hoveredLevel === level;

  return(
    <Rectangle
      key={i}
      bounds={[
        [cell.center[0]-cellSize/2,cell.center[1]-cellSize/2],
        [cell.center[0]+cellSize/2,cell.center[1]+cellSize/2]
      ]}
      pathOptions={{
        color:showGridBorders?"#111":undefined,
        weight:showGridBorders?1:0,
        fillColor:getColor(cell.vegDist),
        fillOpacity: hoveredLevel
          ? (highlight ? 0.9 : 0.15)
          : 0.65
      }}
    />
  );
})}

         {showZones && zonesVeg.map((zone, i) => {

  const isHighlighted = hoveredLevel === zone.level;

  return (
    <Circle
      key={i}
      center={zone.center}
      radius={Math.sqrt(zone.area / Math.PI)}
      pathOptions={{
        color: isHighlighted ? "#fff" : "#888",
        weight: isHighlighted ? 2 : 1,
        fillColor: getZoneColor(zone.level),
        fillOpacity: hoveredLevel
          ? isHighlighted ? 0.6 : 0.15
          : 0.35
      }}
    >
      <Popup>
        <b>{zone.name}</b>
        <br />
        Area: {(zone.area / 1e6).toFixed(2)} km²
        <br />
        
      </Popup>
    </Circle>
  );
})}

        </MapContainer>

      </div>

    </div>
  );

};

export default VegebatelMap;