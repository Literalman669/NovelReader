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

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

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

  const inputStyle = {
    backgroundColor: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#2d2d4e",
    borderRadius: 12,
    padding: 16,
    color: "#e2e8f0",
    fontSize: 16,
  };

  const labelStyle = {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "600" as const,
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
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>📖</Text>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#e2e8f0" }}>
            Create Account
          </Text>
          <Text style={{ fontSize: 15, color: "#94a3b8", marginTop: 4 }}>
            Join NovelReader today
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={labelStyle}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Your display name"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={labelStyle}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={labelStyle}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor="#475569"
              secureTextEntry
              style={inputStyle}
            />
          </View>

          <View>
            <Text style={labelStyle}>Confirm Password</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor="#475569"
              secureTextEntry
              style={inputStyle}
            />
          </View>

          <TouchableOpacity
            onPress={handleRegister}
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
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
            <Text style={{ color: "#94a3b8" }}>Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text style={{ color: "#818cf8", fontWeight: "600" }}>Sign In</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
