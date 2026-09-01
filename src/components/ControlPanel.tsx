import { MapPin, Trash2, Ruler, ArrowLeftRight, Navigation } from 'lucide-react';
import type { Waypoint, SegmentDistance, MapMode } from '../types';
import { formatDistance, toPersianNumber, formatCoordinate } from '../utils/persian';
import { totalRoutedDistance } from '../utils/distance';

interface ControlPanelProps {
  open: boolean;
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  onRemove: (id: string) => void;
  onClear: () => void;
  mode: MapMode;
  userLocation: { lat: number; lng: number } | null;
}

export default function ControlPanel({ open, waypoints, segments, onRemove, onClear, mode, userLocation }: ControlPanelProps) {
  const total = totalRoutedDistance(segments);
  const minSegment = segments.length >= 2
    ? segments.reduce((min, s) => (s.routed < min.routed ? s : min), segments[0])
    : null;

  return (
    <div
      className={`absolute top-0 right-0 h-full z-[1000] bg-white/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: '340px' }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Navigation size={20} className="text-blue-500" />
            پنل کنترل
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'measure'
              ? waypoints.length === 0
                ? 'روی نقشه کلیک کنید تا نقطه اضافه شود'
                : `${toPersianNumber(waypoints.length)} نقطه اضافه شده`
              : 'حالت کاوش نقشه فعال است'}
          </p>
        </div>

        {/* Waypoints list */}
        <div className="flex-1 overflow-y-auto sidebar-scroll px-5 py-3">
          {waypoints.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <MapPin size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">هنوز نقطه‌ای اضافه نشده</p>
              {mode === 'measure' && (
                <p className="text-xs mt-1">روی نقشه کلیک کنید</p>
              )}
            </div>
          )}

          {waypoints.map((wp, idx) => {
            const segment = segments.find((s) => s.from === idx);
            const isShortest = minSegment && segment && segment.from === minSegment.from;

            return (
              <div key={wp.id}>
                <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-all ${
                  isShortest ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                }`}>
                  {/* Index badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                    isShortest ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {toPersianNumber(idx + 1)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {wp.isUserLocation ? 'موقعیت شما' : `نقطه ${wp.label}`}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {formatCoordinate(wp.lat, wp.lng)}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemove(wp.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Segment distance (road-network) */}
                {segment && (
                  <div className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 mb-2">
                    <ArrowLeftRight size={14} className={`${isShortest ? 'text-green-500' : 'text-gray-400'}`} />
                    <span>
                      مسافت جاده‌ای: {formatDistance(segment.routed)}
                      {isShortest && (
                        <span className="text-green-600 font-medium mr-2">(کوتاه‌ترین)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total distance card */}
        {waypoints.length >= 2 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gradient-to-t from-blue-50/80 to-transparent">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <Ruler size={20} className="text-white" />
              </div>
              <div>
                <div className="text-xs text-gray-400">مجموع مسافت جاده‌ای</div>
                <div className="text-lg font-bold text-gray-800">
                  {formatDistance(total)}
                </div>
              </div>
            </div>

            <button
              onClick={onClear}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <Trash2 size={16} />
              پاک کردن همه نقاط
            </button>
          </div>
        )}

        {/* User location indicator */}
        {userLocation && (
          <div className="px-5 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              موقعیت شما: {formatCoordinate(userLocation.lat, userLocation.lng)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
