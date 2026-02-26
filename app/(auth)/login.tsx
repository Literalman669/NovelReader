import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Login Failed", error.message);
    } else {
      router.replace("/(tabs)/library");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#0f0f1a" }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>📖</Text>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#e2e8f0" }}>
            NovelReader
          </Text>
          <Text style={{ fontSize: 16, color: "#94a3b8", marginTop: 4 }}>
            Your personal reading companion
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: "#94a3b8", fontSize: 14, marginBottom: 6, fontWeight: "600" }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: "#1a1a2e",
                borderWidth: 1,
                borderColor: "#2d2d4e",
                borderRadius: 12,
                padding: 16,
                color: "#e2e8f0",
                fontSize: 16,
              }}
            />
          </View>

          <View>
            <Text style={{ color: "#94a3b8", fontSize: 14, marginBottom: 6, fontWeight: "600" }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              secureTextEntry
              style={{
                backgroundColor: "#1a1a2e",
                borderWidth: 1,
                borderColor: "#2d2d4e",
                borderRadius: 12,
                padding: 16,
                color: "#e2e8f0",
                fontSize: 16,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{
              backgroundColor: "#6366f1",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
            <Text style={{ color: "#94a3b8" }}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register">
              <Text style={{ color: "#818cf8", fontWeight: "600" }}>Sign Up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
