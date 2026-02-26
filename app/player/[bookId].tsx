import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  useWindowDimensions,
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

function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.filter(Boolean) ?? (text ? [text] : []);
}

function getWordBounds(text: string, charIndex: number): [number, number] {
  if (!text.length) return [0, 0];
  const idx = Math.min(Math.max(0, charIndex), text.length - 1);
  let start = idx;
  while (start > 0 && !/[\s\n]/.test(text[start - 1])) start--;
  let end = idx;
  while (end < text.length && !/[\s\n]/.test(text[end])) end++;
  return [start, end];
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
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 400;
  const contentMaxWidth = Platform.OS === "web" ? 420 : undefined;
  const [loading, setLoading] = useState(true);
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState(0);
  const [showChapters, setShowChapters] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [sleepCountdown, setSleepCountdown] = useState(0);
  const [voices, setVoices] = useState<{ identifier: string; name: string; language: string }[]>([]);
  const sleepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playingRef = useRef(false);
  const restoredPositionRef = useRef(false);
  const isPausedRef = useRef(false);

  const book = books.find((b) => b.id === bookId);
  const chapter = chapters[currentChapterIndex];

  const bgColor = settings.theme === "dark" ? "#0f0f1a" : settings.theme === "sepia" ? "#f4e8d0" : "#f8fafc";
  const textColor = settings.theme === "dark" ? "#e2e8f0" : settings.theme === "sepia" ? "#3d2b1f" : "#1e293b";
  const cardBg = settings.theme === "dark" ? "#1a1a2e" : settings.theme === "sepia" ? "#ede0c4" : "#ffffff";
  const borderColor = settings.theme === "dark" ? "#2d2d4e" : settings.theme === "sepia" ? "#d4b896" : "#e2e8f0";
  const mutedColor = settings.theme === "dark" ? "#94a3b8" : "#64748b";
  const accentColor = "#6366f1";
  const accentMuted = settings.theme === "dark" ? "#818cf8" : "#6366f1";
  const heroBg = settings.theme === "dark" ? "#1e1b4b" : settings.theme === "sepia" ? "#d4c4a8" : "#eef2ff";
  const heroBorder = settings.theme === "dark" ? "#3730a3" : settings.theme === "sepia" ? "#b8a078" : "#c7d2fe";

  useEffect(() => {
    if (!bookId || !user) return;
    fetchBook(bookId);
    loadChapters();
  }, [bookId, user, fetchBook]);

  useEffect(() => {
    if (!chapter) return;
    if (restoredPositionRef.current) {
      restoredPositionRef.current = false;
      return;
    }
    const content = stripWebToEpubNav(chapter.content);
    const c = splitIntoChunks(content, SENTENCE_CHUNK);
    setChunks(c);
    setChunkIndex(0);
    setSentenceIndex(0);
    setCurrentWordCharIndex(0);
  }, [chapter]);

  useEffect(() => {
    return () => {
      NativeTts.stop();
      isPausedRef.current = false;
      setTtsPlaying(false);
      playingRef.current = false;
      if (sleepRef.current) clearInterval(sleepRef.current);
    };
  }, []);

  useEffect(() => {
    NativeTts.getVoices().then((v) =>
      setVoices(v as { identifier: string; name: string; language: string }[])
    );
  }, []);

  const loadChapters = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chapters")
      .select("*")
      .eq("book_id", bookId)
      .order("chapter_index");
    const chapterList = data ?? [];
    setChapters(chapterList);
    const prog = progress[bookId ?? ""];
    const savedChapter = prog?.chapter_index ?? 0;
    const charPos = prog?.character_position ?? 0;
    setChapterIndex(savedChapter);

    if (chapterList.length > 0 && savedChapter < chapterList.length) {
      const ch = chapterList[savedChapter];
      const content = stripWebToEpubNav(ch.content);
      const chunkList = splitIntoChunks(content, SENTENCE_CHUNK);
      let accum = 0;
      let foundChunk = 0;
      let foundSentence = 0;
      for (let i = 0; i < chunkList.length; i++) {
        const chunkLen = chunkList[i].length;
        if (accum + chunkLen > charPos) {
          foundChunk = i;
          const sentences = splitIntoSentences(chunkList[i]);
          let sentAccum = 0;
          for (let j = 0; j < sentences.length; j++) {
            if (sentAccum + sentences[j].length > charPos - accum) {
              foundSentence = j;
              break;
            }
            sentAccum += sentences[j].length;
          }
          break;
        }
        accum += chunkLen;
      }
      setChunks(chunkList);
      setChunkIndex(foundChunk);
      setSentenceIndex(foundSentence);
      if (charPos > 0) restoredPositionRef.current = true;
    }
    setLoading(false);
  };

  const speakChunkRef = useRef<(idx: number, chunkList: string[]) => void>(() => {});

  const speakSentence = useCallback(
    (sentIdx: number, sentences: string[], chunkIdx: number, chunkList: string[]) => {
      if (sentIdx >= sentences.length) {
        if (playingRef.current) {
          const chunkOffset = chunkList.slice(0, chunkIdx + 1).join("").length;
          if (user && bookId) {
            updateProgress(user.id, bookId, {
              chapter_index: currentChapterIndex,
              character_position: chunkOffset,
            });
          }
          speakChunkRef.current(chunkIdx + 1, chunkList);
        }
        return;
      }
      setSentenceIndex(sentIdx);
      setCurrentWordCharIndex(0);
      const sentence = sentences[sentIdx];
      NativeTts.speak(sentence, {
        rate: settings.ttsSpeed,
        pitch: settings.ttsPitch,
        voice: settings.ttsVoice || undefined,
        onBoundary: (e) => setCurrentWordCharIndex(e.charIndex),
        onDone: () => {
          if (playingRef.current) {
            const chunkOffset = chunkList.slice(0, chunkIdx).join("").length;
            const sentOffset = sentences.slice(0, sentIdx + 1).join("").length;
            const charPos = chunkOffset + sentOffset;
            if (user && bookId) {
              updateProgress(user.id, bookId, {
                chapter_index: currentChapterIndex,
                character_position: charPos,
              });
            }
            speakSentence(sentIdx + 1, sentences, chunkIdx, chunkList);
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
    [settings, user, bookId, currentChapterIndex, updateProgress]
  );

  const speakChunk = useCallback(
    (idx: number, chunkList: string[], startSentIdx = 0) => {
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
      setSentenceIndex(startSentIdx);
      setCurrentWordCharIndex(0);
      const sentences = splitIntoSentences(chunkList[idx]);
      if (sentences.length === 0) {
        speakChunk(idx + 1, chunkList);
        return;
      }
      speakSentence(Math.min(startSentIdx, sentences.length - 1), sentences, idx, chunkList);
    },
    [currentChapterIndex, chapters.length, speakSentence, user, bookId, updateProgress]
  );

  speakChunkRef.current = speakChunk;

  const handlePlay = () => {
    if (!chunks.length) return;
    if (isPausedRef.current) {
      // Resume from exact position (iOS/Web support native pause/resume)
      if (Platform.OS === "web" || Platform.OS === "ios") {
        NativeTts.resume();
        setTtsPlaying(true);
        isPausedRef.current = false;
        return;
      }
      // Android: pause/resume not supported, restart from current sentence
      playingRef.current = true;
      setTtsPlaying(true);
      isPausedRef.current = false;
      speakChunk(chunkIndex, chunks, sentenceIndex);
      return;
    }
    playingRef.current = true;
    setTtsPlaying(true);
    speakChunk(chunkIndex, chunks);
  };

  const handlePause = () => {
    if (Platform.OS === "web" || Platform.OS === "ios") {
      NativeTts.pause();
      isPausedRef.current = true;
      setTtsPlaying(false);
      // Save progress when pausing so Supabase stays in sync
      if (user && bookId && chunks.length) {
        const chunkOffset = chunks.slice(0, chunkIndex).join("").length;
        const sentences = splitIntoSentences(chunks[chunkIndex] ?? "");
        const sentOffset = sentences.slice(0, sentenceIndex).join("").length;
        const charPos = chunkOffset + sentOffset + currentWordCharIndex;
        updateProgress(user.id, bookId, {
          chapter_index: currentChapterIndex,
          character_position: charPos,
        });
      }
      return;
    }
    // Android: use stop + remember position; resume will restart from sentenceIndex
    NativeTts.stop();
    isPausedRef.current = true;
    setTtsPlaying(false);
    if (user && bookId && chunks.length) {
      const chunkOffset = chunks.slice(0, chunkIndex).join("").length;
      const sentences = splitIntoSentences(chunks[chunkIndex] ?? "");
      const sentOffset = sentences.slice(0, sentenceIndex).join("").length;
      const charPos = chunkOffset + sentOffset + currentWordCharIndex;
      updateProgress(user.id, bookId, {
        chapter_index: currentChapterIndex,
        character_position: charPos,
      });
    }
  };

  const handleStop = () => {
    NativeTts.stop();
    isPausedRef.current = false;
    setTtsPlaying(false);
    playingRef.current = false;
    setChunkIndex(0);
    setSentenceIndex(0);
    setCurrentWordCharIndex(0);
  };

  const handleRewind = () => {
    NativeTts.stop();
    isPausedRef.current = false;
    playingRef.current = false;
    setTtsPlaying(false);
    const newIdx = Math.max(0, chunkIndex - 3);
    setChunkIndex(newIdx);
    setSentenceIndex(0);
    setCurrentWordCharIndex(0);
  };

  const handleSkip = () => {
    NativeTts.stop();
    isPausedRef.current = false;
    playingRef.current = false;
    setTtsPlaying(false);
    const newIdx = Math.min(chunks.length - 1, chunkIndex + 3);
    setChunkIndex(newIdx);
    setSentenceIndex(0);
    setCurrentWordCharIndex(0);
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
        <ActivityIndicator size="large" color={accentColor} />
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
        <TouchableOpacity
          onPress={() => {
            handleStop();
            router.replace("/(tabs)/library");
          }}
          style={{ marginRight: 12, padding: 8, zIndex: 10 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
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
        <TouchableOpacity onPress={() => setShowSleepTimer(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="moon-outline" size={22} color={sleepCountdown > 0 ? accentMuted : textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          { padding: isNarrow ? 16 : 24, paddingBottom: (isNarrow ? 16 : 24) + insets.bottom },
          contentMaxWidth && { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" },
        ]}
      >
        {/* Book art / chapter info */}
        <View style={{
          backgroundColor: heroBg,
          borderRadius: 20,
          height: isNarrow ? 160 : 200,
          marginBottom: isNarrow ? 20 : 24,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: heroBorder,
        }}>
          <Text style={{ fontSize: isNarrow ? 48 : 64 }}>🎧</Text>
          <Text style={{ color: accentMuted, fontWeight: "700", fontSize: isNarrow ? 14 : 16, marginTop: 8 }}>
            {getChapterDisplayTitle(chapter?.title, currentChapterIndex)}
          </Text>
          <Text style={{ color: accentColor, fontSize: 12, marginTop: 4 }}>
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </Text>
        </View>

        {/* Current segment with word highlight */}
        <View style={{
          backgroundColor: cardBg, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor, marginBottom: 24, minHeight: 100,
        }}>
          {chunks[chunkIndex] ? (() => {
            const sentences = splitIntoSentences(chunks[chunkIndex]);
            const highlightBg = settings.theme === "dark" ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)";
            const safeSentIdx = Math.min(sentenceIndex, sentences.length - 1);
            const beforeSentences = sentences.slice(0, safeSentIdx).join("");
            const currentSentence = sentences[safeSentIdx] ?? "";
            const afterSentences = sentences.slice(safeSentIdx + 1).join("");
            const [wordStart, wordEnd] = getWordBounds(currentSentence, currentWordCharIndex);
            const beforeWord = currentSentence.slice(0, wordStart);
            const highlightedWord = currentSentence.slice(wordStart, wordEnd);
            const afterWord = currentSentence.slice(wordEnd);
            return (
              <Text style={{ color: textColor, fontSize: 15, lineHeight: 24 }}>
                {beforeSentences}
                {beforeWord}
                <Text style={{ backgroundColor: highlightBg, borderRadius: 2 }}>{highlightedWord}</Text>
                {afterWord}
                {afterSentences}
              </Text>
            );
          })() : null}
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ height: 4, backgroundColor: borderColor, borderRadius: 2 }}>
            <View style={{ height: 4, width: `${progress_pct}%`, backgroundColor: accentColor, borderRadius: 2 }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ color: mutedColor, fontSize: 12 }}>Part {chunkIndex + 1} of {chunks.length}</Text>
            {sleepCountdown > 0 && (
              <Text style={{ color: accentMuted, fontSize: 12 }}>
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
            <Ionicons name="list" size={16} color={accentMuted} />
            <Text style={{ color: accentMuted, fontSize: 13, fontWeight: "600" }}>Chapters</Text>
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

        {/* Main playback controls - 44pt min touch targets for iOS */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          marginBottom: 32,
          paddingVertical: 8,
        }}>
          <TouchableOpacity
            onPress={handleRewind}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{ padding: 12, minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="play-back" size={32} color={textColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isTtsPlaying ? handlePause : handlePlay}
            activeOpacity={0.85}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: accentColor,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: accentColor,
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Ionicons name={isTtsPlaying ? "pause" : "play"} size={34} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{ padding: 12, minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="play-forward" size={32} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Speed & Pitch */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor, gap: 16 }}>
          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: textColor, fontWeight: "600" }}>Speed</Text>
              <Text style={{ color: accentMuted, fontWeight: "700" }}>{settings.ttsSpeed.toFixed(1)}x</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => updateSetting("ttsSpeed", s)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
                    backgroundColor: settings.ttsSpeed === s ? accentColor : bgColor,
                    borderWidth: 1, borderColor: settings.ttsSpeed === s ? accentColor : borderColor,
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
              <Text style={{ color: accentMuted, fontWeight: "700" }}>{settings.ttsPitch.toFixed(1)}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => updateSetting("ttsPitch", p)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
                    backgroundColor: settings.ttsPitch === p ? accentColor : bgColor,
                    borderWidth: 1, borderColor: settings.ttsPitch === p ? accentColor : borderColor,
                  }}
                >
                  <Text style={{ color: settings.ttsPitch === p ? "#fff" : mutedColor, fontSize: 12, fontWeight: "600" }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {settings.ttsEngine === "native" && voices.length > 0 && (
            <View>
              <Text style={{ color: textColor, fontWeight: "600", marginBottom: 8 }}>Voice</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                {voices.slice(0, 12).map((v) => (
                  <TouchableOpacity
                    key={v.identifier}
                    onPress={() => updateSetting("ttsVoice", v.identifier)}
                    style={{
                      marginHorizontal: 4,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: settings.ttsVoice === v.identifier ? accentColor : bgColor,
                      borderWidth: 1,
                      borderColor: settings.ttsVoice === v.identifier ? accentColor : borderColor,
                    }}
                  >
                    <Text
                      style={{
                        color: settings.ttsVoice === v.identifier ? "#fff" : mutedColor,
                        fontSize: 12,
                      }}
                      numberOfLines={1}
                    >
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {settings.ttsEngine === "elevenlabs" && (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/settings")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="settings-outline" size={18} color={accentMuted} />
              <Text style={{ color: accentMuted, fontSize: 14, fontWeight: "600" }}>
                Change voice in Settings
              </Text>
            </TouchableOpacity>
          )}
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
                    <Ionicons name="volume-high" size={16} color={accentMuted} />
                  )}
                  <Text style={{
                    color: index === currentChapterIndex ? accentMuted : textColor,
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
