import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { importFromUrl } from "@/lib/importers";
import { supabase } from "@/lib/supabase";

const QUICK_SOURCES = [
  { name: "RoyalRoad", icon: "👑", url: "https://royalroad.com", description: "Web novels & LitRPG" },
  { name: "Scribble Hub", icon: "✍️", url: "https://www.scribblehub.com", description: "Manga & web fiction" },
  { name: "Novel Updates", icon: "📚", url: "https://www.novelupdates.com", description: "Translation database" },
  { name: "Wuxia World", icon: "⚔️", url: "https://www.wuxiaworld.com", description: "Xianxia & Wuxia" },
  { name: "Webnovel", icon: "🌐", url: "https://www.webnovel.com", description: "Official CN novels" },
  { name: "Syosetu", icon: "🇯🇵", url: "https://syosetu.com", description: "Japanese light novels" },
];

export default function DiscoverScreen() {
  const { user } = useAuthStore();
  const { addBook } = useLibraryStore();
  const { settings } = useSettingsStore();
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const bgColor = settings.theme === "dark" ? "#0f0f1a" : settings.theme === "sepia" ? "#f4e8d0" : "#f8fafc";
  const textColor = settings.theme === "dark" ? "#e2e8f0" : settings.theme === "sepia" ? "#3d2b1f" : "#1e293b";
  const cardBg = settings.theme === "dark" ? "#1a1a2e" : settings.theme === "sepia" ? "#ede0c4" : "#ffffff";
  const borderColor = settings.theme === "dark" ? "#2d2d4e" : settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const mutedColor = settings.theme === "dark" ? "#94a3b8" : "#64748b";

  const handleImportUrl = async () => {
    if (!url.trim() || !user) return;
    setImporting(true);
    try {
      const parsed = await importFromUrl(url.trim());
      if (!parsed) {
        Alert.alert("Import Failed", "Could not extract content from that URL. Try copying the text and importing as a .txt file instead.");
        return;
      }

      const book = await addBook({
        user_id: user.id,
        title: parsed.title,
        author: parsed.author,
        description: parsed.description,
        file_format: "html",
        total_chapters: parsed.chapters.length,
        total_characters: parsed.chapters.reduce((s, c) => s + c.content.length, 0),
        tags: [],
        is_downloaded: true,
        source_url: url.trim(),
      });

      if (book) {
        const rows = parsed.chapters.map((ch, i) => ({
          book_id: book.id,
          user_id: user.id,
          chapter_index: i,
          title: ch.title,
          content: ch.content,
          character_count: ch.content.length,
        }));
        await supabase.from("chapters").insert(rows);
        setUrl("");
        Alert.alert("Imported!", `"${parsed.title}" added to your library.`);
      }
    } catch (e) {
      Alert.alert("Error", String(e));
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: textColor, marginBottom: 4 }}>
          Discover
        </Text>
        <Text style={{ color: mutedColor, fontSize: 14, marginBottom: 24 }}>
          Import from any web novel site
        </Text>

        {/* URL Import Box */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor, marginBottom: 28 }}>
          <Text style={{ color: textColor, fontWeight: "700", fontSize: 16, marginBottom: 12 }}>
            Import from URL
          </Text>
          <Text style={{ color: mutedColor, fontSize: 13, marginBottom: 12 }}>
            Paste a chapter or story URL to import its text content directly into your library.
          </Text>
          <View style={{
            flexDirection: "row",
            borderWidth: 1, borderColor, borderRadius: 12, overflow: "hidden", marginBottom: 8,
          }}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://royalroad.com/fiction/..."
              placeholderTextColor={mutedColor}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{ flex: 1, padding: 14, color: textColor, fontSize: 14 }}
            />
            <TouchableOpacity
              onPress={handleImportUrl}
              disabled={importing || !url.trim()}
              style={{
                backgroundColor: "#6366f1",
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
                opacity: importing || !url.trim() ? 0.6 : 1,
              }}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={{ color: mutedColor, fontSize: 11 }}>
            * Works best on sites that serve plain HTML. Some sites with heavy JS may not parse fully.
          </Text>
        </View>

        {/* Quick Sources */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Ionicons name="globe-outline" size={18} color={textColor} />
          <Text style={{ color: textColor, fontWeight: "700", fontSize: 18 }}>
            Popular Sources
          </Text>
        </View>
        <View style={{ gap: 10, marginBottom: 28 }}>
          {QUICK_SOURCES.map((src) => (
            <TouchableOpacity
              key={src.name}
              onPress={() => setUrl(src.url)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: cardBg,
                borderRadius: 16,
                borderWidth: 1,
                borderColor,
                padding: 16,
                gap: 14,
                shadowColor: "#000",
                shadowOpacity: settings.theme === "dark" ? 0.15 : 0.04,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
              }}
            >
              <View style={{
                width: 46, height: 46, borderRadius: 14,
                backgroundColor: settings.theme === "dark" ? "#1e1b4b" : "#eef2ff",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 22 }}>{src.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }}>{src.name}</Text>
                <Text style={{ color: mutedColor, fontSize: 12, marginTop: 1 }}>{src.description}</Text>
              </View>
              <View style={{
                width: 30, height: 30, borderRadius: 10,
                backgroundColor: settings.theme === "dark" ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="arrow-forward" size={15} color="#6366f1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={{ backgroundColor: "#1e1b4b", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#3730a3" }}>
          <Text style={{ color: "#a5b4fc", fontWeight: "700", fontSize: 15, marginBottom: 10 }}>
            Import Tips
          </Text>
          {[
            "For EPUB books, use the Library → Import button",
            "Copy/paste novel text into a .txt file for best results",
            "HTML import works on most static web novel pages",
            "Some sites require you to be on the chapter page (not index)",
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
              <Text style={{ color: "#6366f1", fontWeight: "700" }}>{i + 1}.</Text>
              <Text style={{ color: "#c7d2fe", fontSize: 13, flex: 1 }}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
