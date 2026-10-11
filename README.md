# SmartSight — Construction Safety Camera Reliability Monitor

> **GREVIX AFTERCODE Challenge Card 2 Deliverable — Live Laptop Webcam Upgrade**  
> **Core Safety Principle:** *A missing, stale, invalid, or duplicate camera feed must NEVER be interpreted as proof that a construction site is safe.*

---

## 1. Problem Statement

Computer vision and automated safety monitoring systems on construction sites depend on continuous video feeds to detect high-risk hazards, such as missing Personal Protective Equipment (PPE), workers operating at elevation without fall arrest harnesses, and personnel entering heavy-equipment swing zones.

However, industrial job sites suffer from severe environmental and network infrastructure challenges:
1. **Network Instability & Transmission Lag:** 4G/5G mobile routers, Wi-Fi mesh nodes, and edge transmitters frequently drop packets, buffer indefinitely, or freeze on static frames.
2. **The "Silent Safety" Fallacy:** Traditional safety platforms conflate *the absence of hazard detections* with *evidence of safety*. When a camera feed stalls or disconnects, the computer vision engine processes a blank frame or no frame at all, reporting zero violations. Safety dashboards display misleading green indicators even while workers are actively exposed to unmonitored hazards.
3. **Outdated Observations Masquerading as Live Conditions:** A camera that captured a worker wearing a hardhat 10 minutes ago cannot guarantee that the worker is still wearing it, or that another worker hasn't entered an exclusion zone. Treating stale observations as current creates a false sense of security.

---

## 2. Solution Overview

**SmartSight** is an industrial surveillance reliability monitor and safety verification system that sits between camera inputs and safety reporting dashboards to enforce a strict **Zero-Trust Surveillance Integrity Protocol**.

The upgraded SmartSight system supports two clearly decoupled operational modes:
1. **Live Laptop Webcam Mode:** Connects to a physical laptop webcam via the browser's HTML5 `navigator.mediaDevices.getUserMedia` API, performing real-time client-side frame capture, canvas pixel validation, consecutive duplicate rejection, and frame freshness monitoring.
2. **Simulated Camera Mode:** A 4-camera construction site surveillance grid featuring the 3-step **Interactive Guided Reviewer Demo**, Simulation Lab (Scenarios A through G), and actionable alert dispatches.

Before any camera image is permitted to inform job-site risk:
- The feed undergoes temporal ordering checks, future drift detection, duplicate frame hash analysis, and age threshold validation.
- If a feed is degraded, stale, duplicate, corrupted, or offline, the system **immediately locks current site risk to `UNKNOWN`**.
- Past hazard observations are visually quarantined and designated **HISTORICAL** with exact timestamps, preventing operators from mistaking past observations for current conditions.
- Actionable alerts are dispatched explaining *what happened*, *why the feed cannot be trusted*, *that current site risk is UNKNOWN*, and *recommending physical inspection*.

---

## 3. Key Features

### Feature 1 — Real Laptop Webcam Integration
- **Live Preview (`getUserMedia`):** Stream live video from an integrated laptop webcam or connected USB camera directly in the browser.
- **Start / Stop Camera Controls:** Safely initializes and terminates camera access. Stopping the camera automatically halts all `MediaStreamTrack` instances to prevent hardware power or privacy leakage.
- **Capture Frame (`<video>` to `<canvas>`):** Captures snapshots on demand without external transmission.
- **Hardware & Permission Diagnostics:** Displays explicit states: `PERMISSION: PROMPT`, `PERMISSION: GRANTED`, `PERMISSION: DENIED`, `HARDWARE: NOT FOUND`, `HARDWARE: BUSY`, and `BROWSER: UNSUPPORTED`.
- **No Auto-Start:** The webcam never starts automatically without explicit user interaction.

### Feature 2 — Actual Frame Freshness Monitoring
- Tracks the exact elapsed time since the last successfully captured, validated frame.
- **Configurable Demonstration Thresholds:**
  - **FRESH:** Image age $\le$ 60 seconds.
  - **STALE:** Image age > 60 seconds and $\le$ 180 seconds.
  - **CRITICAL STALE:** Image age > 180 seconds.
  - **OFFLINE:** Webcam stopped, disconnected, or carrier dropped.
  - **MISSING:** Camera stream running, but zero valid frames have been captured yet.
