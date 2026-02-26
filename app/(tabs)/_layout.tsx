import { useEffect } from "react";
import { Platform } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { session, loading } = useAuthStore();
  const { fetchBooks, fetchProgress } = useLibraryStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (session?.user) {
      fetchBooks(session.user.id);
      fetchProgress(session.user.id);
    }
  }, [session?.user?.id, fetchBooks, fetchProgress]);

  if (!loading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  const tabBg =
    settings.theme === "dark" ? "#1a1a2e" :
    settings.theme === "sepia" ? "#ede0c4" : "#ffffff";
  const tabBorder =
    settings.theme === "dark" ? "#2d2d4e" :
    settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const activeColor = settings.theme === "dark" ? "#818cf8" : "#6366f1";
  const inactiveColor =
    settings.theme === "dark" ? "#64748b" :
    settings.theme === "sepia" ? "#8b7355" : "#94a3b8";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopColor: tabBorder,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "Bookmarks",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-sharp" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
