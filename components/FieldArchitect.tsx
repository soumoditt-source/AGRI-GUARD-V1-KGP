import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Undo2, Ruler, MousePointer2, Crosshair, Info, Wand2, Wifi, Check, Save, FolderOpen, Compass, Settings, X, Plus, Layers } from 'lucide-react';
import { Language, SensorNode, SavedField, UnitSystem } from '../types';
import { TRANSLATIONS } from '../constants';
import L from 'leaflet';

// Fix Leaflet Default Icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Point Type
type Point = { lat: number; lng: number };

const FieldArchitect: React.FC<{ language: Language }> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const healthLayerRef = useRef<L.LayerGroup | null>(null); // New Layer for NDVI
  
  // State
  const [points, setPoints] = useState<Point[]>([]);
  const [tool, setTool] = useState<'polygon' | 'ruler'>('polygon');
  const [area, setArea] = useState<number>(0); // In Sq Meters
  const [perimeter, setPerimeter] = useState<number>(0); // In Meters
  const [rulerDist, setRulerDist] = useState<number | null>(null); // In Meters
  const [showSensors, setShowSensors] = useState(false);
  const [showHealthMap, setShowHealthMap] = useState(false); // Health Map Toggle
  const [sensors, setSensors] = useState<SensorNode[]>([]);
  const [simulating, setSimulating] = useState(false);
  
  // New Features State
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [savedFields, setSavedFields] = useState<SavedField[]>([]);

  // --- Load Saved Fields on Mount ---
  useEffect(() => {
    const saved = localStorage.getItem('agri_saved_fields');
    if (saved) {
      try {
        setSavedFields(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved fields");
      }
    }
  }, []);

  // --- Geometry Utils ---
  const getDistance = (p1: Point, p2: Point) => {
    return L.latLng(p1.lat, p1.lng).distanceTo(L.latLng(p2.lat, p2.lng));
  };

  const getPolygonArea = (pts: Point[]) => {
    if (pts.length < 3) return 0;
    const earthRadius = 6378137;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      const p1 = pts[i];
      const p2 = pts[j];
      area += (p2.lng * Math.PI / 180 - p1.lng * Math.PI / 180) * 
              (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }
    return Math.abs(area * earthRadius * earthRadius / 2.0);
  };

  const isPointInPolygon = (pt: Point, poly: Point[]) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].lat, yi = poly[i].lng;
        const xj = poly[j].lat, yj = poly[j].lng;
        const intersect = ((yi > pt.lng) !== (yj > pt.lng)) &&
            (pt.lat < (xj - xi) * (pt.lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  };

  // --- Formatting Utils ---
  const formatArea = (sqMeters: number) => {
    if (unitSystem === 'metric') {
      const ha = sqMeters / 10000;
      return `${ha.toFixed(2)} Ha`;
    } else {
      const acres = sqMeters * 0.000247105;
      return `${acres.toFixed(2)} Acres`;
    }
  };

  const formatDistance = (meters: number) => {
    if (unitSystem === 'metric') {
      if (meters > 1000) return `${(meters / 1000).toFixed(2)} km`;
      return `${meters.toFixed(0)} m`;
    } else {
      const feet = meters * 3.28084;
      if (feet > 5280) return `${(feet / 5280).toFixed(2)} mi`;
      return `${feet.toFixed(0)} ft`;
    }
  };

  // --- Map Initialization ---
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
      preferCanvas: true
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Esri'
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    const healthGroup = L.layerGroup().addTo(map);
    
    layerGroupRef.current = layerGroup;
    healthLayerRef.current = healthGroup;
    mapRef.current = map;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        if (mapRef.current) {
          mapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 18, { duration: 2 });
        }
      });
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const newPoint: Point = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPoints(prev => [...prev, newPoint]);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
        healthLayerRef.current = null;
      }
    };
  }, []);

  // --- Drawing Logic ---
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // 1. Draw Vertices
    points.forEach((p) => {
       L.circleMarker([p.lat, p.lng], {
         radius: 5,
         fillColor: tool === 'polygon' ? '#10B981' : '#F59E0B',
         color: '#fff',
         weight: 2,
         opacity: 1,
         fillOpacity: 1
       }).addTo(layerGroup);
    });

    // 2. Draw Shapes
    if (points.length > 0) {
       const latLngs = points.map(p => [p.lat, p.lng] as [number, number]);

       if (tool === 'polygon') {
         if (points.length > 1) {
            L.polygon(latLngs, {
               color: '#10B981',
               weight: 3,
               fillColor: '#10B981',
               fillOpacity: 0.2
            }).addTo(layerGroup);
            
            // Stats
            if (points.length > 2) {
               setArea(getPolygonArea(points));
               let p = 0;
               for(let i=0; i<points.length; i++) {
                 p += getDistance(points[i], points[(i+1)%points.length]);
               }
               setPerimeter(p);
            }
         } else if (points.length === 1 && area > 0) {
             setArea(0); setPerimeter(0);
         }
       } else {
         // Ruler - Distinct Style
         if (points.length > 1) {
            L.polyline(latLngs, {
               color: '#F59E0B',
               weight: 4,
               dashArray: '15, 10',
               lineCap: 'round'
            }).addTo(layerGroup);
            
            let d = 0;
            for(let i=0; i<points.length-1; i++) d += getDistance(points[i], points[i+1]);
            setRulerDist(d);
         }
       }
    }

    // 3. Draw Advanced Sensors
    if (showSensors) {
       sensors.forEach(s => {
          // Color Logic
          let colorClass = '#22c55e'; // Green
          if (s.value < 40) colorClass = '#ef4444'; // Red
          else if (s.value < 70) colorClass = '#eab308'; // Yellow
          
          const iconHtml = `
            <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${colorClass}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 12px; height: 12px; background-color: ${colorClass}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
              <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; white-space: nowrap;">
                 ${Math.round(s.value)}%
              </div>
            </div>
            <style>
              @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
            </style>
          `;

          const customIcon = L.divIcon({
            className: 'custom-sensor-icon',
            html: iconHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          L.marker([s.lat, s.lng], { icon: customIcon }).addTo(layerGroup);
       });
    }

  }, [points, tool, sensors, showSensors, unitSystem]);

  // --- Health Map / NDVI Logic ---
  useEffect(() => {
    if (!healthLayerRef.current) return;
    healthLayerRef.current.clearLayers();

    if (showHealthMap && points.length >= 3) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      const latMin = bounds.getSouth();
      const latMax = bounds.getNorth();
      const lngMin = bounds.getWest();
      const lngMax = bounds.getEast();

      // Create a grid of colored rectangles
      const steps = 8;
      const latStep = (latMax - latMin) / steps;
      const lngStep = (lngMax - lngMin) / steps;

      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < steps; j++) {
          const cellLat = latMin + i * latStep;
          const cellLng = lngMin + j * lngStep;
          const cellCenter = { lat: cellLat + latStep/2, lng: cellLng + lngStep/2 };

          // Only draw if center is inside polygon
          if (isPointInPolygon(cellCenter, points)) {
            // Simulate NDVI Data (Mock logic for prototype)
            // Use noise or random to create clusters
            const noise = Math.sin(i * 0.5) * Math.cos(j * 0.5);
            let color = '#22c55e'; // Green (Healthy)
            let opacity = 0.4;
            
            if (noise < -0.3) { color = '#ef4444'; opacity = 0.6; } // Red (Stressed)
            else if (noise < 0.2) { color = '#eab308'; opacity = 0.5; } // Yellow (Warning)

            L.rectangle([[cellLat, cellLng], [cellLat + latStep, cellLng + lngStep]], {
              color: 'transparent',
              fillColor: color,
              fillOpacity: opacity
            }).addTo(healthLayerRef.current);
          }
        }
      }
    }
  }, [showHealthMap, points]);

  // --- Actions ---
  
  const saveField = () => {
    if (points.length < 3) return;
    if (!fieldName.trim()) {
      alert("Please enter a field name");
      return;
    }
    const newField: SavedField = {
      id: Date.now().toString(),
      name: fieldName,
      points: points,
      area: area,
      date: Date.now()
    };
    const updated = [newField, ...savedFields];
    setSavedFields(updated);
    localStorage.setItem('agri_saved_fields', JSON.stringify(updated));
    setShowSaveModal(false);
    setFieldName('');
  };

  const loadField = (field: SavedField) => {
    setTool('polygon');
    setPoints(field.points);
    setArea(field.area);
    
    // Recalc perimeter
    let p = 0;
    for(let i=0; i<field.points.length; i++) {
      const p1 = field.points[i];
      const p2 = field.points[(i+1)%field.points.length];
      p += L.latLng(p1.lat, p1.lng).distanceTo(L.latLng(p2.lat, p2.lng));
    }
    setPerimeter(p);
    setShowLoadModal(false);
    
    // Fly to field
    if (mapRef.current && field.points.length > 0) {
      const bounds = L.latLngBounds(field.points.map(p => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const deleteField = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedFields.filter(f => f.id !== id);
    setSavedFields(updated);
    localStorage.setItem('agri_saved_fields', JSON.stringify(updated));
  };

  const magicWand = () => {
    if (!mapRef.current) return;
    setSimulating(true);
    setTool('polygon');
    
    setTimeout(() => {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      const r = 0.001; 
      const newPts: Point[] = [];
      for (let i = 0; i < 6; i++) {
          const angle_deg = 60 * i - 10 + Math.random() * 20;
          const angle_rad = Math.PI / 180 * angle_deg;
          const dist = r * (0.8 + Math.random() * 0.4);
          newPts.push({
            lat: center.lat + dist * Math.cos(angle_rad),
            lng: center.lng + dist * Math.sin(angle_rad) * 1.5
          });
      }
      setPoints(newPts);
      setSimulating(false);
    }, 1500);
  };

  const deployIoT = () => {
    if (points.length < 3) return;
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    const newSensors: SensorNode[] = [];
    let attempts = 0;
    while(newSensors.length < 8 && attempts < 100) {
       attempts++;
       const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
       const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
       const pt: Point = { lat, lng };
       
       if (isPointInPolygon(pt, points)) {
          newSensors.push({
             id: `IOT-${newSensors.length+1}`,
             lat, lng,
             type: 'moisture',
             value: Math.random() * 100, // Random 0-100 for color demo
             battery: 100,
             lastUpdate: Date.now(),
             status: 'active'
          });
       }
    }
    setSensors(newSensors);
    setShowSensors(true);
  };

  const undo = () => setPoints(p => p.slice(0, -1));
  const clear = () => { setPoints([]); setArea(0); setPerimeter(0); setRulerDist(null); setShowSensors(false); setSensors([]); setShowHealthMap(false); };

  return (
    <div className="h-full bg-gray-900 relative font-sans">
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />
      
      {/* Simulation Overlay */}
      {simulating && (
        <div className="absolute inset-0 z-50 bg-black/40 flex flex-col items-center justify-center backdrop-blur-sm">
           <Wand2 className="w-16 h-16 text-purple-400 animate-pulse mb-4" />
           <p className="text-white text-lg font-bold">AI Scanning Field Boundaries...</p>
        </div>
      )}

      {/* COMPASS OVERLAY */}
      <div className="absolute top-6 right-6 z-[400] bg-black/40 backdrop-blur-sm p-2 rounded-full border border-white/10 pointer-events-none">
        <div className="relative w-12 h-12 flex items-center justify-center">
           <Compass className="w-10 h-10 text-white opacity-80" />
           <span className="absolute top-0 font-bold text-[10px] text-red-500">N</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
         <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl shadow-xl flex flex-col gap-2">
            <button 
              onClick={() => { setTool('polygon'); setPoints([]); }}
              className={`p-3 rounded-lg flex items-center gap-3 transition-all ${tool === 'polygon' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-200 hover:bg-white/10'}`}
            >
              <MousePointer2 size={20} /> <span className="text-xs font-bold hidden md:block">Area</span>
            </button>
            <button 
              onClick={() => { setTool('ruler'); setPoints([]); }}
              className={`p-3 rounded-lg flex items-center gap-3 transition-all ${tool === 'ruler' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-200 hover:bg-white/10'}`}
            >
              <Ruler size={20} /> <span className="text-xs font-bold hidden md:block">Ruler</span>
            </button>
            <div className="h-px bg-white/20 my-1"></div>
            <button onClick={magicWand} className="p-3 rounded-lg flex items-center gap-3 text-purple-300 hover:bg-purple-500/20 transition-all">
              <Wand2 size={20} /> <span className="text-xs font-bold hidden md:block">Auto</span>
            </button>
            <div className="h-px bg-white/20 my-1"></div>
            <button onClick={() => setShowSaveModal(true)} disabled={points.length < 3 || tool !== 'polygon'} className="p-3 rounded-lg flex items-center gap-3 text-blue-300 hover:bg-blue-500/20 transition-all disabled:opacity-30">
               <Save size={20} /> <span className="text-xs font-bold hidden md:block">Save</span>
            </button>
            <button onClick={() => setShowLoadModal(true)} className="p-3 rounded-lg flex items-center gap-3 text-yellow-300 hover:bg-yellow-500/20 transition-all">
               <FolderOpen size={20} /> <span className="text-xs font-bold hidden md:block">Load</span>
            </button>
         </div>

         {/* Context Action Button */}
         {tool === 'polygon' && area > 0 && (
           <div className="flex flex-col gap-2 animate-slide-up">
              <button 
               onClick={deployIoT}
               className="bg-emerald-600 text-white p-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-xs hover:bg-emerald-700 active:scale-95 transition-all"
             >
               {showSensors ? <><Check size={16}/> Grid Active</> : <><Wifi size={16}/> Deploy Grid</>}
             </button>
             <button 
               onClick={() => setShowHealthMap(!showHealthMap)}
               className={`p-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-xs active:scale-95 transition-all ${showHealthMap ? 'bg-orange-500 text-white' : 'bg-white/90 text-gray-800'}`}
             >
               <Layers size={16}/> {showHealthMap ? 'Hide Health' : 'Health Map'}
             </button>
           </div>
         )}
      </div>

      {/* Unit Toggle */}
      <div className="absolute bottom-32 right-4 z-[400]">
         <button 
           onClick={() => setUnitSystem(prev => prev === 'metric' ? 'imperial' : 'metric')}
           className="bg-black/60 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/20 hover:bg-black/80 flex items-center gap-2"
         >
           <Settings size={12} /> {unitSystem === 'metric' ? 'Metric' : 'Imperial'}
         </button>
      </div>

      {/* Stats Panel */}
      <div className="absolute bottom-8 right-4 z-[400] w-64 pointer-events-none">
         <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto">
            <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
               <Crosshair size={10} /> Measurements
            </h4>
            
            {tool === 'polygon' ? (
              <div className="space-y-1">
                 <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-bold text-white tracking-tight">{formatArea(area)}</span>
                 </div>
                 <div className="text-xs text-gray-500 font-mono">
                    {unitSystem === 'metric' 
                      ? `${(area / 10000).toFixed(2)} Ha • ${perimeter.toFixed(0)}m` 
                      : `${(area * 10.764).toFixed(0)} sqft • ${(perimeter * 3.28).toFixed(0)}ft`}
                 </div>
              </div>
            ) : (
              <div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-bold text-amber-500 tracking-tight">
                     {rulerDist ? formatDistance(rulerDist) : '0'}
                   </span>
                 </div>
                 <p className="text-[10px] text-gray-500 mt-1">Distance between points</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-4">
               <button onClick={undo} className="bg-white/10 hover:bg-white/20 py-2 rounded-lg text-white text-xs font-bold flex justify-center items-center gap-1 transition-colors">
                  <Undo2 size={14} /> Undo
               </button>
               <button onClick={clear} className="bg-red-500/20 hover:bg-red-500/30 text-red-200 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 transition-colors">
                  <Trash2 size={14} /> Clear
               </button>
            </div>
         </div>
      </div>
      
      {/* Save Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 z-[500] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-up">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Save Field Boundary</h3>
               <button onClick={() => setShowSaveModal(false)}><X size={20} className="text-gray-400" /></button>
             </div>
             <input 
               autoFocus
               type="text" 
               placeholder="Enter field name (e.g., North Wheat Field)" 
               className="w-full p-3 bg-gray-50 border rounded-xl mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
               value={fieldName}
               onChange={e => setFieldName(e.target.value)}
             />
             <button onClick={saveField} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700">
               Save Field
             </button>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="absolute inset-0 z-[500] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-up max-h-[80vh] flex flex-col">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Load Field</h3>
               <button onClick={() => setShowLoadModal(false)}><X size={20} className="text-gray-400" /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-2 pr-2">
               {savedFields.length === 0 ? (
                 <p className="text-center text-gray-400 py-8 text-sm">No saved fields found.</p>
               ) : (
                 savedFields.map(field => (
                   <div key={field.id} onClick={() => loadField(field)} className="p-3 border rounded-xl hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer transition-all group flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{field.name}</p>
                        <p className="text-xs text-gray-500">{new Date(field.date).toLocaleDateString()} • {formatArea(field.area)}</p>
                      </div>
                      <button onClick={(e) => deleteField(field.id, e)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 size={16} />
                      </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-[400]">
         <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-gray-300 flex items-center gap-2 shadow-lg">
            <Info size={10} className="text-emerald-400" />
            {tool === 'polygon' ? 'Tap to draw boundaries • Close shape to finish' : 'Tap to measure distance (Polyline)'}
         </div>
      </div>
    </div>
  );
};

export default FieldArchitect;