- **Crucial Invariant:** Merely keeping the webcam stream open does **NOT** count as receiving a new validated frame! Only clicking **"Capture Frame"** and passing validation refreshes the freshness timestamp.
- *Notice:* These values represent configurable demonstration thresholds for prototype evaluation, not certified construction safety standards.

### Feature 3 — Duplicate & Invalid Frame Handling
- **Empty / Blank Frame Rejection:** Client-side 16x16 sampling detects zero-byte buffers, transparent canvas data, and pitch-black frames (average luminance < 3 with zero variance, e.g., covered lens).
- **Consecutive Duplicate Detection:** Computes a perceptual luminance hash (`aHash`) and compares it against the previous valid frame hash. If similarity exceeds 98.5% (Hamming distance $\le$ 2), the capture is rejected as a duplicate/frozen buffer.
- **Timestamp Protection:** Rejected frames do **not** refresh the freshness timestamp. Frame age continues to increase into STALE and CRITICAL STALE.
- **Audit Logging & UI Disclaimers:** Rejections are recorded in the event audit ledger with reasons. Prominent disclaimers remind operators: *"Visual similarity is an approximation and cannot prove that an image is stale. Timestamp and connection status are evaluated independently."*

### Feature 4 — Safety-First Dashboard Decoupling
- Strict separation across 5 telemetry vectors:
  1. **Webcam Connection Status:** `STREAMING` vs. `OFFLINE`
  2. **Last Valid Frame Captured:** Timestamp and formatted relative age (e.g., `42s ago`)
  3. **Feed Freshness Status:** `FRESH`, `STALE`, `CRITICAL STALE`, `OFFLINE`, `MISSING`
  4. **Current Site Risk:** Locked to **`UNKNOWN`** on any unreliable feed; evaluates to `LOW` (compliant) or `HIGH` (verified hazard) only when the feed is `FRESH`.
  5. **Recommended Next Action:** Clear operational directives (e.g., *"Capture a new frame to refresh feed freshness, or conduct manual physical inspection. DO NOT assume area is safe."*).

### Feature 5 — Hazard Detection Decoupling & Limitations
- **No Fake AI Scores:** SmartSight explicitly avoids fabricating AI bounding boxes or confidence percentages for real webcam images.
- **Transparent Limitation Labeling:** Automated AI hazard detection for the laptop webcam is explicitly designated as **"Not implemented (Simulation only)"**, and AI confidence is set to **"N/A"**. Feed reliability monitoring is kept separate from computer vision inference.

### Feature 6 — Dual Mode Architecture (Preserving the Existing Demo)
- **Mode Switcher:** Easily toggle between **Live Webcam Mode** and **Simulated Camera Mode** via top-level tab buttons or sidebar navigation.
- **Complete Preservation:** The 4 simulated cameras (CAM-101 to CAM-104), the **3-Step Guided Reviewer Demo**, the Simulation Lab (Scenarios A through G), and actionable alerts remain 100% accessible.
- **Unified Event Audit Log:** All events from both live webcam captures and simulated scenarios appear chronologically in the shared Safety Audit Log with CSV export support.
- **Safe Reset Control:** Resetting the demo cleanly releases all live webcam tracks without leaving the camera running in the background.

### Feature 7 — Multi-Page Architecture with Proper Button-Based Navigation
- **Dedicated Independent Pages:** The application is organized into 5 focused pages with real browser navigation, standard HTML anchors (`<a href="...">`), and browser Back/Forward button support:
  1. **Dashboard Overview (`index.html`):** High-level operational overview, 4 summary KPI cards, Quick Navigation cards with direct action buttons, camera status summary snapshot, active alerts preview, and recent operational event ledger.
  2. **Camera Monitoring (`cameras.html`):** Full 4-camera CCTV grid (CAM-101 to CAM-104) with wireframe canvas HUDs, live laptop webcam verification with WebRTC controls (Start/Stop/Capture/Clear), Simulation Lab toolbar (Scenarios A through G), Guided Reviewer Walkthrough deck, and feed freshness diagnostics.
  3. **Alerts & Safety Protocol (`alerts.html`):** Actionable feed reliability alerts detailing what happened, why the feed cannot be trusted, risk locked to UNKNOWN explanations, supervisor manual inspection dispatch, and alert dismissal with confirmation.
  4. **Event History (`history.html`):** Chronological tamper-evident audit ledger, severity filters (All, Warnings, Failures, Recovery), historical hazard archive, and client-side CSV export (`exportAuditLogCSV`).
  5. **Settings & Thresholds (`settings.html`):** Interactive configuration form for Fresh ($\le$ 60s), Stale (180s), and Offline (300s) timeout limits, demo aging simulation speed multiplier (1x, 5x, 10x), and zero-trust challenge card architecture documentation.
