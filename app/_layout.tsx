import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const { setSession, fetchProfile } = useAuthStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
          fetchProfile();
          loadSettings(session.user.id);
        }
      } catch (e) {
        console.warn("Session init error:", e);
      } finally {
        if (Platform.OS !== "web") SplashScreen.hideAsync();
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile();
        loadSettings(session.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reader/[bookId]" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="player/[bookId]" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
