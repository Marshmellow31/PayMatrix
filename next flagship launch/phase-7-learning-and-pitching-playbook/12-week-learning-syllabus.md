# Phase 7: The 3-Month SDE Learning Syllabus (12 Weeks)

> **Audience:** Harshil Patel (B.Tech CSE, IIIT Vadodara)  
> **Objective:** Master every technology and pattern in PayMatrix v3 to prepare for top-tier SDE internship and full-time technical interviews  
> **Key Focus Areas:** React 19, Framer Motion, Web Audio, Kotlin Coroutines, Jetpack Compose, Jetpack Glance, WorkManager, ISO Currency Math, System Design

---

## Month 1: Frontend Delight, Animation Physics & Internationalization

### Week 1: Advanced React 19 & Framer Motion Physics
- **Core Concepts:**
  - React 19 `useTransition`, `useOptimistic`, and Actions.
  - Spring-mass-damper physics equations ($F = -kx - cv$) in UI design.
  - Framer Motion `layoutId` shared element transitions and gesture drags.
- **Hands-on Coding Project:**
  - Build a standalone interactive component library featuring the 3D push-down chunky button and swipeable list card with haptic spring release.
- **Interview Talking Point:**
  - *"How do spring physics improve user trust in financial interfaces compared to linear CSS bezier curves?"*

### Week 2: Web Audio API & Sound Design Synthesis
- **Core Concepts:**
  - `AudioContext`, `AudioBufferSourceNode`, oscillator nodes, gain ramps.
  - Mitigating browser autoplay policies via lazy audio unlock on first user gesture.
  - Zero-latency audio sprite loading vs synthesized audio oscillators.
- **Hands-on Coding Project:**
  - Build `soundEngine.js` from scratch with synthesized `pop` and `coin drop` audio.
- **Interview Talking Point:**
  - *"Why are HTML5 `<audio>` elements insufficient for game-like micro-interactions, and how does the Web Audio API achieve sub-15ms auditory feedback?"*

### Week 3: Canvas Particle Physics & Delight Engines
- **Core Concepts:**
  - HTML5 2D Canvas render loop (`requestAnimationFrame`).
  - Particle velocity vectors, gravity, drag, and rotation.
  - Offscreen canvas rendering and memory management to prevent memory leaks.
- **Hands-on Coding Project:**
  - Build the settlement victory screen: confetti explosion with vector mascot celebration.
- **Interview Talking Point:**
  - *"How to manage 60 FPS particle systems on low-end mobile web browsers without causing garbage collection frame drops."*

### Week 4: ISO 4217 Subunit Arithmetic & Hare-Niemeyer Algorithm
- **Core Concepts:**
  - IEEE 754 floating-point representation and rounding traps.
  - Integer subunit representation (cents, paise, fils).
  - Proportional division algorithms: Hare-Niemeyer (Largest Remainder) vs D'Hondt method.
- **Hands-on Coding Project:**
  - Write 30 exhaustive unit tests in Vitest covering 0-decimal (JPY), 2-decimal (USD), and 3-decimal (KWD) currency splits.
- **Interview Talking Point:**
  - *"How do you guarantee that a \$100.00 bill split among 3 people never creates or loses a single cent across currency conversions?"*

---

## Month 2: Native Android Masterclass (Compose, Glance & WorkManager)

### Week 5: Jetpack Compose Custom Modifiers & Canvas
- **Core Concepts:**
  - Compose composition, layout, and draw phases.
  - `pointerInput` and custom gesture detection.
  - `graphicsLayer` hardware acceleration and render-invalidation optimization.
- **Hands-on Coding Project:**
  - Implement `bouncyClickable` and `ChunkyButton` in Compose with Material3 dynamic color tokens.
- **Interview Talking Point:**
  - *"How does Compose handle recomposition skipping, and why is `graphicsLayer` preferred for spring animations over layout modifications?"*