- **Consistent Sidebar & Breadcrumb Navigation:**
  - Standardized sidebar across every page with active navigation highlighting (`.nav-link.active`), live surveillance health widget, and mobile collapsible drawer.
  - Contextual breadcrumb bar (`.breadcrumb-bar`) on each page displaying the user's location in the application hierarchy.
- **Cross-Page State Persistence:** Application state (`config`, `cameras`, `alerts`, `auditLog`) is synchronized via browser `localStorage` (`smartsight_config`, `smartsight_cameras`, `smartsight_alerts`, `smartsight_audit_log`) so interactions on any page persist seamlessly.
- **WebRTC Resource Safety:** Webcam tracks are automatically halted (`track.stop()`) when the user stops the camera or leaves the monitoring page (`beforeunload` / `pagehide`).

---

## 4. Privacy & Security Guarantees

1. **100% In-Browser Memory:** All video frames, canvas snapshots, and perceptual hashes are processed strictly in client-side RAM.
2. **Zero Network Uploads:** No video streams, canvas pixels, or captured images are ever transmitted to any remote server, cloud API, or third-party service.
3. **Safe Stream Teardown:** All camera tracks (`track.stop()`) are stopped when the user clicks "Stop Camera", switches modes, resets the demo, or navigates away (`beforeunload`).

---

## 5. Technology Stack

- **Markup:** Semantic HTML5 (`<header>`, `<aside>`, `<main>`, `<video>`, `<canvas>`, ARIA landmarks)
- **Styling:** Vanilla CSS3 Design System (Industrial navy palette, responsive CSS Grid, Flexbox, accessible status badges)
- **Application Logic:** Vanilla JavaScript ES6+ (WebRTC `getUserMedia`, Canvas 2D API, reactive state management)
- **Testing:** Node.js `vm` sandbox acceptance test runner with media and canvas mocks
- **Icons:** Lucide Icons (CDN with SVG fallbacks)

---

## 6. How to Open and Run SmartSight (Multi-Page Navigation)

SmartSight is completely frontend-based and requires no build tools, npm installs, or backend servers.

