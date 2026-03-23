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

const VegebatelMap = () => {

  const kolkataPosition = [22.5726, 88.3639];

  const cellSize = 0.005;
  const sigma = 0.003;

  const [geoData,setGeoData] = useState(null);
  const [vegetationData,setVegetationData] = useState(null);
  const [gridCells,setGridCells] = useState([]);
  const [zonesVeg,setZonesVeg] = useState([]);

  const [showZones,setShowZones] = useState(true);
  const [showGridBorders,setShowGridBorders] = useState(true);

  const [legendOpen,setLegendOpen] = useState(false);
  const [hoveredLevel,setHoveredLevel] = useState(null);

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
          const name=(f.properties.district||f.properties.name||"").toLowerCase();
          return name.includes("kolkata");
        });
        if(k) setGeoData(k);
      });
  },[]);

  useEffect(()=>{
    fetch("/kolkata-vegebatels.geojson")
      .then(r=>r.json())
      .then(data=>{
        const polys=data.features.filter(f=>f.geometry.type!=="Point");
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

    if(!vegetationData || !gridCells.length) return;

    const results=gridCells.map(cell=>{

      const [lat,lon]=cell.center;
      let vegDist=Infinity;

      vegetationData.forEach(poly=>{
        const center=turf.center(poly).geometry.coordinates;

        const d=Math.sqrt(
          (lat-center[1])**2 +
          (lon-center[0])**2
        );

        vegDist=Math.min(vegDist,d);
      });

      return {...cell,vegDist};

    });

    setGridCells(results);

  },[vegetationData]);

  const vegScore = (dist) =>
    Math.exp(-(dist * dist) / (2 * sigma * sigma));

  const getColor = (dist) => {
    const score = vegScore(dist);
    if (score > 0.65) return "rgb(0,100,0)";
    if (score > 0.35) return "rgb(144,238,144)";
    return "rgb(255,255,0)";
  };

  const getLevel = (dist) => {
    const score = vegScore(dist);
    if (score > 0.65) return "dense";
    if (score > 0.35) return "moderate";
    return "sparse";
  };

  useEffect(()=>{

    if(!gridCells.length) return;

    const results = zones.map(zone => {

      const radius = Math.sqrt(zone.area / Math.PI);

      const cellsInside = gridCells.filter(cell=>{
        const d=Math.sqrt(
          (cell.center[0]-zone.center[0])**2+
          (cell.center[1]-zone.center[1])**2
        );
        return d<=radius;
      });

      if(!cellsInside.length)
        return {...zone,veg:null,level:"sparse"};

      const counts={dense:0,moderate:0,sparse:0};
      let total=0;

      cellsInside.forEach(c=>{
        const lvl=getLevel(c.vegDist);
        counts[lvl]++;
        total+=c.vegDist;
      });

      const dominant =
        Object.entries(counts)
        .sort((a,b)=>b[1]-a[1])[0][0];

      return {...zone,veg:total/cellsInside.length,level:dominant};

    });

    setZonesVeg(results);

  },[gridCells]);

  const densestZone =
    zonesVeg
      .filter(z=>z.veg!==null)
      .sort((a,b)=>a.veg-b.veg)[0];

  const btnStyle={
    marginBottom:"10px",
    padding:"4px 6px",
    background:"#1a1a1a",
    color:"white",
    border:"1px solid #333",
    borderRadius:"6px",
    cursor:"pointer",
    fontSize:"13px"
  };

  return(

    <div style={{display:"flex",height:"100vh"}}>

      <div style={{
        width:"170px",
        background:"#111",
        color:"white",
        padding:"15px",
        borderRight:"1px solid #333"
      }}>

        <h3>Controls</h3>

        <button style={btnStyle} onClick={()=>setShowZones(v=>!v)}>
          Toggle Zones
        </button>

        <button style={btnStyle} onClick={()=>setShowGridBorders(v=>!v)}>
          Grid Borders
        </button>

        {densestZone &&
          <div style={{marginTop:"15px"}}>
            Densest vegetation
            <br/>
            <b>{densestZone.name}</b>
          </div>
        }

      </div>

      <div style={{flex:1,position:"relative"}}>

        <div style={{position:"absolute",top:15,right:15,zIndex:1000}}>

          <div
            onClick={()=>setLegendOpen(!legendOpen)}
            style={{
              background:"rgba(17,17,17,0.9)",
              color:"white",
              padding:"6px 10px",
              borderRadius:"6px",
              border:"1px solid #333",
              cursor:"pointer"
            }}>
            {legendOpen ? "✕" : "☰"}
          </div>

          {legendOpen && (
            <div style={{
              marginTop:"6px",
              background:"rgba(17,17,17,0.85)",
              padding:"8px",
              borderRadius:"6px",
              border:"1px solid #333",
              color:"white"
            }}>
              {["dense","moderate","sparse"].map(level=>(
                <div
                  key={level}
                  onMouseEnter={()=>setHoveredLevel(level)}
                  onMouseLeave={()=>setHoveredLevel(null)}
                  style={{display:"flex",alignItems:"center",cursor:"pointer"}}
                >
                  <div style={{
                    width:12,
                    height:12,
                    marginRight:6,
                    background:
                      level==="dense" ? "rgb(0,100,0)" :
                      level==="moderate" ? "rgb(144,238,144)" :
                      "rgb(255,255,0)"
                  }} />
                  {level}
                </div>
              ))}
            </div>
          )}

        </div>

        <MapContainer center={kolkataPosition} zoom={11} style={{height:"100%"}}>

          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>

          {geoData && <FitBounds geoData={geoData}/>}

          {geoData &&
            <GeoJSON
              data={geoData}
              style={{color:"white",weight:2,fillOpacity:0.05}}
            />
          }

          {gridCells.map((cell,i)=>{

            const level=getLevel(cell.vegDist);
            const highlight=hoveredLevel===level;

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
                  fillOpacity:hoveredLevel
                    ? highlight ? 0.9 : 0.15
                    : 0.65
                }}
              />
            );

          })}

          {showZones &&
            zonesVeg.map((zone,i)=>{

              const radius=Math.sqrt(zone.area/Math.PI);

              return(
                <Circle
                  key={i}
                  center={zone.center}
                  radius={radius}
                  pathOptions={{
                    color:"#fff",
                    weight:1,
                    fillColor:getColor(zone.veg),
                    fillOpacity:0.35
                  }}
                >
                  <Popup>
                    <b>{zone.name}</b>
                    <br/>
                    Area: {(zone.area/1e6).toFixed(2)} km²
                    <br/>
                    Density: {zone.level}
                  </Popup>
                </Circle>
              );

            })
          }

        </MapContainer>

      </div>

    </div>

  );

};

export default VegebatelMap;