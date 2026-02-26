import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { getBookDisplayTitle, getBookmarkDisplayLabel, truncateForDisplay } from "@/lib/content-utils";

type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"];
type Highlight = Database["public"]["Tables"]["highlights"]["Row"];

export default function BookmarksScreen() {
  const { user } = useAuthStore();
  const { books, fetchBooks } = useLibraryStore();
  const { settings } = useSettingsStore();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bookmarks" | "highlights">("bookmarks");

  const bgColor = settings.theme === "dark" ? "#0f0f1a" : settings.theme === "sepia" ? "#f4e8d0" : "#f8fafc";
  const textColor = settings.theme === "dark" ? "#e2e8f0" : settings.theme === "sepia" ? "#3d2b1f" : "#1e293b";
  const cardBg = settings.theme === "dark" ? "#1a1a2e" : settings.theme === "sepia" ? "#ede0c4" : "#ffffff";
  const borderColor = settings.theme === "dark" ? "#2d2d4e" : settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const mutedColor = settings.theme === "dark" ? "#94a3b8" : "#64748b";

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setBookmarks(data ?? []);
  }, [user]);

  const fetchHighlights = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("highlights")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setHighlights(data ?? []);
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchBooks(user.id),
        fetchBookmarks(),
        fetchHighlights(),
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchBooks, fetchBookmarks, fetchHighlights]);

  const deleteBookmark = async (id: string) => {
    Alert.alert("Delete Bookmark", "Remove this bookmark?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("bookmarks").delete().eq("id", id);
          setBookmarks((prev) => prev.filter((b) => b.id !== id));
        },
      },
    ]);
  };

  const deleteHighlight = async (id: string) => {
    Alert.alert("Delete Highlight", "Remove this highlight?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("highlights").delete().eq("id", id);
          setHighlights((prev) => prev.filter((h) => h.id !== id));
        },
      },
    ]);
  };

  const getBookTitle = (bookId: string) => {
    const b = books.find((book) => book.id === bookId);
    return getBookDisplayTitle(b?.title, b?.total_chapters) || "Book";
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: textColor, paddingVertical: 16 }}>
          Bookmarks
        </Text>

        {/* Tab switcher */}
        <View style={{
          flexDirection: "row",
          backgroundColor: cardBg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          marginBottom: 16,
          padding: 4,
        }}>
          {(["bookmarks", "highlights"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
                backgroundColor: activeTab === tab ? "#6366f1" : "transparent",
              }}
            >
              <Text style={{
                color: activeTab === tab ? "#fff" : mutedColor,
                fontWeight: "600",
                fontSize: 14,
                textTransform: "capitalize",
              }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : activeTab === "bookmarks" ? (
          bookmarks.length === 0 ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 56 }}>🔖</Text>
              <Text style={{ color: textColor, fontSize: 20, fontWeight: "700" }}>No bookmarks yet</Text>
              <Text style={{ color: mutedColor, textAlign: "center" }}>
                Tap the bookmark icon while reading to save your place
              </Text>
            </View>
          ) : (
            <FlatList
              data={bookmarks}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push(`/reader/${item.book_id}`)}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor,
                    padding: 16,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: "#1e1b4b",
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Ionicons name="bookmark" size={20} color="#818cf8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
                      {getBookmarkDisplayLabel(item.label, item.chapter_index)}
                    </Text>
                    <Text style={{ color: "#818cf8", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {truncateForDisplay(getBookTitle(item.book_id), 45)}
                    </Text>
                    {item.note && (
                      <Text style={{ color: mutedColor, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                        {item.note}
                      </Text>
                    )}
                    <Text style={{ color: mutedColor, fontSize: 11, marginTop: 4 }}>
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteBookmark(item.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )
        ) : highlights.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 56 }}>✨</Text>
            <Text style={{ color: textColor, fontSize: 20, fontWeight: "700" }}>No highlights yet</Text>
            <Text style={{ color: mutedColor, textAlign: "center" }}>
              Select text while reading to add highlights
            </Text>
          </View>
        ) : (
          <FlatList
            data={highlights}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/reader/${item.book_id}`)}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: item.color || "#fbbf24",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: textColor, fontSize: 14, fontStyle: "italic" }} numberOfLines={3}>
                    &quot;{item.selected_text}&quot;
                  </Text>
                  <Text style={{ color: "#818cf8", fontSize: 12, marginTop: 6 }} numberOfLines={1}>
                    {truncateForDisplay(getBookTitle(item.book_id), 40)} — Ch. {item.chapter_index + 1}
                  </Text>
                  {item.note && (
                    <Text style={{ color: mutedColor, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                      {item.note}
                    </Text>
                  )}
                  <Text style={{ color: mutedColor, fontSize: 11, marginTop: 4 }}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteHighlight(item.id)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
