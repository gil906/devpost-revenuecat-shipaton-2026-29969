# Steady

**A little practice for the conversations that matter.**

Steady is a private, English-language workplace rehearsal app for new managers. Practise a difficult conversation in three turns, try different wording, and reflect on how ready you feel. It is built with React, TypeScript, and Capacitor for Android, with a fully functional free browser preview.

## What works

- Three free rehearsals: a missed deadline, an after-hours boundary, and declining extra work.
- Three Plus rehearsals: meeting interruptions, a boundary with your manager, and a disappointing promotion decision.
- Written responses, two authored reactions per turn, transparent wording feedback, and revision before continuing.
- Before/after readiness reflection, the latest 100 completed rehearsals, one resumable draft, journal export, and explicit local deletion.
- Responsive layouts, keyboard controls, modal focus restoration, reduced-motion support, and Android Back navigation.
- Actual RevenueCat Capacitor SDK integration for offerings, one-time purchases, restore, customer-info updates, and refresh on app resume.

**Status:** The production browser app and its behavioral tests work. The Android project is generated and the native SDK is wired, but an APK build, Android device behavior, and real RevenueCat/store transactions have **not** been verified. This repository does not establish a published store release.

## Run the browser preview

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run assets
npm run build
npm start
```

The server binds `0.0.0.0:8764`; `/health` returns a lightweight JSON health response. `PORT` can override the port. No credentials or backend database are needed for the browser preview.

For development, use `npm run dev`. The production server serves only built assets, not source files or environment files. It has no transcript endpoint and writes no request logs.

## Verification

```sh
npm test
npm run build
npm run browser:install
npm run test:e2e
npm run smoke
npm run format:check
```

The browser suite and smoke check each own a temporary server on port 8764 and stop it afterward. Stop an existing local server before running them. Chromium is installed inside `node_modules/.cache`; Linux also needs Playwright's [system dependencies](https://playwright.dev/docs/browsers#install-system-dependencies).

Unit tests cover all authored scenarios, wording signals, corrupt storage, retention, draft recovery, and a **mocked SDK gateway** for purchase, cancellation, pending payment, restore, revocation, and expiry. Browser tests exercise the production build end to end, including offline practice, literal rendering of untrusted text, premium gating, storage failures, export, deletion, keyboard focus, and narrow layouts. Mocked purchase tests are not evidence of a real store transaction.

Test output goes under `APP_DATA_DIR` (default `.runtime`). User practice data stays in device/browser local storage, never in repository files.

## Android and RevenueCat

The checked-in `android/` project uses application ID `com.steadyrehearsal.app`, Capacitor 8, minimum Android API 24, and target API 36. Native compilation requires JDK 21 and Android SDK 36 with the appropriate SDK licenses. In a configured Android development environment:

```sh
npm run assets
npm run android:sync
cd android
./gradlew assembleDebug --no-daemon
```

The debug APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`. An Android instrumentation test also checks the privacy backup setting and purchase-compatible launch mode; it requires a device/emulator and has not been executed here.

### Purchase contract

| Setting | Value |
| --- | --- |
| Public SDK configuration | `VITE_REVENUECAT_ANDROID_API_KEY` |
| Entitlement | `steady_plus` |
| Intended Google Play one-time product | `steady_plus_lifetime` |
| Offering | Current/default offering |
| Package type | RevenueCat lifetime package (`$rc_lifetime`) |
| Benefit | Three additional stretch rehearsals |

The one-time product must be attached to the permanent `steady_plus` entitlement. This is a non-renewing library unlock, not a subscription. Prices are taken from the store's localized `priceString`; no price or trial is hardcoded. Only lifetime, non-subscription packages are offered.

`.env.example` documents the single build-time setting. The client accepts an Android public `goog_...` key or a RevenueCat `test_...` key for Test Store builds. It rejects other key formats before bundling. A secret RevenueCat API key must never be used in a client build. Changing configuration requires rebuilding and syncing the native project; test-store purchases are not production purchases.

The SDK initializes only on Android. Missing configuration leaves free practice available with an explicit message. Access comes from the SDK's active entitlement, not a local paid flag or a purchase-button click. Cancellation, pending approval, and missing entitlement responses do not unlock Plus. Refund/revocation updates gate new premium practice while keeping completed journal entries readable. Foreground refresh and a local expiry check prevent indefinitely retaining an old access decision.

No browser mock-purchase mode, web checkout, subscription, ad SDK, or alternative store integration is implemented.

## How feedback works

`src/coaching.ts` performs deterministic, local phrase checks for:

1. A concrete detail from the selected situation.
2. An acknowledgment phrase.
3. A question or invitation to agree.
4. A proposed action and timing within the same sentence.

Each turn can produce one of two scripted responses. Feedback shows the actual text that triggered a signal and suggestions for missing signals. Labels and absolutes such as "you always" produce a wording caution.

These are **wording signals, not grades**. The app cannot understand intent, assess empathy, predict a colleague's behavior, or verify that an action is appropriate. Good responses can miss checks; superficial responses can match them. The user does not need all four signals at every turn. Readiness is self-reported, not a validated outcome measure.

## Privacy and limitations

Rehearsal text never goes to a model, analytics service, or RevenueCat. The app uses fictional scenarios and encourages fictional details. Local storage is not encrypted by Steady; anyone with access to an unlocked device/profile may be able to read it. The Android manifest disables backup and excludes app data from cloud backup and device transfer.

The Android bundle contains the practice library for offline use. Browser practice works offline **after the page is loaded**; there is no service-worker cache for cold-start offline browsing. Purchases need a network connection and follow the SDK's cache behavior. There is no cloud backup, journal import, account system, or cross-device transcript sync. Browser storage eviction or uninstalling may erase local history.

Steady is not HR, legal, medical, or professional advice. It is not suitable for evaluating employees or making employment decisions. See the in-app explanation, [privacy policy](public/privacy.html), and [terms](public/terms.html).

## Project map

| Path | Purpose |
| --- | --- |
| `src/scenarios.ts` | Six original three-turn situations |
| `src/coaching.ts` | Explainable wording checks |
| `src/storage.ts` | Versioned validation, draft/journal persistence and export |
| `src/billing.ts`, `src/useBilling.ts` | SDK boundary and entitlement lifecycle |
| `src/App.tsx`, `src/styles.css` | Responsive rehearsal and journal interface |
| `android/` | Native shell, plugin wiring and privacy configuration |
| `tests/` | Unit and production-browser behavior tests |
| `server.mjs` | Restricted static preview server and health endpoint |

## Media

The original leaf/conversation icon is generated from `public/icon.svg`. `assets/app-icon-1024.png` is exactly 1024 x 1024. `assets/screenshot-1179x2556.png` and `assets/rehearsal-1179x2556.png` are actual browser-preview captures at exactly 1179 x 2556, without device frames. They are **not native-device or store-release evidence**.

`npm run assets` regenerates icon assets. `npm run test:e2e` captures screenshots under the runtime data directory; `npm run assets:capture` copies those captures into the distributable media directory. Screenshots use only fictional, bundled content.


## Try it out

- [Live application](https://devpost-revenuecat-shipaton-2026-29969.gilbertcv.com)
- [Public source](https://github.com/gil906/devpost-revenuecat-shipaton-2026-29969)
