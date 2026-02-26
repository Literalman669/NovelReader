# AGENTS.md

## Cursor Cloud specific instructions

### Overview

NovelReader is an Expo (React Native) cross-platform novel reader app. In the cloud VM, it runs in **web mode** only (`npx expo start --web`). See `README.md` for full feature list and project structure.

### Running the app

```bash
npx expo start --web --port 8081
```

The web app serves on `http://localhost:8081`. The app requires valid Supabase credentials in `.env` (see `.env.example`). The secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are injected as environment variables — create `.env` from them before starting.

### Type checking

```bash
npx tsc --noEmit
```

No ESLint config exists in this project. TypeScript strict mode is the primary static analysis tool.

### Testing

Playwright is a devDependency but **no test files exist yet**. There is no Jest/Vitest configuration. No `test` script in `package.json`.

### Key caveats

- `package-lock.json` may be out of sync with `package.json`. Use `npm install` (not `npm ci`) for dependency installation.
- The Supabase backend is **cloud-hosted** (not local). There is no `supabase/config.toml` for local dev. All auth/data flows require network access to the Supabase project.
- Supabase free tier has strict email rate limits for signup. If testing registration, use an already-verified account.
- The `.env` file is gitignored; it must be regenerated from environment secrets each session.
- Metro config includes a Zustand CJS workaround for web platform (`metro.config.js`).
