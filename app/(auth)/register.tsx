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

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirm) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert("Registration Failed", error.message);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username,
      });
    }

    setLoading(false);
    Alert.alert(
      "Account Created!",
      "Welcome to NovelReader. Check your email to verify your account.",
      [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
    );
  };

  const inputStyle = (field: string) => ({
    backgroundColor: "#1a1a2e",
    borderWidth: 1.5,
    borderColor: focusedField === field ? "#6366f1" : "#2d2d4e",
    borderRadius: 14,
    padding: 16,
    color: "#e2e8f0",
    fontSize: 16,
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
        {/* Decorative accents */}
        <View style={{
          position: "absolute", top: -60, right: -60,
          width: 200, height: 200, borderRadius: 100,
          backgroundColor: "rgba(99, 102, 241, 0.05)",
        }} />

        {/* Logo */}
        <View style={{ alignItems: "center", marginBottom: 36 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 22,
            backgroundColor: "#1e1b4b",
            alignItems: "center", justifyContent: "center",
            marginBottom: 14,
            shadowColor: "#6366f1", shadowOpacity: 0.3, shadowRadius: 16,
            elevation: 8,
          }}>
            <Ionicons name="person-add" size={30} color="#818cf8" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#e2e8f0", letterSpacing: -0.5 }}>
            Create Account
          </Text>
          <Text style={{ fontSize: 15, color: "#64748b", marginTop: 4 }}>
            Join NovelReader today
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontWeight: "600", letterSpacing: 0.3 }}>
              Username
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Your display name"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle("username")}
            />
          </View>

          <View>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontWeight: "600", letterSpacing: 0.3 }}>
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
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle("email")}
            />
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
                placeholder="Min. 6 characters"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                style={{ flex: 1, padding: 16, color: "#e2e8f0", fontSize: 16 }}
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

          <View>
            <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontWeight: "600", letterSpacing: 0.3 }}>
              Confirm Password
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor="#475569"
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField("confirm")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle("confirm")}
            />
          </View>

          <TouchableOpacity
            onPress={handleRegister}
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
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 18 }}>
            <Text style={{ color: "#64748b", fontSize: 14 }}>Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text style={{ color: "#818cf8", fontWeight: "700", fontSize: 14 }}>Sign In</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
