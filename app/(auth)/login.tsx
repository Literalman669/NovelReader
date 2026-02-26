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
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const inputStyle = (field: string) => ({
    backgroundColor: "#1a1a2e",
    borderWidth: 1.5,
    borderColor: focusedField === field ? "#6366f1" : "#2d2d4e",
    borderRadius: 14,
    padding: 16,
    color: "#e2e8f0",
    fontSize: 16,
    flex: 1,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#0f0f1a" }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decorative top accent */}
        <View style={{
          position: "absolute", top: -80, left: -80,
          width: 250, height: 250, borderRadius: 125,
          backgroundColor: "rgba(99, 102, 241, 0.06)",
        }} />
        <View style={{
          position: "absolute", top: -40, right: -100,
          width: 200, height: 200, borderRadius: 100,
          backgroundColor: "rgba(129, 140, 248, 0.04)",
        }} />

        {/* Logo / Branding */}
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: "#1e1b4b",
            alignItems: "center", justifyContent: "center",
            marginBottom: 16,
            shadowColor: "#6366f1", shadowOpacity: 0.3, shadowRadius: 20,
            elevation: 8,
          }}>
            <Ionicons name="book" size={36} color="#818cf8" />
          </View>
          <Text style={{ fontSize: 32, fontWeight: "800", color: "#e2e8f0", letterSpacing: -0.5 }}>
            NovelReader
          </Text>
          <Text style={{ fontSize: 15, color: "#64748b", marginTop: 6 }}>
            Your personal reading companion
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 18 }}>
          <View>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontWeight: "600", letterSpacing: 0.3 }}>
              Email
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                style={inputStyle("email")}
              />
            </View>
          </View>

          <View>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontWeight: "600", letterSpacing: 0.3 }}>
              Password
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: "#1a1a2e",
              borderWidth: 1.5,
              borderColor: focusedField === "password" ? "#6366f1" : "#2d2d4e",
              borderRadius: 14,
              overflow: "hidden",
            }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                style={{
                  flex: 1, padding: 16, color: "#e2e8f0", fontSize: 16,
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ paddingHorizontal: 14 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#6366f1",
              borderRadius: 14,
              padding: 17,
              alignItems: "center",
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
              shadowColor: "#6366f1",
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.3 }}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
            <Text style={{ color: "#64748b", fontSize: 14 }}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register">
              <Text style={{ color: "#818cf8", fontWeight: "700", fontSize: 14 }}>Sign Up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
