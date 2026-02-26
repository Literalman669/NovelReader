# NovelReader 📖

A cross-platform light novel / web novel reader app built with **Expo (React Native)** and **Supabase**.

Runs on **iPhone (via Expo Go)**, **Android**, and **Web/PC**.

---

## Features

- **Multi-user accounts** — register, login, per-user data
- **Import books** — EPUB, TXT, PDF, HTML files + URL import
- **Reader** — scroll mode, dark/light/sepia themes, font size, font family
- **TTS Player** — device native TTS (offline) + ElevenLabs AI voices (online)
  - Play/pause/stop, rewind/skip, speed control, pitch control
  - Sleep timer (5–60 min)
  - Chapter navigation
- **Bookmarks** — save positions, add notes
- **Highlights** — highlight text passages with color + notes
- **Reading progress sync** — synced across all your devices via Supabase
- **Offline support** — SQLite local cache, works without internet
- **Library management** — grid/list view, search, sort, tags
- **Discover tab** — import from RoyalRoad, Scribble Hub, Wuxia World, etc.
- **Settings** — per-user preferences synced to cloud

---

## Setup

### 1. Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/client) installed on your iPhone
- A free [Supabase](https://supabase.com) account

### 2. Install dependencies

```bash
cd NovelReader
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Once created, go to **SQL Editor** → paste the contents of `supabase/migrations/001_init.sql` → Run
3. Go to **Settings → API** → copy:
   - **Project URL**
   - **anon / public key**

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_ELEVENLABS_API_KEY=  # optional, leave blank to use device TTS only
```

### 5. Run the app

```bash
npx expo start
```

- **iPhone**: Scan the QR code with the Expo Go app
- **Web/PC**: Press `w` in the terminal to open in browser
- **Android**: Press `a` or scan with Expo Go

---

## TTS Setup

### Device Native (default, free, offline)
Works immediately — no setup needed. Uses your device's built-in voices.

### ElevenLabs AI Voices (optional, online)
1. Sign up at [elevenlabs.io](https://elevenlabs.io) (free tier: 10k chars/month)
2. Go to **Profile → API Key** → copy it
3. In the app: **Settings → TTS Engine → ElevenLabs** → paste API key → Save

---

## Project Structure

```
NovelReader/
├── app/
│   ├── _layout.tsx          # Root layout, auth listener
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── library.tsx      # Main book library
│   │   ├── discover.tsx     # URL import + sources
│   │   ├── bookmarks.tsx    # Saved bookmarks
│   │   └── settings.tsx     # User settings
│   ├── reader/[bookId].tsx  # Full reader screen
│   └── player/[bookId].tsx  # TTS audio player screen
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── tts.ts               # Native + ElevenLabs TTS
│   ├── importers.ts         # File + URL parsers
│   └── offline.ts           # SQLite offline DB
├── stores/
│   ├── authStore.ts         # Auth state (Zustand)
│   ├── libraryStore.ts      # Books + progress
│   ├── readerStore.ts       # Reader + bookmarks + highlights
│   └── settingsStore.ts     # User preferences
├── types/
│   └── database.ts          # Supabase TypeScript types
└── supabase/
    └── migrations/
        └── 001_init.sql     # Full DB schema (run this in Supabase)
```

---

## Adding More Features Later

Things that can be added in future sessions:
- Series/shelf grouping
- Reading statistics (words/day, time spent)
- Custom TTS voices upload
- iCloud / Google Drive sync for files
- Background audio playback (requires EAS build, not Expo Go)
- Push notifications for new chapters
- Social features (shared shelves, reviews)
