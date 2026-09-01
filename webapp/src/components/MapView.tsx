import { useEffect } from 'react';
import React from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import type { Waypoint, SegmentDistance, MapMode } from '../types';
import { reverseGeocode } from '../utils/geocoding';
import { formatCoordinate } from '../utils/persian';
import { X } from 'lucide-react';

// Fix leaflet default icon issue
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const TEHRAN_CENTER: [number, number] = [35.6892, 51.3890];

interface MapViewProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  mode: MapMode;
  onMapClick: (lat: number, lng: number) => void;
  onUserLocation: (loc: { lat: number; lng: number; accuracy: number }) => void;
  onLocationError: (message: string) => void;
  userLocation: { lat: number; lng: number; accuracy: number } | null;
}

/** Creates a waypoint icon with label */
function createWaypointIcon(label: string, color = '#ef4444') {
  return L.divIcon({
    className: '',
    html: `<div class="waypoint-marker" style="background:${color}">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/** Creates a pulsating blue marker for user location */
function createUserLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="pulse-marker"><div class="ring"></div><div class="dot"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/** Inner component to access the map instance */
function MapEvents({
  onMapClick,
  onUserLocation,
  onLocationError,
  mode,
}: {
  onMapClick: (lat: number, lng: number) => void;
  onUserLocation: (loc: { lat: number; lng: number; accuracy: number }) => void;
  onLocationError: (message: string) => void;
  mode: MapMode;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    locationfound(e) {
      onUserLocation({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        accuracy: e.accuracy,
      });
      map.flyTo(e.latlng, 15, { duration: 1.5 });
    },
    locationerror() {
      onLocationError('خدمات موقعیت‌یابی در دسترس نیست. لطفاً دسترسی GPS را بررسی کنید.');
    },
  });

  // Set cursor style based on mode
  useEffect(() => {
    const container = map.getContainer();
    if (mode === 'measure') {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [map, mode]);

  return null;
}

/** Marker with reverse geocoding popup */
function GeocodedMarker({ waypoint, onRemove }: { waypoint: Waypoint; onRemove: (id: string) => void }) {
  const [address, setAddress] = React.useState<string>(waypoint.address || '');
  const icon = waypoint.isUserLocation
    ? createUserLocationIcon()
    : createWaypointIcon(waypoint.label, '#ef4444');

  useEffect(() => {
    if (!waypoint.address && !waypoint.isUserLocation) {
      reverseGeocode(waypoint.lat, waypoint.lng).then(setAddress).catch(() => {});
    }
  }, [waypoint.lat, waypoint.lng, waypoint.address, waypoint.isUserLocation]);

  return (
    <Marker position={[waypoint.lat, waypoint.lng]} icon={icon}>
      <Popup>
        <div className="min-w-[200px]" style={{ direction: 'rtl', textAlign: 'right' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base">
              {waypoint.isUserLocation ? 'موقعیت شما' : `نقطه ${waypoint.label}`}
            </span>
            {!waypoint.isUserLocation && (
              <button
                onClick={() => onRemove(waypoint.id)}
                className="text-red-400 hover:text-red-600 transition-colors p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {formatCoordinate(waypoint.lat, waypoint.lng)}
          </div>
          {address && (
            <div className="text-sm text-gray-700 border-t pt-2 leading-relaxed max-w-[280px]">
              {address}
            </div>
          )}
          {!address && !waypoint.isUserLocation && (
            <div className="text-xs text-gray-400">در حال دریافت آدرس...</div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({ mapRef, waypoints, segments, mode, onMapClick, onUserLocation, onLocationError, userLocation }: MapViewProps) {
  return (
    <MapContainer
      center={TEHRAN_CENTER}
      zoom={12}
      className="w-full h-full"
      zoomControl={true}
      ref={(ref) => { mapRef.current = ref; }}
      style={{ background: '#e8e4e0' }}
    >
      {/* Tile layers - OSM */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapEvents onMapClick={onMapClick} onUserLocation={onUserLocation} onLocationError={onLocationError} mode={mode} />

      {/* User location marker + accuracy circle */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={createUserLocationIcon()}
        />
      )}
      {userLocation && userLocation.accuracy > 0 && (
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={userLocation.accuracy}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1 }}
        />
      )}

      {/* Waypoint markers */}
      {waypoints.map((wp) => (
        <GeocodedMarker key={wp.id} waypoint={wp} onRemove={() => {}} />
      ))}

      {/* Road-route polylines from OSRM */}
      {segments.length >= 1 && (() => {
        const minRouted = Math.min(...segments.map((s) => s.routed));
        return segments.map((seg, i) => {
          // OSRM returns [lng, lat] but Leaflet expects [lat, lng]
          const coords: [number, number][] = seg.routeGeometry.map(
            ([lng, lat]) => [lat, lng]
          );
          const isShortest = seg.routed === minRouted && segments.length >= 2;
          return (
            <Polyline
              key={`route-${i}`}
              positions={coords}
              color={isShortest ? '#22c55e' : '#3b82f6'}
              weight={isShortest ? 5 : 3}
              opacity={0.85}
            />
          );
        });
      })()}

      {/* Straight-line dashed polylines between consecutive waypoints */}
      {waypoints.length >= 2 &&
        waypoints.map((wp, i) => {
          if (i === 0) return null;
          const prev = waypoints[i - 1];
          return (
            <Polyline
              key={`straight-${i}`}
              positions={[
                [prev.lat, prev.lng],
                [wp.lat, wp.lng],
              ]}
              color="#9ca3af"
              weight={2}
              dashArray="8 6"
              opacity={0.7}
            />
          );
        })}
    </MapContainer>
  );
}
