import { StatusBar } from 'expo-status-bar';
import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
  useFonts,
} from '@expo-google-fonts/vazirmatn';
import { StyleSheet, Text, I18nManager, View } from 'react-native';

// RTL must be set at module scope, before the app renders.
// Note: forceRTL fully applies after an app restart — first launch may show
// some LTR layout; that is known RN behavior, not a bug.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function AppRoot() {
  return (
    <View style={styles.container}>
      <Text>Iran Map</Text>
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_700Bold,
  });

  if (!fontsLoaded) {
    // Keep the splash up until the fonts are ready.
    return null;
  }

  return <AppRoot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
