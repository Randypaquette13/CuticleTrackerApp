import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { configureNotificationHandler } from '../src/utils/notifications';

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    configureNotificationHandler();

    // Navigate to the correct screen when a notification is tapped
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          id?: string;
        };
        if (data?.type === 'thing' && data.id) {
          router.push(`/track-thing/${data.id}`);
        } else if (data?.type === 'group' && data.id) {
          router.push(`/track-group/${data.id}`);
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f0f1a' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="new-tracker/details" />
          <Stack.Screen name="new-tracker/photo" />
          <Stack.Screen name="draw-overlay/[id]" />
          <Stack.Screen name="track-thing/[id]" />
          <Stack.Screen name="track-group/[id]" />
          <Stack.Screen name="slideshow/[id]" />
          <Stack.Screen name="edit-thing/[id]" />
          <Stack.Screen name="edit-group/[id]" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