### Application Structure & Pages
- **[index.html](file:///C:/Users/sahan/OneDrive/Desktop/gr/index.html) — Dashboard Overview:** System summary KPIs, camera status summary snapshot, active alerts preview, and quick navigation cards.
- **[cameras.html](file:///C:/Users/sahan/OneDrive/Desktop/gr/cameras.html) — Camera Monitoring:** 4-camera CCTV grid (CAM-101 to CAM-104), real laptop webcam preview with WebRTC controls (Start, Stop, Capture, Clear), Simulation Lab toolbar (Scenarios A through G), and Guided Demo Walkthrough deck.
- **[alerts.html](file:///C:/Users/sahan/OneDrive/Desktop/gr/alerts.html) — Alerts & Safety Protocol:** Active alerts, stale/offline warnings, risk explanations, supervisor manual inspection requests, and alert dismissals.
- **[history.html](file:///C:/Users/sahan/OneDrive/Desktop/gr/history.html) — Event History:** Chronological audit ledger, severity filters, historical observations, and CSV export.
- **[settings.html](file:///C:/Users/sahan/OneDrive/Desktop/gr/settings.html) — Settings:** Configurable Fresh (≤ 60s), Stale (180s), and Offline (300s) limits, demo aging speed controls, and challenge architecture principles.

### Method 1: Direct File Launch (Fastest)
1. Open the project folder (`C:\Users\sahan\OneDrive\Desktop\gr\`).
2. Double-click `index.html` to open the Dashboard in **Google Chrome**, **Microsoft Edge**, or **Mozilla Firefox**.
3. Use the sidebar navigation, dashboard quick buttons, or browser Back/Forward buttons to navigate between all 5 pages.

### Method 2: Local HTTP Server (Recommended for WebRTC Webcam)
Modern browsers require `localhost` / `127.0.0.1` or HTTPS for full `getUserMedia` webcam permission access:
```bash
# Using Python 3:
python -m http.server 8080

# Or using Node.js:
npx serve .
```
Then open `http://localhost:8080` in your browser.

---

## 7. Manual Browser Testing Instructions

Follow this step-by-step walkthrough to verify all real webcam capabilities:

### Test 1: Start Webcam & Permission Grant
1. In the top bar, ensure **"Live Webcam Mode"** is selected.
2. Observe the initial state: Permission is `PERMISSION: PROMPT`, Webcam Connection is `OFFLINE`, Freshness is `OFFLINE`, and Current Site Risk is `UNKNOWN`.
3. Click **"Start Camera"**.
4. When prompted by your browser, click **"Allow"** to grant camera access.
5. **Expected Result:**
   - The live video stream appears in the left viewport (mirrored naturally for your laptop).
   - Permission banner turns green: `PERMISSION: GRANTED`.
   - Video HUD displays `STREAM ACTIVE` and device name (e.g., *"Integrated Webcam"*).
   - Freshness remains `MISSING` because merely opening the stream does **not** count as a validated capture. Current risk remains `UNKNOWN`.

### Test 2: Capture a Valid Frame & Freshness Aging
1. Click **"Capture Frame"**.
2. **Expected Result:**
   - A snapshot of the live stream appears in the right canvas viewport.
   - Badge updates to `VALID (FRESH)` with capture timestamp.
   - Feed Freshness updates to `FRESH`.
   - Frame Age resets to `0s` and begins ticking up in real time.
   - Current Site Risk evaluates to compliant `LOW`.
   - Audit log records: `[FRAME_VALIDATED] Valid webcam frame captured and verified.`
3. **Observe Freshness Aging:**
   - **0s to 60s:** Status remains `FRESH`, Site Risk remains `LOW`.
   - **At 61s:** Status turns amber: `STALE`. Current Site Risk automatically flips to `UNKNOWN` with a warning callout!
   - **At 181s:** Status turns orange: `CRITICAL STALE`. Current Site Risk remains locked to `UNKNOWN`.

### Test 3: Duplicate Frame Detection
1. With your camera pointing at a static background (or while keeping still), click **"Capture Frame"**.
2. Immediately click **"Capture Frame"** a second time without moving.
3. **Expected Result:**
   - The validation engine detects visual similarity (> 98.5% match).
   - The capture is rejected: Red alert banner appears: *"Consecutive Duplicate Frame Rejected"*.
   - Disclaimer is shown: *"Visual similarity is an approximation and cannot prove that an image is stale."*
   - Crucially, the **last valid frame timestamp is NOT refreshed**, and frame age continues increasing.
   - Safety Audit Log records `FRAME_DUPLICATE_REJECTED`.

### Test 4: Empty / Black Frame Detection
1. Cover your laptop camera completely with your finger or a piece of opaque tape (producing an all-black frame).
2. Click **"Capture Frame"**.
3. **Expected Result:**
   - Validation engine detects average luminance < 3 with zero variance.
   - Red alert displays: *"Empty or Blank Frame Rejected"*.
   - Timestamp is **not** refreshed.
   - Audit log records `FRAME_INVALID_REJECTED`.

### Test 5: Safety Decoupling with Simulated Hazard Record
1. Click **"Toggle Demo Hazard Record"** to simulate a safety violation recorded during a recent site inspection.
2. While the feed is `STALE` or `OFFLINE`: Current Site Risk remains strictly locked to **`UNKNOWN`**! The hazard is preserved as a historical record only.
3. Click **"Capture Frame"** with a new non-duplicate image to refresh the feed to `FRESH`.
4. **Expected Result:** With a verified fresh feed, the hazard evaluation safely surfaces and site risk evaluates to `HIGH`.

### Test 6: Stop Camera & Stream Cleanup
1. Click **"Stop Camera"**.
2. **Expected Result:**
   - The video stream immediately terminates; the video placeholder reappears.
   - Connection status updates to `OFFLINE`.
   - Freshness updates to `OFFLINE`.
   - Current Site Risk is locked to `UNKNOWN`.
   - Your laptop's hardware camera indicator light turns off immediately (MediaStream tracks stopped).

### Test 7: Mode Switching & Demo Reset
1. Click **"Simulated Camera Mode"** in the top bar.
2. Observe that the 4-camera construction site grid (CAM-101 to CAM-104), the 3-step Guided Demo walkthrough, and Simulation Lab (Scenarios A through G) are fully intact.
3. Click **"Reset"** in the header. The system restores initial demonstration state and cleanly stops any active webcam streams.

---

## 8. Automated Acceptance Testing

SmartSight includes an automated acceptance test suite in [test_smartsight.js](file:///C:/Users/sahan/OneDrive/Desktop/gr/test_smartsight.js) executing inside Node.js with mocked browser WebRTC, Canvas 2D, and DOM APIs.

### How to Run the Tests:
```bash
node test_smartsight.js
```

### Actual Test Execution Output:
```text
================================================================
   SMARTSIGHT ACCEPTANCE TEST SUITE — GREVIX AFTERCODE CARD 2   
================================================================

--- Suite 1: Initial State & Baseline Invariants ---
[PASS] Test 01: Initial dashboard displays exactly 4 simulated cameras
[PASS] Test 02: Initial state baseline has 2 Fresh (CAM-101, 102), 1 Stale (CAM-103), 1 Offline (CAM-104)
[PASS] Test 03: CAM-103 is CRITICAL STALE and its currentRisk is locked to UNKNOWN
[PASS] Test 04: CAM-104 is OFFLINE and its currentRisk is locked to UNKNOWN
[PASS] Test 05: CAM-103 has no battery telemetry; system does not falsely infer battery failure

--- Suite 2: Feed Freshness Age Boundaries ---
[PASS] Test 06: Fresh feed boundary: 60s age (<= 60s) evaluates to FRESH with validated LOW risk
[PASS] Test 07: Stale lower boundary: 61s age (> 60s) evaluates to STALE with currentRisk UNKNOWN
[PASS] Test 08: Stale upper boundary: 180s age evaluates to STALE with currentRisk UNKNOWN
[PASS] Test 09: Critical stale boundary: 181s age (> 180s) evaluates to CRITICAL STALE with currentRisk UNKNOWN
[PASS] Test 10: Offline boundary: 301s age (> 300s) evaluates to OFFLINE with currentRisk UNKNOWN
[PASS] Test 11: Missing feed payload evaluates to MISSING with currentRisk UNKNOWN

--- Suite 3: Data Integrity, Duplicates & Anomalies ---
[PASS] Test 12: Temporal anomaly check: Future-dated timestamp rejected as INVALID DATA, risk UNKNOWN
[PASS] Test 13: Temporal anomaly check: Capture timestamp after receive timestamp rejected as INVALID DATA
[PASS] Test 14: Zero-Trust Hash check: Identical frame hash rejected as DUPLICATE, risk UNKNOWN

--- Suite 4: Safety Separation & Historical Hazard Handling ---
[PASS] Test 15: Fresh feed with active hazard evaluates to currentRisk HIGH
[PASS] Test 16: Safety-First Rule: Stale feed with prior hazard must become UNKNOWN risk, never current HIGH
[PASS] Test 17: CAM-103 preserves historical hazard record while currentRisk remains locked to UNKNOWN

--- Suite 5: Interactive Demonstration Scenarios (A-G) ---
[PASS] Test 18: Scenario Fresh: Marks feed FRESH, evaluates active risk (LOW), enables AI confidence
[PASS] Test 19: Scenario Stale: Marks feed STALE (95s old), demotes risk to UNKNOWN, unsets AI confidence
[PASS] Test 20: Scenario Critical Stale: Marks feed CRITICAL STALE (> 180s), locks risk to UNKNOWN
[PASS] Test 21: Scenario Offline: Marks feed OFFLINE, sets currentRisk to UNKNOWN, disconnects stream
[PASS] Test 22: Scenario Invalid: Marks feed INVALID DATA, locks currentRisk to UNKNOWN
[PASS] Test 23: Scenario Duplicate: Marks feed DUPLICATE upon repeated hash, sets risk to UNKNOWN
[PASS] Test 24: Scenario Recovery: Ingests verified fresh frame (8s old), restores feed to FRESH and risk LOW

--- Suite 6: Actionable Alerts & Human-Readable Explanations ---
[PASS] Test 25: Actionable alert generated for unreliable camera
[PASS] Test 26: Alert contains all 4 structured points: What Happened, Why Untrusted, and Recommended Action
[PASS] Test 27: Alert explicitly confirms site risk status is UNKNOWN
[PASS] Test 28: getStatusReason provides detailed human-readable explanation of feed integrity
[PASS] Test 29: getRiskExplanation clearly explains why risk is locked to UNKNOWN

--- Suite 7: Manual Inspection Workflow ---
[PASS] Test 30: requestManualInspection sets inspectionRequested flag to true
[PASS] Test 31: resolveManualInspection clears inspection flag while maintaining UNKNOWN risk on unverified feed

--- Suite 8: Demo Reset Control ---
[PASS] Test 32: resetDemoState restores initial baseline (2 Fresh, 1 Stale, 1 Offline camera)
[PASS] Test 33: resetDemoState restores default thresholds (Fresh: 60s, Stale: 180s, Offline: 300s)
[PASS] Test 34: resetDemoState restores standard initial alert set (CAM-103 and CAM-104)

--- Suite 9: Event Audit Trail Logging ---
[PASS] Test 35: Audit log contains chronological event records for all state transitions
[PASS] Test 36: Audit log contains recorded DEMO_RESET event entry

--- Suite 10: Guided Demo 3-Step Walkthrough Engine ---
[PASS] Test 37: Guided Demo defines exactly 3 sequential walkthrough steps
[PASS] Test 38: startGuidedDemo activates guided demo at Step 1
[PASS] Test 39: Guided Step 1: CAM-101 is FRESH and site risk is LOW (normal detection proceeds)
[PASS] Test 40: nextGuidedStep advances walkthrough to Step 2
[PASS] Test 41: Guided Step 2: CAM-101 is CRITICAL STALE and site risk is locked to UNKNOWN
[PASS] Test 42: Guided Step 2: Generates actionable alert explaining why feed is untrusted and risk is UNKNOWN
[PASS] Test 43: nextGuidedStep advances walkthrough to Step 3
[PASS] Test 44: Guided Step 3: CAM-101 recovered to FRESH with validated 8s frame and verified LOW risk
[PASS] Test 45: prevGuidedStep navigates back to Step 2
[PASS] Test 46: exitGuidedDemo deactivates guided walkthrough and restores normal mode

--- Suite 11: Self-Explanatory Actions & Simulated Labels ---
[PASS] Test 47: getRecommendedAction for Fresh compliant camera indicates normal monitoring
[PASS] Test 48: getRecommendedAction for Fresh camera with active hazard advises immediate supervisor intervention
[PASS] Test 49: getRecommendedAction for Stale feed explicitly warns never to assume area is safe
[PASS] Test 50: getRecommendedAction for Critical Stale mandates immediate manual inspection
[PASS] Test 51: getRecommendedAction for Offline camera mandates immediate physical inspection
[PASS] Test 52: getRecommendedAction for Duplicate feed identifies frozen buffer
[PASS] Test 53: Manual inspection notes are clearly tagged as [Simulated Action]
[PASS] Test 54: Manual inspection resolution notes are clearly tagged as [Simulated Action]

--- Suite 12: Threshold Consistency & Boundary Invariants ---
[PASS] Test 55: Config freshThreshold is exactly 60s
[PASS] Test 56: Config staleThreshold is exactly 180s
[PASS] Test 57: Config offlineTimeout is exactly 300s
[PASS] Test 58: Threshold boundaries are strictly ordered: Fresh (60s) < Stale (180s) < Offline (300s)
[PASS] Test 59: Safety Gate: Corrupted recovery frame is rejected by validation engine

--- Suite 13: Webcam MediaStream Lifecycle ---
[PASS] Test 60: Webcam starts and enters streaming state when mediaDevices.getUserMedia succeeds
[PASS] Test 61: Starting webcam marks stream status as STREAM ACTIVE with device label
[PASS] Test 62: Stopping webcam halts all MediaStream tracks and resets streaming state to OFFLINE
[PASS] Test 63: Unsupported getUserMedia environment triggers UNSUPPORTED status and error explanation

--- Suite 14: Webcam Hardware & Permission States ---
[PASS] Test 64: Permission denial (NotAllowedError) marks permission as denied and explains address bar fix
[PASS] Test 65: Missing hardware device (NotFoundError) sets permission status to missing with hardware notice
[PASS] Test 66: Busy camera device (NotReadableError) sets permission status to busy with multi-app alert
[PASS] Test 67: Unstarted webcam defaults to prompt state without automatic stream launch

--- Suite 15: Webcam Frame Capture & Client-Side Validation ---
[PASS] Test 68: Valid frame capture updates lastValidCaptureTimestamp and sets captureStatus to FRESH
[PASS] Test 69: Valid frame capture evaluates site risk to LOW (normal baseline resumed)
[PASS] Test 70: Empty/black frame capture is rejected as EMPTY_INVALID and freshness timestamp is NOT renewed
[PASS] Test 71: Consecutive duplicate frame capture is rejected as DUPLICATE and timestamp is NOT renewed
[PASS] Test 72: Duplicate rejection logs disclaimer that visual similarity is an approximation
[PASS] Test 73: Rejections record descriptive failure reason in Safety Audit Log

--- Suite 16: Actual Frame Freshness Monitoring & Boundaries ---
[PASS] Test 74: Merely keeping stream open does NOT refresh freshness; uncaptured stream evaluates to MISSING
[PASS] Test 75: Frame age <= 60s evaluates to FRESH with validated compliant LOW risk
[PASS] Test 76: Frame age 61s-180s evaluates to STALE with currentRisk UNKNOWN
[PASS] Test 77: Frame age > 180s evaluates to CRITICAL STALE with currentRisk UNKNOWN
[PASS] Test 78: Stopped webcam stream evaluates to OFFLINE with currentRisk UNKNOWN

--- Suite 17: Safety-First Decoupling & Risk UNKNOWN Fail-Safe ---
[PASS] Test 79: Site risk is locked to UNKNOWN when webcam is OFFLINE
[PASS] Test 80: Historical hazard observation recorded for audit tracking
[PASS] Test 81: Historical hazard observation preserved while current risk remains strictly locked to UNKNOWN on offline feed
[PASS] Test 82: Recovery after valid fresh frame allows hazard detection to resume (risk evaluated to HIGH)
[PASS] Test 83: Cleared hazard on fresh feed returns current site risk to LOW
[PASS] Test 84: Automated AI hazard detection is explicitly labeled as Not Implemented with N/A confidence
[PASS] Test 85: Recommended action mandates physical inspection on unverified feeds

--- Suite 18: Mode Switching & Demo Reset Isolation ---
[PASS] Test 86: setAppMode switches smoothly to Simulated Camera Mode
[PASS] Test 87: setAppMode switches smoothly to Live Webcam Mode
[PASS] Test 88: Webcam active before demo reset
[PASS] Test 89: resetDemoState safely stops webcam MediaStream tracks without background leakage
[PASS] Test 90: Simulated 4-camera network remains 100% functional alongside Live Webcam mode

--- Suite 19: Multi-Page Architecture & Real Navigation ---
[PASS] Test 91: All 5 dedicated HTML pages exist on disk (index, cameras, alerts, history, settings)
[PASS] Test 92: Dashboard includes real button navigation links to cameras, alerts, history, and settings
[PASS] Test 93: Every page provides consistent sidebar navigation and breadcrumb context bar
[PASS] Test 94: Currently active page is highlighted in sidebar on every HTML page
[PASS] Test 95: All relative navigation and quick-link anchors resolve to valid local targets (0 broken links)

================================================================
SMARTSIGHT TEST RESULTS: 95/95 tests passed successfully!
================================================================
```

---

## 9. Project Limitations

1. **AI Model Decoupling:** Live webcam captures do not perform genuine machine-learning inference for PPE detection, worker recognition, or trench barrier violations. These require specialized edge models and are labeled *"Not implemented (Simulation only)"*.
2. **Visual Similarity Approximation:** Duplicate frame detection utilizes perceptual downsampled luminance hash comparison. Visual similarity is an approximation and cannot mathematically prove that an image is stale; frame age and connection status are monitored as independent safety signals.
3. **Local In-Memory Scope:** Captured snapshots are kept only in the client-side canvas buffer and are not written to persistent storage or sent to external servers.

---

## 10. License & Attribution

- **Project:** SmartSight — Construction Safety Camera Reliability Monitor
- **Event:** GREVIX AFTERCODE Hackathon (Challenge Card 2)
- **Author:** Sahana Srinivasan
- **Repository:** [https://github.com/sahana-srinivasan-15/SmartSight](https://github.com/sahana-srinivasan-15/SmartSight)
