import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useReaderStore } from "@/stores/readerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { NativeTts } from "@/lib/tts";
import { supabase } from "@/lib/supabase";
import { stripWebToEpubNav, getChapterDisplayTitle, getBookDisplayTitle } from "@/lib/content-utils";

const SENTENCE_CHUNK = 500;

function splitIntoChunks(text: string, size: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > size && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export default function PlayerScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { user } = useAuthStore();
  const { books, progress, updateProgress, fetchBook } = useLibraryStore();
  const { settings, updateSetting } = useSettingsStore();
  const {
    chapters, setChapters, currentChapterIndex, setChapterIndex,
    isTtsPlaying, setTtsPlaying, sleepTimerMinutes, setSleepTimer,
  } = useReaderStore();

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [showChapters, setShowChapters] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [sleepCountdown, setSleepCountdown] = useState(0);
  const sleepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playingRef = useRef(false);

  const book = books.find((b) => b.id === bookId);
  const chapter = chapters[currentChapterIndex];

  const bgColor = settings.theme === "dark" ? "#0f0f1a" : settings.theme === "sepia" ? "#f4e8d0" : "#f8fafc";
  const textColor = settings.theme === "dark" ? "#e2e8f0" : settings.theme === "sepia" ? "#3d2b1f" : "#1e293b";
  const cardBg = settings.theme === "dark" ? "#1a1a2e" : settings.theme === "sepia" ? "#ede0c4" : "#ffffff";
  const borderColor = settings.theme === "dark" ? "#2d2d4e" : settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const mutedColor = settings.theme === "dark" ? "#94a3b8" : "#64748b";

  useEffect(() => {
    if (!bookId || !user) return;
    fetchBook(bookId);
    loadChapters();
  }, [bookId, user, fetchBook]);

  useEffect(() => {
    if (chapter) {
      const content = stripWebToEpubNav(chapter.content);
      const c = splitIntoChunks(content, SENTENCE_CHUNK);
      setChunks(c);
      setChunkIndex(0);
    }
  }, [chapter]);

  useEffect(() => {
    return () => {
      NativeTts.stop();
      setTtsPlaying(false);
      playingRef.current = false;
      if (sleepRef.current) clearInterval(sleepRef.current);
    };
  }, []);

  const loadChapters = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("book_id", bookId)
      .order("chapter_index");
    setChapters(data ?? []);
    const saved = progress[bookId ?? ""]?.chapter_index ?? 0;
    setChapterIndex(saved);
    setLoading(false);
  };

  const speakChunk = useCallback(
    (idx: number, chunkList: string[]) => {
      if (idx >= chunkList.length) {
        if (currentChapterIndex < chapters.length - 1) {
          const nextChapter = currentChapterIndex + 1;
          setChapterIndex(nextChapter);
          if (user && bookId) updateProgress(user.id, bookId, nextChapter, 0, 0);
        } else {
          setTtsPlaying(false);
          playingRef.current = false;
        }
        return;
      }
      setChunkIndex(idx);
      NativeTts.speak(chunkList[idx], {
        rate: settings.ttsSpeed,
        pitch: settings.ttsPitch,
        voice: settings.ttsVoice || undefined,
        onDone: () => {
          if (playingRef.current) {
            speakChunk(idx + 1, chunkList);
          }
        },
        onStopped: () => {
          setTtsPlaying(false);
          playingRef.current = false;
        },
        onError: (err) => {
          console.warn("TTS error:", err);
          setTtsPlaying(false);
          playingRef.current = false;
        },
      });
    },
    [currentChapterIndex, chapters.length, settings, user, bookId]
  );

  const handlePlay = () => {
    if (!chunks.length) return;
    playingRef.current = true;
    setTtsPlaying(true);
    speakChunk(chunkIndex, chunks);
  };

  const handlePause = () => {
    NativeTts.stop();
    setTtsPlaying(false);
    playingRef.current = false;
  };

  const handleStop = () => {
    NativeTts.stop();
    setTtsPlaying(false);
    playingRef.current = false;
    setChunkIndex(0);
  };

  const handleRewind = () => {
    NativeTts.stop();
    playingRef.current = false;
    setTtsPlaying(false);
    const newIdx = Math.max(0, chunkIndex - 3);
    setChunkIndex(newIdx);
  };

  const handleSkip = () => {
    NativeTts.stop();
    playingRef.current = false;
    setTtsPlaying(false);
    const newIdx = Math.min(chunks.length - 1, chunkIndex + 3);
    setChunkIndex(newIdx);
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      handleStop();
      const idx = currentChapterIndex - 1;
      setChapterIndex(idx);
      if (user && bookId) updateProgress(user.id, bookId, idx, 0, 0);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      handleStop();
      const idx = currentChapterIndex + 1;
      setChapterIndex(idx);
      if (user && bookId) updateProgress(user.id, bookId, idx, 0, 0);
    }
  };

  const startSleepTimer = (minutes: number) => {
    if (sleepRef.current) clearInterval(sleepRef.current);
    setSleepTimer(minutes);
    setSleepCountdown(minutes * 60);
    setShowSleepTimer(false);
    if (minutes === 0) return;

    sleepRef.current = setInterval(() => {
      setSleepCountdown((prev) => {
        if (prev <= 1) {
          if (sleepRef.current) clearInterval(sleepRef.current);
          handleStop();
          setSleepTimer(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress_pct = chunks.length > 0 ? (chunkIndex / chunks.length) * 100 : 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-down" size={26} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: mutedColor, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
            Now Listening
          </Text>
          <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
            {getBookDisplayTitle(book?.title, chapters.length)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowSleepTimer(true)}>
          <Ionicons name="moon-outline" size={22} color={sleepCountdown > 0 ? "#818cf8" : textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 24 + insets.bottom }}>
        {/* Book art / chapter info */}
        <View style={{
          backgroundColor: "#1e1b4b",
          borderRadius: 20,
          height: 200,
          marginBottom: 24,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#3730a3",
        }}>
          <Text style={{ fontSize: 64 }}>🎧</Text>
          <Text style={{ color: "#a5b4fc", fontWeight: "700", fontSize: 16, marginTop: 8 }}>
            {getChapterDisplayTitle(chapter?.title, currentChapterIndex)}
          </Text>
          <Text style={{ color: "#6366f1", fontSize: 13, marginTop: 4 }}>
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </Text>
        </View>

        {/* Current text preview */}
        <View style={{
          backgroundColor: cardBg, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor, marginBottom: 24, minHeight: 80,
        }}>
          <Text style={{ color: textColor, fontSize: 15, lineHeight: 24 }} numberOfLines={4}>
            {chunks[chunkIndex] ?? ""}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ height: 4, backgroundColor: borderColor, borderRadius: 2 }}>
            <View style={{ height: 4, width: `${progress_pct}%`, backgroundColor: "#6366f1", borderRadius: 2 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ color: mutedColor, fontSize: 12 }}>{chunkIndex + 1} / {chunks.length} segments</Text>
            {sleepCountdown > 0 && (
              <Text style={{ color: "#818cf8", fontSize: 12 }}>
                Sleep: {formatTime(sleepCountdown)}
              </Text>
            )}
          </View>
        </View>

        {/* Chapter nav */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={handlePrevChapter}
            disabled={currentChapterIndex === 0}
            style={{ opacity: currentChapterIndex === 0 ? 0.3 : 1, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons name="play-skip-back" size={16} color={textColor} />
            <Text style={{ color: textColor, fontSize: 13 }}>Prev Ch.</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowChapters(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="list" size={16} color="#818cf8" />
            <Text style={{ color: "#818cf8", fontSize: 13, fontWeight: "600" }}>Chapters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            style={{ opacity: currentChapterIndex === chapters.length - 1 ? 0.3 : 1, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={{ color: textColor, fontSize: 13 }}>Next Ch.</Text>
            <Ionicons name="play-skip-forward" size={16} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Main playback controls */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginBottom: 32 }}>
          <TouchableOpacity onPress={handleRewind}>
            <Ionicons name="play-back" size={32} color={textColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isTtsPlaying ? handlePause : handlePlay}
            style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center",
              shadowColor: "#6366f1", shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
            }}
          >
            <Ionicons name={isTtsPlaying ? "pause" : "play"} size={34} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip}>
            <Ionicons name="play-forward" size={32} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Speed & Pitch */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor, gap: 16 }}>
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: textColor, fontWeight: "600" }}>Speed</Text>
              <Text style={{ color: "#818cf8", fontWeight: "700" }}>{settings.ttsSpeed.toFixed(1)}x</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => updateSetting("ttsSpeed", s)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
                    backgroundColor: settings.ttsSpeed === s ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.ttsSpeed === s ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{ color: settings.ttsSpeed === s ? "#fff" : mutedColor, fontSize: 12, fontWeight: "600" }}>
                    {s}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: textColor, fontWeight: "600" }}>Pitch</Text>
              <Text style={{ color: "#818cf8", fontWeight: "700" }}>{settings.ttsPitch.toFixed(1)}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => updateSetting("ttsPitch", p)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
                    backgroundColor: settings.ttsPitch === p ? "#6366f1" : bgColor,
                    borderWidth: 1, borderColor: settings.ttsPitch === p ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{ color: settings.ttsPitch === p ? "#fff" : mutedColor, fontSize: 12, fontWeight: "600" }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Chapter List Modal */}
      <Modal visible={showChapters} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", padding: 20 }}>
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
                  onPress={() => {
                    handleStop();
                    setChapterIndex(index);
                    setShowChapters(false);
                    if (user && bookId) updateProgress(user.id, bookId, index, 0, 0);
                  }}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: borderColor,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  {index === currentChapterIndex && (
                    <Ionicons name="volume-high" size={16} color="#818cf8" />
                  )}
                  <Text style={{
                    color: index === currentChapterIndex ? "#818cf8" : textColor,
                    fontSize: 15,
                    fontWeight: index === currentChapterIndex ? "700" : "400",
                    flex: 1,
                  }}>
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

      {/* Sleep Timer Modal */}
      <Modal visible={showSleepTimer} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: textColor, fontSize: 18, fontWeight: "800" }}>Sleep Timer</Text>
              <TouchableOpacity onPress={() => setShowSleepTimer(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              {[0, 5, 10, 15, 20, 30, 45, 60].map((min) => (
                <TouchableOpacity
                  key={min}
                  onPress={() => startSleepTimer(min)}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
                    backgroundColor: sleepTimerMinutes === min && min > 0 ? "#6366f1" : cardBg,
                    borderWidth: 1, borderColor: sleepTimerMinutes === min && min > 0 ? "#6366f1" : borderColor,
                  }}
                >
                  <Text style={{
                    color: sleepTimerMinutes === min && min > 0 ? "#fff" : textColor,
                    fontWeight: "600", fontSize: 15,
                  }}>
                    {min === 0 ? "Off" : `${min} min`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {sleepCountdown > 0 && (
              <Text style={{ color: "#818cf8", fontSize: 15, textAlign: "center", fontWeight: "600" }}>
                Stops in {formatTime(sleepCountdown)}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
