import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Vazirmatn_400Regular, Vazirmatn_500Medium } from '@expo-google-fonts/vazirmatn';

import { searchPlaces } from '../utils/geocoding';
import { toPersianDigits } from '../utils/persian';
import { COLORS } from '../theme';
import type { SearchResult } from '../types';

type SearchBarProps = {
  onSelect: (lat: number, lng: number) => void;
};

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Clear any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchPlaces(value, 6);
        setResults(res);
        setOpen(res.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onSelect(lat, lng);
    setQuery(result.display_name);
    setOpen(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.inputRow}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.blue} />
          ) : (
            <Ionicons name="search" size={20} color={COLORS.gray} />
          )}
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleSearch}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="جستجوی مکان... (مثال: میدان آزادی تهران)"
            placeholderTextColor={COLORS.gray}
            style={styles.input}
            textAlign="right"
          />
        </View>

        {open && results.length > 0 ? (
          <View style={styles.results}>
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.place_id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons
                    name="location"
                    size={16}
                    color={COLORS.blue}
                    style={styles.rowIcon}
                  />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.display_name}
                    </Text>
                    <Text style={styles.rowCoords}>
                      {toPersianDigits(parseFloat(item.lat).toFixed(4))},{' '}
                      {toPersianDigits(parseFloat(item.lon).toFixed(4))}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_400Regular',
  },
  results: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  list: {
    maxHeight: 300,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  rowPressed: {
    backgroundColor: COLORS.grayLight,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
    marginHorizontal: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_500Medium',
  },
  rowCoords: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
    textAlign: 'right',
  },
});