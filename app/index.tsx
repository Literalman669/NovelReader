import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f0f1a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/library" />;
  }

  return <Redirect href="/(auth)/login" />;
}
