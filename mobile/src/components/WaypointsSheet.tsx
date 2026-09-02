import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../theme';
import type { Waypoint, SegmentDistance } from '../types';
import { formatCoordinate, formatDistance, toPersianNumber } from '../utils/persian';
import { totalRoutedDistance, totalStraightDistance } from '../utils/distance';
import { hapticLight, hapticMedium, hapticWarning } from '../utils/haptics';

type WaypointsSheetProps = {
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onUndo: () => void;
};

const WaypointsSheet = forwardRef<BottomSheet, WaypointsSheetProps>(
  ({ waypoints, segments, onRemove, onClear, onUndo }, ref) => {
    const insets = useSafeAreaInsets();
    const snapPoints = useMemo(() => ['12%', '45%', '85%'], []);

    const renderItem = useCallback(
      ({ item, index }: { item: Waypoint; index: number }) => (
        <View style={styles.row}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{toPersianNumber(index + 1)}</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>نقطه {item.label}</Text>
            <Text style={styles.rowCoords}>
              {formatCoordinate(item.lat, item.lng)}
            </Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => { hapticLight(); onRemove(item.id); }}
            style={styles.removeBtn}
          >
            <Ionicons name="close" size={18} color={COLORS.textMid} />
          </Pressable>
        </View>
      ),
      [onRemove],
    );

    const headerRight = waypoints.length > 0 ? (
      <Pressable
        onPress={() => { hapticMedium(); onUndo(); }}
        style={styles.undoBtn}
      >
        <Ionicons name="arrow-undo" size={18} color={COLORS.textMid} />
      </Pressable>
    ) : null;

    return (
      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        handleIndicatorStyle={styles.handle}
        handleStyle={styles.handleContainer}
        backgroundStyle={styles.background}
        style={{ zIndex: 1300 }}
      >
        {/* Header with title and undo button */}
        <View style={[styles.header, { paddingBottom: insets.bottom > 0 ? 12 : 8 }]}>
          <Text style={styles.title}>نقاط مسیر</Text>
          {headerRight}
        </View>

        {/* Waypoint list */}
        <BottomSheetFlatList
          data={waypoints}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            waypoints.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={40} color={COLORS.gray} />
              <Text style={styles.emptyTitle}>نقطه‌ای اضافه نشده</Text>
              <Text style={styles.emptyHint}>
                روی نقشه کلیک کنید تا نقطه اضافه شود
              </Text>
            </View>
          }
        />

        {/* Footer: totals + clear */}
        {waypoints.length > 0 ? (
          <View style={styles.footer}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>مجموع مسافت</Text>
              <Text style={styles.totalsValue}>
                {formatDistance(totalRoutedDistance(segments))}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>خط مستقیم</Text>
              <Text style={styles.totalsValue}>
                {formatDistance(totalStraightDistance(segments))}
              </Text>
            </View>
            <Pressable
              style={styles.clearBtn}
              onPress={() => { hapticWarning(); onClear(); }}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.red} />
              <Text style={styles.clearText}>پاک کردن همه نقاط</Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    );
  },
);

export default WaypointsSheet;

WaypointsSheet.displayName = 'WaypointsSheet';

const styles = StyleSheet.create({
  handleContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    backgroundColor: '#d1d5db',
  },
  background: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_700Bold',
  },
  undoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  indexText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Vazirmatn_700Bold',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_500Medium',
    textAlign: 'right',
  },
  rowCoords: {
    fontSize: 12,
    color: COLORS.textMid,
    fontFamily: 'Vazirmatn_400Regular',
    marginTop: 2,
    textAlign: 'right',
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    color: COLORS.textMid,
    fontFamily: 'Vazirmatn_500Medium',
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.gray,
    fontFamily: 'Vazirmatn_400Regular',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 13,
    color: COLORS.textMid,
    fontFamily: 'Vazirmatn_400Regular',
  },
  totalsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_700Bold',
  },
  clearBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
  },
  clearText: {
    color: COLORS.red,
    fontSize: 13,
    fontFamily: 'Vazirmatn_500Medium',
  },
});
