import { useEffect } from "react";
import { Tabs, Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { session, loading } = useAuthStore();
  const { fetchBooks, fetchProgress } = useLibraryStore();

  useEffect(() => {
    if (session?.user) {
      fetchBooks(session.user.id);
      fetchProgress(session.user.id);
    }
  }, [session?.user?.id, fetchBooks, fetchProgress]);

  if (!loading && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a1a2e",
          borderTopColor: "#2d2d4e",
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#64748b",
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
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
