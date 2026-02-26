import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { NativeTts, ElevenLabsTts } from "@/lib/tts";

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuthStore();
  const { settings, updateSetting, saveSettings, loadSettings } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [voices, setVoices] = useState<{ identifier: string; name: string; language: string }[]>([]);
  const [elVoices, setElVoices] = useState<{ voice_id: string; name: string }[]>([]);
  const [loadingElVoices, setLoadingElVoices] = useState(false);
  const [showElKey, setShowElKey] = useState(false);

  const bgColor = settings.theme === "dark" ? "#0f0f1a" : settings.theme === "sepia" ? "#f4e8d0" : "#f8fafc";
  const textColor = settings.theme === "dark" ? "#e2e8f0" : settings.theme === "sepia" ? "#3d2b1f" : "#1e293b";
  const cardBg = settings.theme === "dark" ? "#1a1a2e" : settings.theme === "sepia" ? "#ede0c4" : "#ffffff";
  const borderColor = settings.theme === "dark" ? "#2d2d4e" : settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const mutedColor = settings.theme === "dark" ? "#94a3b8" : "#64748b";

  useEffect(() => {
    NativeTts.getVoices().then((v) => setVoices(v as typeof voices));
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await saveSettings(user.id);
    setSaving(false);
    Alert.alert("Saved", "Your settings have been saved.");
  };

  const handleLoadElVoices = async () => {
    if (!settings.elevenLabsApiKey) {
      Alert.alert("API Key Required", "Enter your ElevenLabs API key first.");
      return;
    }
    setLoadingElVoices(true);
    const v = await ElevenLabsTts.getVoices(settings.elevenLabsApiKey);
    setElVoices(v);
    setLoadingElVoices(false);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={{ color: mutedColor, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 24 }}>
      {title}
    </Text>
  );

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}>
      <Text style={{ color: textColor, fontSize: 15 }}>{label}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: textColor, marginBottom: 4 }}>Settings</Text>

        {/* Profile Card */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontWeight: "700", fontSize: 17 }}>{profile?.username ?? "User"}</Text>
            <Text style={{ color: mutedColor, fontSize: 13 }}>{user?.email ?? ""}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={{ padding: 8 }}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Reading */}
        <SectionHeader title="Reading" />
        <View style={{ backgroundColor: cardBg, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor }}>
          <Row label="Theme">
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["dark", "light", "sepia"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => updateSetting("theme", t)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: settings.theme === t ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.theme === t ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{ color: settings.theme === t ? "#fff" : mutedColor, fontSize: 12, fontWeight: "600", textTransform: "capitalize" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>

          <Row label="Font Size">
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => updateSetting("fontSize", Math.max(12, settings.fontSize - 2))}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: bgColor, borderWidth: 1, borderColor, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: textColor, fontSize: 18, fontWeight: "700" }}>−</Text>
              </TouchableOpacity>
              <Text style={{ color: textColor, fontWeight: "700", minWidth: 32, textAlign: "center" }}>{settings.fontSize}</Text>
              <TouchableOpacity
                onPress={() => updateSetting("fontSize", Math.min(32, settings.fontSize + 2))}
                style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: bgColor, borderWidth: 1, borderColor, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: textColor, fontSize: 18, fontWeight: "700" }}>+</Text>
              </TouchableOpacity>
            </View>
          </Row>

          <Row label="Line Spacing">
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[1.2, 1.4, 1.6, 1.8, 2.0].map((lh) => (
                <TouchableOpacity
                  key={lh}
                  onPress={() => updateSetting("lineHeight", lh)}
                  style={{
                    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
                    backgroundColor: settings.lineHeight === lh ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.lineHeight === lh ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{ color: settings.lineHeight === lh ? "#fff" : mutedColor, fontSize: 11, fontWeight: "600" }}>{lh}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>

          <Row label="Font">
            <View style={{ flexDirection: "row", gap: 6 }}>
              {["System", "Georgia", "Courier New"].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => updateSetting("fontFamily", f)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: settings.fontFamily === f ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.fontFamily === f ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{
                    color: settings.fontFamily === f ? "#fff" : mutedColor,
                    fontSize: 12, fontWeight: "600",
                    fontFamily: f === "System" ? undefined : f,
                  }}>{f === "System" ? "Default" : f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>
        </View>

        {/* TTS */}
        <SectionHeader title="Text-to-Speech" />
        <View style={{ backgroundColor: cardBg, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor }}>
          <Row label="TTS Engine">
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["native", "elevenlabs"] as const).map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => updateSetting("ttsEngine", e)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: settings.ttsEngine === e ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.ttsEngine === e ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{ color: settings.ttsEngine === e ? "#fff" : mutedColor, fontSize: 12, fontWeight: "600", textTransform: "capitalize" }}>
                    {e === "native" ? "Device" : "ElevenLabs"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>

          <Row label="Speed">
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => updateSetting("ttsSpeed", s)}
                  style={{
                    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
                    backgroundColor: settings.ttsSpeed === s ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.ttsSpeed === s ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{ color: settings.ttsSpeed === s ? "#fff" : mutedColor, fontSize: 11, fontWeight: "600" }}>{s}x</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>

          {settings.ttsEngine === "native" && voices.length > 0 && (
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}>
              <Text style={{ color: textColor, fontSize: 15, marginBottom: 10 }}>Voice</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {voices.slice(0, 8).map((v) => (
                  <TouchableOpacity
                    key={v.identifier}
                    onPress={() => updateSetting("ttsVoice", v.identifier)}
                    style={{
                      marginRight: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: settings.ttsVoice === v.identifier ? "#6366f1" : bgColor,
                      borderWidth: 1, borderColor: settings.ttsVoice === v.identifier ? "#6366f1" : borderColor,
                    }}
                  >
                    <Text style={{ color: settings.ttsVoice === v.identifier ? "#fff" : mutedColor, fontSize: 12 }} numberOfLines={1}>
                      {v.name}
                    </Text>
                    <Text style={{ color: settings.ttsVoice === v.identifier ? "#c7d2fe" : mutedColor, fontSize: 10 }}>
                      {v.language}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {settings.ttsEngine === "elevenlabs" && (
            <>
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                <Text style={{ color: textColor, fontSize: 15, marginBottom: 8 }}>ElevenLabs API Key</Text>
                <View style={{ flexDirection: "row", borderWidth: 1, borderColor, borderRadius: 10, overflow: "hidden" }}>
                  <TextInput
                    value={settings.elevenLabsApiKey}
                    onChangeText={(v) => updateSetting("elevenLabsApiKey", v)}
                    placeholder="sk-..."
                    placeholderTextColor={mutedColor}
                    secureTextEntry={!showElKey}
                    autoCapitalize="none"
                    style={{ flex: 1, padding: 12, color: textColor, fontSize: 13 }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowElKey(!showElKey)}
                    style={{ padding: 12, alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name={showElKey ? "eye-off-outline" : "eye-outline"} size={18} color={mutedColor} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: mutedColor, fontSize: 11, marginTop: 6 }}>
                  Get a free key at elevenlabs.io (10k chars/month free)
                </Text>
              </View>

              <View style={{ paddingVertical: 12 }}>
                <TouchableOpacity
                  onPress={handleLoadElVoices}
                  disabled={loadingElVoices}
                  style={{ backgroundColor: "#1e1b4b", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {loadingElVoices ? (
                    <ActivityIndicator size="small" color="#818cf8" />
                  ) : (
                    <Ionicons name="reload-outline" size={16} color="#818cf8" />
                  )}
                  <Text style={{ color: "#818cf8", fontWeight: "600" }}>Load ElevenLabs Voices</Text>
                </TouchableOpacity>
                {elVoices.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {elVoices.map((v) => (
                      <TouchableOpacity
                        key={v.voice_id}
                        onPress={() => updateSetting("ttsVoice", v.voice_id)}
                        style={{
                          marginRight: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: settings.ttsVoice === v.voice_id ? "#6366f1" : bgColor,
                          borderWidth: 1, borderColor: settings.ttsVoice === v.voice_id ? "#6366f1" : borderColor,
                        }}
                      >
                        <Text style={{ color: settings.ttsVoice === v.voice_id ? "#fff" : mutedColor, fontSize: 12 }}>
                          {v.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={{ backgroundColor: cardBg, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor }}>
          <Row label="Version"><Text style={{ color: mutedColor }}>1.0.0</Text></Row>
          <Row label="Storage"><Text style={{ color: mutedColor }}>Supabase + Local SQLite</Text></Row>
          <Row label="TTS"><Text style={{ color: mutedColor }}>Device Native + ElevenLabs</Text></Row>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            marginTop: 28, backgroundColor: "#6366f1", borderRadius: 14,
            padding: 16, alignItems: "center", opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Save Settings</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignOut}
          style={{ marginTop: 12, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#ef4444" }}
        >
          <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 16 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
