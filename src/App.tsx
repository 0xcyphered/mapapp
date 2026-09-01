import { useState, useCallback, useRef, useEffect } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import ControlPanel from './components/ControlPanel';
import type { Waypoint, MapMode, SegmentDistance } from './types';
import { computeSegments } from './utils/distance';
import { toPersianNumber } from './utils/persian';
import { Crosshair, Route, Compass, Trash2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

let waypointCounter = 0;

function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [segments, setSegments] = useState<SegmentDistance[]>([]);
  const [mode, setMode] = useState<MapMode>('explore');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const recalcSegments = useCallback(async (wps: Waypoint[]) => {
    if (wps.length < 2) {
      setSegments([]);
      return;
    }
    const newSegs = await computeSegments(wps);
    setSegments(newSegs);
  }, []);

  const addWaypoint = useCallback(
    (wp: Waypoint) => {
      setWaypoints((prev) => {
        const next = [...prev, wp];
        recalcSegments(next);
        return next;
      });
      setSidebarOpen(true);
    },
    [recalcSegments]
  );

  const removeWaypoint = useCallback(
    (id: string) => {
      setWaypoints((prev) => {
        const next = prev.filter((w) => w.id !== id);
        recalcSegments(next);
        return next;
      });
    },
    [recalcSegments]
  );

  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
    setSegments([]);
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (mode !== 'measure') return;
      waypointCounter++;
      const wp: Waypoint = {
        id: `wp-${Date.now()}-${waypointCounter}`,
        lat,
        lng,
        label: toPersianNumber(waypointCounter), // Persian digit labels: ۱, ۲, ۳...
      };
      addWaypoint(wp);
    },
    [mode, addWaypoint]
  );

  const flyTo = useCallback((lat: number, lng: number, zoom = 15) => {
    mapRef.current?.flyTo([lat, lng], zoom, { duration: 1.5 });
  }, []);

  const handleUserLocation = useCallback(
    (loc: { lat: number; lng: number; accuracy: number }) => {
      setUserLocation(loc);
      setLocationError(null);
    },
    []
  );

  useEffect(() => {
    if (!locationError) return;
    const t = setTimeout(() => setLocationError(null), 4000);
    return () => clearTimeout(t);
  }, [locationError]);

  return (
    <div className="relative w-full h-screen overflow-hidden" dir="rtl">
      {/* Map */}
      <MapView
        mapRef={mapRef}
        waypoints={waypoints}
        segments={segments}
        mode={mode}
        onMapClick={handleMapClick}
        onUserLocation={handleUserLocation}
        onLocationError={setLocationError}
        userLocation={userLocation}
      />

      {/* Search Bar */}
      <SearchBar onSelect={(lat, lng) => {
        flyTo(lat, lng);
        if (mode === 'measure') {
          waypointCounter++;
          addWaypoint({
            id: `wp-${Date.now()}-${waypointCounter}`,
            lat,
            lng,
            label: toPersianNumber(waypointCounter),
          });
        }
      }} />

      {/* Mode Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-2 bg-white rounded-xl shadow-lg p-1">
        <button
          onClick={() => setMode('explore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'explore'
              ? 'bg-blue-500 text-white shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Compass size={16} />
          <span>کاوش نقشه</span>
        </button>
        <button
          onClick={() => setMode('measure')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'measure'
              ? 'bg-blue-500 text-white shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Route size={16} />
          <span>اندازه‌گیری مسیر</span>
        </button>
      </div>

      {/* Location error toast */}
      {locationError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-red-500/90 text-white px-5 py-3 rounded-xl text-sm font-medium backdrop-blur-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {locationError}
        </div>
      )}

      {/* Location FAB */}
      <button
        onClick={() => {
          if (userLocation) {
            flyTo(userLocation.lat, userLocation.lng, 15);
          } else {
            mapRef.current?.locate({ enableHighAccuracy: true, watch: false });
          }
        }}
        className="absolute bottom-6 left-6 z-[1000] bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
        title="موقعیت من"
      >
        <Crosshair size={22} className="text-blue-500" />
      </button>

      {/* Clear All button */}
      {waypoints.length > 0 && (
        <button
          onClick={clearWaypoints}
          className="absolute bottom-6 left-[68px] z-[1000] bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
          title="پاک کردن همه"
        >
          <Trash2 size={22} className="text-red-500" />
        </button>
      )}

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="absolute top-1/2 -translate-y-1/2 z-[1001] bg-white rounded-l-lg shadow-lg p-2 hover:bg-gray-50 transition-colors border border-gray-200 border-r-0"
        style={{ left: sidebarOpen ? '340px' : '0' }}
      >
        {sidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Control Panel Sidebar */}
      <ControlPanel
        open={sidebarOpen}
        waypoints={waypoints}
        segments={segments}
        onRemove={removeWaypoint}
        onClear={clearWaypoints}
        mode={mode}
        userLocation={userLocation}
      />

      {/* Mode hint */}
      {mode === 'measure' && waypoints.length === 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 text-white px-5 py-3 rounded-xl text-sm font-medium backdrop-blur-sm">
          روی نقشه کلیک کنید تا نقطه اضافه شود
        </div>
      )}
    </div>
  );
}

export default App;
