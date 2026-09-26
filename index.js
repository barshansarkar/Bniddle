import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import App from './App';

function Main() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
      <SafeAreaProvider>
        <StatusBar style="auto" translucent />
        <App />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(Main);