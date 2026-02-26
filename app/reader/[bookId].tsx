import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useReaderStore } from "@/stores/readerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { supabase } from "@/lib/supabase";
import { stripWebToEpubNav, getChapterDisplayTitle, getBookDisplayTitle, getBookmarkDisplayLabel } from "@/lib/content-utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function decodeEntities(text: string): string {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default function ReaderScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { user } = useAuthStore();
  const { books, progress, updateProgress, fetchBook } = useLibraryStore();
  const { settings } = useSettingsStore();
  const {
    chapters, setChapters, currentChapterIndex, setChapterIndex,
    bookmarks, highlights, fetchBookmarks, fetchHighlights, addBookmark,
  } = useReaderStore();

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const hasRestoredScroll = useRef(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showChapters, setShowChapters] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showBookmarkNote, setShowBookmarkNote] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const book = books.find((b) => b.id === bookId);
  const chapter = chapters[currentChapterIndex];

  const bgColor =
    settings.theme === "dark" ? "#0f0f1a" :
    settings.theme === "sepia" ? "#f4e8d0" : "#ffffff";
  const textColor =
    settings.theme === "dark" ? "#e2e8f0" :
    settings.theme === "sepia" ? "#3d2b1f" : "#1e293b";
  const surfaceColor =
    settings.theme === "dark" ? "#1a1a2e" :
    settings.theme === "sepia" ? "#ede0c4" : "#f1f5f9";
  const borderColor =
    settings.theme === "dark" ? "#2d2d4e" :
    settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const mutedColor = settings.theme === "dark" ? "#94a3b8" : "#64748b";

  useEffect(() => {
    if (!bookId || !user) return;
    fetchBook(bookId);
    loadChapters();
    fetchBookmarks(user.id, bookId);
    fetchHighlights(user.id, bookId);
  }, [bookId, user, fetchBook]);

  useEffect(() => {
    if (progress[bookId ?? ""]?.chapter_index !== undefined) {
      const savedChapter = progress[bookId ?? ""].chapter_index;
      setChapterIndex(savedChapter);
    }
  }, []);

  useEffect(() => {
    if (hasRestoredScroll.current || loading || chapters.length === 0) return;
    const p = progress[bookId ?? ""];
    if (p && (p.scroll_position ?? 0) > 0) {
      hasRestoredScroll.current = true;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          y: Number(p.scroll_position),
          animated: false,
        });
      });
    }
  }, [chapters.length, loading, bookId, progress]);

  const loadChapters = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("book_id", bookId)
      .order("chapter_index");
    setChapters(data ?? []);
    setLoading(false);
  };

  const autoHideControls = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      if (user && bookId) {
        updateProgress(user.id, bookId, currentChapterIndex, y, 0);
      }
    },
    [user, bookId, currentChapterIndex]
  );

  const goToChapter = (index: number) => {
    setChapterIndex(index);
    setShowChapters(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (user && bookId) {
      updateProgress(user.id, bookId, index, 0, 0);
    }
  };

  const handleAddBookmark = () => {
    if (!user || !bookId) return;
    addBookmark({
      user_id: user.id,
      book_id: bookId,
      chapter_index: currentChapterIndex,
      character_position: 0,
      label: getBookmarkDisplayLabel(
      `Chapter ${currentChapterIndex + 1} — ${getChapterDisplayTitle(chapter?.title, currentChapterIndex)}`,
      currentChapterIndex
    ),
    });
    Alert.alert("Bookmark added!", `Saved at Chapter ${currentChapterIndex + 1}`);
  };

  const fontFamilies = ["System", "Georgia", "Courier New", "Helvetica"];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ color: mutedColor, marginTop: 12 }}>Loading book...</Text>
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📭</Text>
        <Text style={{ color: textColor, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
          No content found
        </Text>
        <Text style={{ color: mutedColor, textAlign: "center", marginTop: 8 }}>
          This book has no chapters yet.
        </Text>
        <TouchableOpacity onPress={() => router.back()}
          style={{ marginTop: 24, backgroundColor: "#6366f1", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar hidden={!showControls} />

      {/* Top Bar */}
      {showControls && (
        <SafeAreaView style={{ backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: borderColor }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
                {getBookDisplayTitle(book?.title, chapters.length)}
              </Text>
              <Text style={{ color: mutedColor, fontSize: 12 }} numberOfLines={1}>
                {getChapterDisplayTitle(chapter?.title, currentChapterIndex)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleAddBookmark} style={{ marginLeft: 8 }}>
              <Ionicons name="bookmark-outline" size={22} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/player/${bookId}`)} style={{ marginLeft: 12 }}>
              <Ionicons name="headset-outline" size={22} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFontMenu(true)} style={{ marginLeft: 12 }}>
              <Ionicons name="text" size={22} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowChapters(true)} style={{ marginLeft: 12 }}>
              <Ionicons name="list" size={22} color={textColor} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={500}
        onTouchStart={autoHideControls}
        contentContainerStyle={{ padding: 20, paddingBottom: 140 + insets.bottom }}
      >
        <Text style={{
          color: textColor,
          fontSize: settings.fontSize + 4,
          fontWeight: "800",
          marginBottom: 24,
          fontFamily: settings.fontFamily === "System" ? undefined : settings.fontFamily,
          lineHeight: (settings.fontSize + 4) * 1.3,
        }}>
          {decodeEntities(getChapterDisplayTitle(chapter.title, currentChapterIndex))}
        </Text>
        <Text style={{
          color: textColor,
          fontSize: settings.fontSize,
          lineHeight: settings.fontSize * settings.lineHeight,
          fontFamily: settings.fontFamily === "System" ? undefined : settings.fontFamily,
        }}>
          {decodeEntities(stripWebToEpubNav(chapter.content))}
        </Text>
      </ScrollView>

      {/* Bottom Nav */}
      {showControls && (
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          backgroundColor: surfaceColor,
          borderTopWidth: 1, borderTopColor: borderColor,
          paddingBottom: Math.max(insets.bottom, 12) + 20, paddingTop: 12, paddingHorizontal: 24,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}>
          <TouchableOpacity
            onPress={() => currentChapterIndex > 0 && goToChapter(currentChapterIndex - 1)}
            disabled={currentChapterIndex === 0}
            style={{ opacity: currentChapterIndex === 0 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-back" size={28} color={textColor} />
          </TouchableOpacity>

          <Text style={{ color: mutedColor, fontSize: 13 }}>
            {currentChapterIndex + 1} / {chapters.length}
          </Text>

          <TouchableOpacity
            onPress={() => currentChapterIndex < chapters.length - 1 && goToChapter(currentChapterIndex + 1)}
            disabled={currentChapterIndex === chapters.length - 1}
            style={{ opacity: currentChapterIndex === chapters.length - 1 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-forward" size={28} color={textColor} />
          </TouchableOpacity>
        </View>
      )}

      {/* Chapter List Modal */}
      <Modal visible={showChapters} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: surfaceColor, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: textColor, fontSize: 18, fontWeight: "800" }}>Chapters</Text>
              <TouchableOpacity onPress={() => setShowChapters(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={chapters}
              keyExtractor={(_, i) => String(i)}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={10}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => goToChapter(index)}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {index === currentChapterIndex && (
                    <View style={{ width: 4, height: 20, backgroundColor: "#6366f1", borderRadius: 2, marginRight: 10 }} />
                  )}
                  <Text style={{
                    color: index === currentChapterIndex ? "#818cf8" : textColor,
                    fontSize: 15,
                    fontWeight: index === currentChapterIndex ? "700" : "400",
                    flex: 1,
                  }} numberOfLines={1}>
                    {getChapterDisplayTitle(item.title, index)}
                  </Text>
                  <Text style={{ color: mutedColor, fontSize: 12 }}>
                    {Math.round(item.content.length / 250)} min
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Font Settings Modal */}
      <Modal visible={showFontMenu} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: surfaceColor, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: textColor, fontSize: 18, fontWeight: "800" }}>Reading Settings</Text>
              <TouchableOpacity onPress={() => setShowFontMenu(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Theme */}
            <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600", marginBottom: 10 }}>THEME</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {(["dark", "light", "sepia"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => useSettingsStore.getState().updateSetting("theme", t)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
                    backgroundColor: t === "dark" ? "#0f0f1a" : t === "sepia" ? "#f4e8d0" : "#ffffff",
                    borderWidth: 2,
                    borderColor: settings.theme === t ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{
                    color: t === "dark" ? "#e2e8f0" : "#1e293b",
                    fontWeight: "700", fontSize: 13, textTransform: "capitalize",
                  }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Font Size */}
            <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600", marginBottom: 10 }}>
              FONT SIZE — {settings.fontSize}px
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[14, 16, 18, 20, 24, 28].map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => useSettingsStore.getState().updateSetting("fontSize", size)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center",
                    backgroundColor: settings.fontSize === size ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.fontSize === size ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{ color: settings.fontSize === size ? "#fff" : textColor, fontSize: 13 }}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Font Family */}
            <Text style={{ color: mutedColor, fontSize: 13, fontWeight: "600", marginBottom: 10 }}>FONT</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {fontFamilies.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => useSettingsStore.getState().updateSetting("fontFamily", f)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                    backgroundColor: settings.fontFamily === f ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.fontFamily === f ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{
                    color: settings.fontFamily === f ? "#fff" : textColor,
                    fontFamily: f === "System" ? undefined : f,
                    fontSize: 13,
                  }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
