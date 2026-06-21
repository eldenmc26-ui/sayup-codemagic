// App.tsx — Entry point Talksy
// Supporta Android e iOS

import React, { useEffect } from 'react';
import { StatusBar, Alert, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';
import RootNavigator from './RootNavigator';
import {
  registerFCMToken,
  listenTokenRefresh,
  listenForegroundMessages,
  listenNotificationOpenedApp,
  getInitialNotification,
} from './notificationService';

export default function App() {
  const handleNotificationNavigation = (data: any) => {
    console.log('[App] Gestione navigazione notifica:', data);
    // Qui potrai aggiungere la logica per saltare alla chat specifica in futuro
  };

  useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => console.log('[AdMob] Mobile Ads SDK initialized'))
      .catch((error) => console.warn('[AdMob] init failed', error));

    // 1. Registra token FCM e ascolta aggiornamenti
    registerFCMToken();
    const unsubRefresh = listenTokenRefresh();

    // 2. Mostra notifiche in foreground come Alert popup
    const unsubMessages = listenForegroundMessages((payload) => {
      Alert.alert(payload.title, payload.body);
    });

    // 3. Gestisci notifica aperta da background
    const unsubOpened = listenNotificationOpenedApp((data) => {
      console.log('[App] Notifica aperta da background:', data);
      handleNotificationNavigation(data);
    });

    // 4. Gestisci notifica che ha aperto l'app da chiusa (killed state)
    getInitialNotification().then((data) => {
      if (data) {
        console.log('[App] App aperta da notifica:', data);
        handleNotificationNavigation(data);
      }
    });

    return () => {
      unsubRefresh();
      unsubMessages();
      unsubOpened();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#075E54"
        translucent={Platform.OS === 'android'}
      />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
