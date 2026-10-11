# SmartSight — Build & Decision Log

> **GREVIX AFTERCODE 2026: The Final Forge**  
> **Project:** SmartSight — Construction Safety Camera Reliability Monitor  
> **Author:** Sahana Srinivasan  
> **Repository:** [https://github.com/sahana-srinivasan-15/SmartSight](https://github.com/sahana-srinivasan-15/SmartSight)

---

## 1. Project Overview & Objective

SmartSight was engineered during the **GREVIX AFTERCODE 2026** hackathon to address a catastrophic vulnerability in industrial safety systems: **the conflation of missing video data with site safety**. When a surveillance camera freezes or disconnects, traditional systems report zero violations and display a false "SAFE" status. SmartSight acts as an integrity gatekeeper, enforcing a zero-trust surveillance protocol where unverified feeds automatically default to `CURRENT SITE RISK: UNKNOWN`.

---

## 2. Chronological Git Commit History & Milestones

The project evolved iteratively through verified git commits:

| Commit Hash | Timestamp | Milestone / Summary |
| :--- | :--- | :--- |
| `ee06c94` | Oct 11, 2026 — 15:44 IST | **Initial Prototype Build:** Created single-page surveillance prototype with initial camera grid and freshness tracking logic. |
| `4c2e49e` | Oct 11, 2026 — 15:57 IST | **Initial Documentation:** Initialized `README.md` with problem statement, architecture overview, and setup instructions. |
| `69ee486` | Oct 11, 2026 — 15:58 IST | **Challenge Card 1 Delivery:** Completed core camera reliability prototype featuring 4 simulated cameras, zero-trust freshness validation, fail-safe `UNKNOWN` state, and initial 12 acceptance unit tests. |
| `48786d6` | Oct 11, 2026 — 23:17 IST | **Challenge Card 2 Delivery & Feedback Iteration:**<br>• Integrated real laptop webcam via HTML5 WebRTC `navigator.mediaDevices.getUserMedia`.<br>• Engineered client-side canvas frame capture, black-frame rejection, and perceptual duplicate detection.<br>• Refactored to full 6-page architecture (`index.html`, `cameras.html`, `alerts.html`, `history.html`, `settings.html`, `simulation.html`).<br>• Implemented peer reviewer feedback: high-contrast status badges, prominent `RISK UNKNOWN` assertions, and manual inspection dispatch workflows.<br>• Expanded test suite from 12 to 95 automated unit tests across 19 suites. |
| `3c80752` | Oct 11, 2026 — 23:44 IST | **Feedback Evidence:** Added genuine feedback chat screenshot (`feedback.png`) and updated UI screenshots to `feedback/`. |
| `a6321e5` | Oct 12, 2026 — 00:08 IST | **Final Forge Submission Delivery:**<br>• Initialized `BUILD_LOG.md` and `feedback/FEEDBACK.md`.<br>• Polished Camera Diagnostics modal pop-up layout and typography in `styles.css` and `app.js`.<br>• Verified 95/95 automated acceptance tests. |

---

## 3. Key Architectural Decisions (ADRs)

### ADR-01: Decoupling Feed Freshness from Site Safety (Zero-Trust Metric Separation)
- **Problem:** Conventional safety monitoring treats zero detected violations as proof that a site is compliant. When a feed drops, the lack of input falsely registers as 0 hazards.
- **Decision:** Strictly decouple feed status from site risk. If a camera feed is `STALE` (> 60s), `CRITICAL STALE` (> 180s), `OFFLINE`, `DUPLICATE`, or `INVALID`, the current risk is mathematically locked to **`UNKNOWN`**.
- **Result:** Prevents operators from making compliance decisions based on missing information.

### ADR-02: Zero External Uploads & In-Browser Memory Safety
- **Problem:** Real webcam feeds on construction job sites contain sensitive worker imagery. Transmitting raw video to external servers introduces privacy and compliance risks.
- **Decision:** Process all live webcam streams, canvas snapshots, and perceptual hashes entirely in browser RAM using the HTML5 Canvas 2D API. No remote upload endpoints are used.
- **Result:** 100% privacy preservation, zero cloud dependencies, and immediate responsiveness.

### ADR-03: Perceptual Luminance Hashing (`aHash`) for Duplicate Frame Rejection
- **Problem:** Frozen network buffers or looping IP camera streams can continuously push identical frames with renewed transport timestamps, masking a frozen feed.
- **Decision:** Downsample captured canvas frames to a 16×16 grayscale matrix, compute an average luminance hash, and compare consecutive hashes via Hamming distance. If similarity exceeds 98.5%, reject the capture as `DUPLICATE` and do not renew the freshness timestamp.
- **Honest Limitation:** Prominently disclaimer in the UI and documentation that visual similarity is an approximation and must be accompanied by independent temporal age checks.

### ADR-04: Multi-Page Static Architecture with Zero Build Dependencies
- **Problem:** Complex single-page apps (SPAs) often suffer from deep routing issues, bloated dependencies, and heavy build pipelines.
- **Decision:** Build SmartSight with semantic HTML5, Vanilla CSS3, and ES6+ JavaScript across dedicated pages ([index.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/index.html), [cameras.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/cameras.html), [alerts.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/alerts.html), [history.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/history.html), [settings.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/settings.html)). State is synchronized seamlessly via browser `localStorage`.
- **Result:** Runs instantly in any standard browser via file open or any static HTTP server with 0 install steps.

### ADR-05: Honest AI Decoupling & No Fabricated Inference
- **Problem:** It is common in hackathons to display fake machine-learning bounding boxes or fabricated confidence percentages on real webcam inputs.
- **Decision:** Maintain strict engineering honesty. The live laptop webcam interface explicitly labels automated AI hazard detection as **"Not Implemented (Simulation only)"** and sets AI confidence to **"N/A"**. Simulated hazards are restricted to the simulated camera fleet.
- **Result:** Transparent, credible prototype focusing squarely on the core reliability challenge.

---

## 4. Challenge Card 1 vs. Challenge Card 2 Evolution

```
+------------------------------------------+------------------------------------------+
| Challenge Card 1: Core Reliability      | Challenge Card 2: Live Webcam & Feedback |
+------------------------------------------+------------------------------------------+
| * 4 Simulated Cameras (CAM-101 to 104)   | * Real Laptop Webcam (getUserMedia)      |
| * Single-page prototype                  | * Multi-Page Architecture (6 HTML pages) |
| * Threshold aging (60s / 180s / 300s)    | * Client-side canvas capture engine      |
| * Basic risk UNKNOWN fail-safe           | * Anti-cheat black & duplicate rejection |
| * Basic text alerts                      | * 4-part actionable alerts center        |
| * 12 Automated acceptance tests          | * Manual physical inspection workflows   |
|                                          | * Peer feedback integration & evidence   |
|                                          | * 95 Automated unit tests (19 suites)    |
+------------------------------------------+------------------------------------------+
```

---

## 5. Automated Verification Summary

- **Test Runner:** `node test_smartsight.js`
- **Total Test Suites:** 19
- **Total Tests:** 95
- **Result:** 95 passed, 0 failed (100% pass rate).
