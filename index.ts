import '@expo/metro-runtime';
import { Platform } from 'react-native';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// Safely register Android Home Screen Widget task handler
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widgets/widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    // Graceful fallback if native widget module is absent in current runtime
  }
}

renderRootComponent(App);
