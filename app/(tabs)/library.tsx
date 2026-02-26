import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { pickAndImportFile, importFromUrl } from "@/lib/importers";
import { getBookDisplayTitle, getAuthorDisplayName } from "@/lib/content-utils";
import { supabase } from "@/lib/supabase";

type SortOption = "recent" | "title" | "author" | "progress";
type ViewMode = "grid" | "list";

export default function LibraryScreen() {
  const { user } = useAuthStore();
  const { books, progress, loading, fetchBooks, fetchProgress, addBook, removeBook } = useLibraryStore();
  const { settings } = useSettingsStore();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);

  const bgColor = settings.theme === "dark" ? "#0f0f1a" : settings.theme === "sepia" ? "#f4e8d0" : "#f8fafc";
  const textColor = settings.theme === "dark" ? "#e2e8f0" : settings.theme === "sepia" ? "#3d2b1f" : "#1e293b";
  const cardBg = settings.theme === "dark" ? "#1a1a2e" : settings.theme === "sepia" ? "#ede0c4" : "#ffffff";
  const borderColor = settings.theme === "dark" ? "#2d2d4e" : settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const mutedColor = settings.theme === "dark" ? "#94a3b8" : "#64748b";

  useEffect(() => {
    if (user) {
      fetchBooks(user.id);
      fetchProgress(user.id);
    }
  }, [user]);

  const filteredBooks = books
    .filter((b) => {
      const q = search.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "author") return (a.author ?? "").localeCompare(b.author ?? "");
      if (sortBy === "progress") {
        const pa = progress[a.id]?.character_position ?? 0;
        const pb = progress[b.id]?.character_position ?? 0;
        return pb - pa;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const handleImportFile = useCallback(async () => {
    setImporting(true);
    setShowImportModal(false);
    try {
      const parsed = await pickAndImportFile();
      if (!parsed || !user) return;

      const book = await addBook({
        user_id: user.id,
        title: parsed.title,
        author: parsed.author,
        description: parsed.description,
        file_format: parsed.format,
        total_chapters: parsed.chapters.length,
        total_characters: parsed.chapters.reduce((sum, c) => sum + c.content.length, 0),
        tags: [],
        is_downloaded: true,
      });

      if (book) {
        const chapterRows = parsed.chapters.map((ch, i) => ({
          book_id: book.id,
          user_id: user.id,
          chapter_index: i,
          title: ch.title,
          content: ch.content,
          character_count: ch.content.length,
        }));
        await supabase.from("chapters").insert(chapterRows);
        Alert.alert("Imported!", `"${parsed.title}" added to your library.`);
      }
    } catch (e) {
      Alert.alert("Import Failed", String(e));
    } finally {
      setImporting(false);
    }
  }, [user, addBook]);

  const handleImportUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    setImportingUrl(true);
    try {
      const parsed = await importFromUrl(urlInput.trim());
      if (!parsed || !user) {
        Alert.alert("Error", "Could not import from that URL.");
        return;
      }

      const book = await addBook({
        user_id: user.id,
        title: parsed.title,
        author: parsed.author,
        description: parsed.description,
        file_format: "html",
        total_chapters: parsed.chapters.length,
        total_characters: parsed.chapters.reduce((sum, c) => sum + c.content.length, 0),
        tags: [],
        is_downloaded: true,
        source_url: urlInput.trim(),
      });

      if (book) {
        const chapterRows = parsed.chapters.map((ch, i) => ({
          book_id: book.id,
          user_id: user.id,
          chapter_index: i,
          title: ch.title,
          content: ch.content,
          character_count: ch.content.length,
        }));
        await supabase.from("chapters").insert(chapterRows);
        setUrlInput("");
        setShowImportModal(false);
        Alert.alert("Imported!", `"${parsed.title}" added to your library.`);
      }
    } catch (e) {
      Alert.alert("Import Failed", String(e));
    } finally {
      setImportingUrl(false);
    }
  }, [urlInput, user, addBook]);

  const handleDeleteBook = (bookId: string, title: string) => {
    Alert.alert(
      "Remove Book",
      `Remove "${title}" from your library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeBook(bookId),
        },
      ]
    );
  };

  const getProgressPercent = (bookId: string) => {
    const p = progress[bookId];
    if (!p) return 0;
    const book = books.find((b) => b.id === bookId);
    if (!book || book.total_characters === 0) return 0;
    return Math.min(100, Math.round((p.character_position / book.total_characters) * 100));
  };

  const formatBadge = (format: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      epub: { bg: "#6366f1", text: "#fff" },
      txt: { bg: "#059669", text: "#fff" },
      pdf: { bg: "#dc2626", text: "#fff" },
      html: { bg: "#d97706", text: "#fff" },
    };
    return colors[format] ?? { bg: "#6b7280", text: "#fff" };
  };

  const coverGradients = [
    ["#1e1b4b", "#312e81"],
    ["#1e3a5f", "#0c4a6e"],
    ["#3b1e4b", "#4c1d95"],
    ["#1e3b2e", "#064e3b"],
    ["#4b1e1e", "#7f1d1d"],
  ];

  const getCoverGradient = (id: string) => {
    const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return coverGradients[hash % coverGradients.length];
  };

  const renderGridItem = ({ item }: { item: typeof books[0] }) => {
    const pct = getProgressPercent(item.id);
    const badge = formatBadge(item.file_format);
    const [gradStart] = getCoverGradient(item.id);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/reader/${item.id}`)}
        onLongPress={() => handleDeleteBook(item.id, getBookDisplayTitle(item.title, item.total_chapters))}
        activeOpacity={0.85}
        style={{
          flex: 1,
          margin: 6,
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor,
          overflow: "hidden",
          maxWidth: "47%",
          shadowColor: "#000",
          shadowOpacity: settings.theme === "dark" ? 0.3 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <View style={{ backgroundColor: gradStart, height: 130, alignItems: "center", justifyContent: "center" }}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={{ width: "100%", height: 130 }} resizeMode="cover" />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Ionicons name="book-outline" size={36} color="rgba(165, 180, 252, 0.6)" />
              <Text style={{ color: "rgba(165, 180, 252, 0.5)", fontSize: 10, marginTop: 6, fontWeight: "600" }} numberOfLines={1}>
                {item.total_chapters} ch.
              </Text>
            </View>
          )}
          <View style={{
            position: "absolute", top: 8, right: 8,
            backgroundColor: badge.bg,
            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
          }}>
            <Text style={{ color: badge.text, fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {item.file_format}
            </Text>
          </View>
        </View>
        <View style={{ padding: 12 }}>
          <Text style={{ color: textColor, fontWeight: "700", fontSize: 14, lineHeight: 18 }} numberOfLines={2}>
            {getBookDisplayTitle(item.title, item.total_chapters)}
          </Text>
          <Text style={{ color: mutedColor, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
            {getAuthorDisplayName(item.author)}
          </Text>
          {pct > 0 && (
            <View style={{ marginTop: 10 }}>
              <View style={{ height: 3, backgroundColor: borderColor, borderRadius: 2 }}>
                <View style={{ height: 3, width: `${pct}%`, backgroundColor: "#6366f1", borderRadius: 2 }} />
              </View>
              <Text style={{ color: mutedColor, fontSize: 10, marginTop: 3 }}>{pct}%</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: borderColor }}>
          <TouchableOpacity
            onPress={() => router.push(`/reader/${item.id}`)}
            style={{ flex: 1, paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 }}
          >
            <Ionicons name="book-outline" size={13} color="#818cf8" />
            <Text style={{ color: "#818cf8", fontSize: 12, fontWeight: "600" }}>Read</Text>
          </TouchableOpacity>
          <View style={{ width: 1, backgroundColor: borderColor }} />
          <TouchableOpacity
            onPress={() => router.push(`/player/${item.id}`)}
            style={{ flex: 1, paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 }}
          >
            <Ionicons name="headset-outline" size={13} color="#818cf8" />
            <Text style={{ color: "#818cf8", fontSize: 12, fontWeight: "600" }}>Listen</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListItem = ({ item }: { item: typeof books[0] }) => {
    const pct = getProgressPercent(item.id);
    const [gradStart] = getCoverGradient(item.id);
    const badge = formatBadge(item.file_format);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/reader/${item.id}`)}
        onLongPress={() => handleDeleteBook(item.id, getBookDisplayTitle(item.title, item.total_chapters))}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          backgroundColor: cardBg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor,
          marginBottom: 10,
          overflow: "hidden",
          padding: 14,
          gap: 14,
          shadowColor: "#000",
          shadowOpacity: settings.theme === "dark" ? 0.2 : 0.06,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <View style={{ backgroundColor: gradStart, width: 56, height: 76, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={{ width: 56, height: 76, borderRadius: 10 }} resizeMode="cover" />
          ) : (
            <Ionicons name="book-outline" size={22} color="rgba(165, 180, 252, 0.6)" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Text style={{ color: textColor, fontWeight: "700", fontSize: 15, flex: 1 }} numberOfLines={1}>
              {getBookDisplayTitle(item.title, item.total_chapters)}
            </Text>
            <View style={{ backgroundColor: badge.bg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ color: badge.text, fontSize: 8, fontWeight: "700", textTransform: "uppercase" }}>{item.file_format}</Text>
            </View>
          </View>
          <Text style={{ color: mutedColor, fontSize: 12, marginTop: 1 }}>{getAuthorDisplayName(item.author)}</Text>
          <Text style={{ color: mutedColor, fontSize: 11, marginTop: 2 }}>
            {item.total_chapters} chapter{item.total_chapters !== 1 ? "s" : ""}
          </Text>
          {pct > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={{ height: 3, backgroundColor: borderColor, borderRadius: 2 }}>
                <View style={{ height: 3, width: `${pct}%`, backgroundColor: "#6366f1", borderRadius: 2 }} />
              </View>
              <Text style={{ color: mutedColor, fontSize: 10, marginTop: 2 }}>{pct}% complete</Text>
            </View>
          )}
        </View>
        <View style={{ gap: 6, justifyContent: "center", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.push(`/reader/${item.id}`)} style={{ padding: 6 }}>
            <Ionicons name="book-outline" size={20} color="#818cf8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/player/${item.id}`)} style={{ padding: 6 }}>
            <Ionicons name="headset-outline" size={20} color="#818cf8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteBook(item.id, getBookDisplayTitle(item.title, item.total_chapters))}
            style={{ padding: 6 }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: textColor }}>Library</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              style={{ padding: 8, backgroundColor: cardBg, borderRadius: 8, borderWidth: 1, borderColor }}>
              <Ionicons name={viewMode === "grid" ? "list" : "grid"} size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowImportModal(true)}
              style={{ padding: 8, backgroundColor: "#6366f1", borderRadius: 8 }}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: cardBg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          paddingHorizontal: 12,
          marginBottom: 12,
        }}>
          <Ionicons name="search" size={18} color={mutedColor} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, author, tag..."
            placeholderTextColor={mutedColor}
            style={{ flex: 1, padding: 12, color: textColor, fontSize: 15 }}
          />
        </View>

        {/* Sort bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {(["recent", "title", "author", "progress"] as SortOption[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => setSortBy(opt)}
              style={{
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: sortBy === opt ? "#6366f1" : cardBg,
                borderWidth: 1,
                borderColor: sortBy === opt ? "#6366f1" : borderColor,
              }}
            >
              <Text style={{
                color: sortBy === opt ? "#fff" : mutedColor,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "capitalize",
              }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Book count */}
        <Text style={{ color: mutedColor, fontSize: 13, marginBottom: 8 }}>
          {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
        </Text>

        {/* Books */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : filteredBooks.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 32 }}>
            <View style={{
              width: 96, height: 96, borderRadius: 28,
              backgroundColor: "#1e1b4b",
              alignItems: "center", justifyContent: "center",
              marginBottom: 4,
            }}>
              <Ionicons name="library-outline" size={44} color="#818cf8" />
            </View>
            <Text style={{ color: textColor, fontSize: 22, fontWeight: "800" }}>Your library is empty</Text>
            <Text style={{ color: mutedColor, textAlign: "center", lineHeight: 20, fontSize: 14 }}>
              Import EPUB, TXT, PDF files or paste a URL{"\n"}to start reading
            </Text>
            <TouchableOpacity
              onPress={() => setShowImportModal(true)}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#6366f1", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
                flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4,
                shadowColor: "#6366f1", shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Import a Book</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredBooks}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === "grid" ? 2 : 1}
            key={viewMode}
            renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>

      {/* Import Modal */}
      <Modal visible={showImportModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: textColor, fontSize: 20, fontWeight: "800" }}>Import Book</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleImportFile}
              style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 16, backgroundColor: settings.theme === "dark" ? "#0f0f1a" : "#f1f5f9", borderRadius: 12, marginBottom: 12 }}
            >
              <View style={{ backgroundColor: "#6366f1", width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="document" size={22} color="#fff" />
              </View>
              <View>
                <Text style={{ color: textColor, fontWeight: "700", fontSize: 16 }}>From File</Text>
                <Text style={{ color: mutedColor, fontSize: 13 }}>EPUB, TXT, PDF, HTML</Text>
              </View>
            </TouchableOpacity>

            <Text style={{ color: mutedColor, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>Or paste a URL</Text>
            <View style={{
              flexDirection: "row",
              borderWidth: 1,
              borderColor,
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 24,
            }}>
              <TextInput
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://royalroad.com/fiction/..."
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, padding: 14, color: textColor, fontSize: 14 }}
              />
              <TouchableOpacity
                onPress={handleImportUrl}
                disabled={importingUrl || !urlInput.trim()}
                style={{ backgroundColor: "#6366f1", paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}
              >
                {importingUrl ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Go</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