### Week 6: Low-Latency SoundPool & Vibration Waveforms
- **Core Concepts:**
  - `SoundPool` native audio architecture vs `MediaPlayer`.
  - Android 12+ `VibratorManager` and `CombinedVibration` waveforms.
  - Managing audio lifecycle across activity pause/resume.
- **Hands-on Coding Project:**
  - Build `SoundManager` and `HapticHelper` in Kotlin and bind them to Compose buttons.
- **Interview Talking Point:**
  - *"How does the Android audio server manage low-latency streams, and what are the audio focus implications?"*

### Week 7: Jetpack Compose Glance Home Screen Widgets
- **Core Concepts:**
  - Glance declarative UI tree vs legacy `RemoteViews`.
  - `GlanceAppWidgetReceiver` and widget lifecycle callbacks.
  - State management via DataStore and inter-process communication (IPC).
- **Hands-on Coding Project:**
  - Build `PayMatrixBalanceWidget` and deploy to Android emulator/physical device.
- **Interview Talking Point:**
  - *"How do Glance widgets communicate state updates from an app's background worker to the Android home screen launcher process?"*

### Week 8: Android WorkManager & Autonomous Offline Engine
- **Core Concepts:**
  - `WorkManager` internal architecture (JobScheduler, AlarmManager, Room WorkDatabase).
  - `PeriodicWorkRequestBuilder` constraints (battery, network, device idle).
  - `AlarmManager.setExactAndAllowWhileIdle()` for precise time-based reminders surviving Doze mode.
- **Hands-on Coding Project:**
  - Implement `LocalNudgeWorker` and test offline alerts using `WorkManagerTestInitHelper`.
- **Interview Talking Point:**
  - *"How to design battery-friendly, zero-server offline notifications that reliably wake the device from Android Doze mode without battery drain."*

---

## Month 3: Distributed Financial Architecture, AI & Public Launch

### Week 9: Multi-Currency Graph Debt Simplification
- **Core Concepts:**
  - Graph theory: Directed acyclic graphs (DAG) and min-cash-flow greedy heuristics.
  - Net balance aggregation across heterogeneous currency nodes.
  - Complexity analysis: $O(V^2)$ vs $O(V \log V)$ balance sorting.
- **Hands-on Coding Project:**
  - Implement and benchmark the multi-currency debt simplification graph solver.
- **Interview Talking Point:**
  - *"Is min-cash-flow NP-complete, and why is a greedy heuristic optimal for practical group expense balancing?"*

### Week 10: Global Payment Protocols (EPC SEPA, Pix & UPI)
- **Core Concepts:**
  - European Payments Council EPC069-12 BCD format specification.
  - Brazil Pix EMVCo TLV (Type-Length-Value) parsing and CRC-16 CCITT generation.
  - Android Intent resolution filters (`Intent.ACTION_VIEW` deep links).
- **Hands-on Coding Project:**
  - Build `paymentRailDispatcher.js` and test generated EPC QR codes against banking validator tools.
- **Interview Talking Point:**
  - *"How to engineer deep-link fallback strategies when a user does not have a native banking app installed on their phone."*

### Week 11: Multimodal Gemini 2.0/3.1 OCR & Edge Rate Limiting
- **Core Concepts:**
  - Client-side image downsampling via HTML5 Canvas before base64 encoding.
  - Gemini multimodal JSON schema validation (`responseSchema`).
  - Edge serverless proxies and zero-quota client rate-limiting algorithms (Token Bucket).
- **Hands-on Coding Project:**
  - Optimize the Gemini receipt scanner to process long multi-photo bills in under 2 seconds.
- **Interview Talking Point:**
  - *"How to prevent API abuse and bill-scanning cost spikes on serverless architectures without paying for expensive WAF products."*

### Week 12: Production Hardening, Portfolio Story & Launch
- **Core Concepts:**
  - ProGuard/R8 code shrinking and resource optimization.
  - Performance profiling via Lighthouse and Android Studio Memory Profiler.
  - Technical storytelling and public engineering communication.
- **Hands-on Coding Project:**
  - Record the 60-second product demo video, publish the LinkedIn carousel, and update the GitHub source of truth.
