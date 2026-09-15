# Steady - Find your words. Keep your calm.

## Inspiration

A new manager can read all the advice about difficult conversations and still freeze at the first sentence. We wanted to make the space between knowing and doing smaller: a private place to try a conversation before another person is depending on it.

Steady is built around a simple idea: confidence is not a perfect script. It is having practised being clear, curious, and kind when the conversation gets uncomfortable.

## What it does

Steady turns a realistic workplace situation into a short, active rehearsal. You meet a fictional colleague, set an intention, and reflect on your readiness. Then you write what you would actually say across three turns: opening the conversation, responding to pushback, and agreeing on a next step.

After each response, the app shows an authored reaction and concrete wording signals. You can revise immediately, see one possible approach, or continue. At the end, you reflect again and save the rehearsal in a private, on-device journal.

The foundation library covers a missed deadline, after-hours messages, and saying no to extra scope. Steady Plus adds meeting interruptions, an upward boundary, and a promotion disappointment. Journal review, draft recovery, export, and deletion are free.

## Who it serves and challenge fit

The intended category is **Influencer Award - Career Coaching**. Steady serves new managers who need active practice with feedback, boundaries, and saying no, rather than another library of passive advice.

The situations are grounded in specific events and realistic pushback. The experience encourages trying different words without treating uncertainty as failure. No influencer likeness, voice, branding, or endorsement is used.

## How it is built

The interface uses React and TypeScript, packaged for Android with Capacitor. The same interface provides a runnable browser preview. Practice content and feedback are local; there is no model API, transcript upload, or analytics pipeline.

The feedback engine deliberately makes modest claims. It checks for a situation detail, acknowledgment, a question, and an action with timing, then displays the evidence for those checks. Two authored reactions per turn make practice responsive without pretending to understand a person. These are wording signals, not a validated assessment.

Saved data is versioned and validated. Corrupted data is preserved for recovery rather than silently overwritten. Storage failures are visible. Android backup and device-transfer exclusions support the on-device privacy model.

## RevenueCat and monetization

The actual RevenueCat Capacitor SDK is integrated for Android configuration, current offerings, a lifetime package purchase, restore, customer-info listeners, and refresh when the app returns to the foreground.

The model is a one-time **Steady Plus** library unlock through the `steady_plus` entitlement. The three foundation rehearsals and all journal tools stay free. This ties payment to additional practice material instead of charging people to retrieve their own words. There is no recurring subscription or artificially limited number of free attempts.

Localized prices come from the store. Only an active SDK entitlement unlocks premium rehearsals; cancellation, pending approval, or a missing entitlement does not. The browser preview never offers a pretend checkout.

The store connection has not yet been exercised with a real configured RevenueCat project. There are no claimed purchases, users, revenue, conversion figures, or live monetization results.

## Design

Warm neutral surfaces, sage accents, simple original conversation/leaf illustrations, and restrained typography make the rehearsal room feel less like a performance review. Readiness is explicitly personal and can move in either direction. There are no streak penalties, leaderboards, or empathy scores.

The interface adapts from desktop navigation to a mobile bottom bar. It includes visible keyboard focus, dialog focus restoration, labeled inputs, and reduced-motion support.

## What was difficult

The central trade-off was useful feedback without false authority. A lightweight local checker can provide immediate, inspectable suggestions, but it cannot evaluate intent or workplace context. We made that limitation visible and separated practice from assessment.

Purchase behavior required a separate boundary: free browser use must remain useful without simulating successful store purchases. The Android integration therefore gets access only from RevenueCat's entitlement state.

## Accomplishments

A complete three-turn rehearsal is implemented end to end, including revision, progress recovery, local reflection, review, export, and deletion. Automated coverage exercises the production browser interface as well as the local coaching, journal, and SDK gateway behavior.

The original icon and frame-free browser screenshots are included at the requested dimensions. The app has no runtime dependency on a language model or paid inference service.

## What we learned

Showing someone exactly why a suggestion appeared is more honest than assigning a confident-sounding score. A respectful practice tool can encourage a next attempt without claiming to measure a manager's ability.

## Current availability and limitations

The free browser preview is functional. The Android native project and RevenueCat integration are present, but APK compilation, device testing, and live store transactions are unverified. No published store listing or public native-device demo video is supplied with this draft. The supplied screenshots are labeled browser-preview captures and do not establish store-release eligibility.

Steady is English-only, local-only, and intended for fictional practice, not confidential records or formal employment decisions. More authored situations and feedback informed by voluntary usability research are possible future extensions, not existing capabilities.

## Built with

React, TypeScript, Vite, Capacitor Android, RevenueCat Purchases SDK, Vitest, Playwright, Node.js, and Sharp.

## Included media

- [Original 1024 x 1024 app icon](assets/app-icon-1024.png)
- [1179 x 2556 browser home screenshot](assets/screenshot-1179x2556.png)
- [1179 x 2556 browser rehearsal screenshot](assets/rehearsal-1179x2556.png)
