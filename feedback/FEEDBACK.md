# SmartSight — Challenge Card 2 Feedback & Iteration Record

> **GREVIX AFTERCODE 2026: The Final Forge**  
> **Project:** SmartSight — Construction Safety Camera Reliability Monitor  
> **Author:** Sahana Srinivasan  
> **Repository:** [https://github.com/sahana-srinivasan-15/SmartSight](https://github.com/sahana-srinivasan-15/SmartSight)

---

## 1. Context & Feedback Solicitation

During the evaluation phase of **Challenge Card 2 (Live Laptop Webcam Upgrade)**, the SmartSight repository was shared with an external peer reviewer to evaluate whether the surveillance reliability dashboard was intuitive, trustworthy, and safety-compliant for construction site monitoring.

The reviewer was asked:
> *"Hi! I'm developing a project called SmartSight for a hackathon. It identifies unreliable construction safety camera feeds, such as stale or offline feeds. Could you please take a quick look at my project and tell me one thing that could be improved? Honest feedback would really help me improve it."*

---

## 2. Genuine Feedback Received

The following genuine feedback was received via messaging (verified in `feedback/feedback.png`):

> **Reviewer Suggestion:**  
> *"My suggestion is to make the camera status and safety alerts more noticeable, especially when a camera feed becomes stale or goes offline. The dashboard should clearly display "RISK UNKNOWN" and recommend manual inspection so users don't mistakenly assume the construction site is safe.*  
>  
> *This improvement would make the system easier to understand and more reliable for safety monitoring."*

---

## 3. Feedback Analysis & Identified Gaps

From this feedback, four critical areas of improvement were identified:
1. **Status Visibility Gap:** Camera status tags were not prominent enough; operators glancing quickly at a feed might overlook that a camera is stale or offline.
2. **Ambiguity on Site Safety:** If a camera feed stopped updating, operators might mistakenly assume the area is safe simply because no active hazard alert is ringing.
3. **Mandatory "RISK UNKNOWN" Assertion:** Stale or offline feeds must prominently assert that current site risk is **`UNKNOWN`** rather than showing blank or neutral metrics.
4. **Actionable Directive (Manual Inspection):** System notifications must provide a clear operational recommendation: dispatching a supervisor for physical inspection rather than waiting passively for network reconnection.

---

## 4. Implemented Project Improvements

Based directly on the reviewer's feedback, the following concrete improvements were engineered:

### A. High-Contrast Status Badges & Alert Prominence
- Implemented high-contrast, pulsating status badges in [styles.css](file:///c:/Users/sahan/OneDrive/Desktop/gr/styles.css) across all camera cards and dashboard KPIs:
  - `FRESH` (High-contrast emerald with verified checkmark)
  - `STALE` (Amber callout with frame age counter)
  - `CRITICAL STALE` (Crimson indicator with pulsing warning)
  - `OFFLINE` (High-visibility slate with disconnect warning)

### B. Fail-Safe Decoupling: Site Risk Strictly Locked to `UNKNOWN`
- Updated the evaluation engine in [app.js](file:///c:/Users/sahan/OneDrive/Desktop/gr/app.js) (`evaluateFeedFreshness` and `evaluateCurrentRisk`):
  - Whenever a camera's frame age exceeds the 60s threshold or the stream goes offline, `currentRisk` is immediately demoted to **`UNKNOWN`**.
  - Even if a camera previously detected a hazard or was compliant, the current risk is never displayed as `SAFE` or `LOW` while the feed is unverified.

### C. Actionable Alerts Center & Physical Inspection Mandates
- Created a dedicated Actionable Alerts Center ([alerts.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/alerts.html)) with a 4-part structured alert card for every unreliable feed:
  1. **What Happened:** Exact failure reason (e.g., Frame age 192s exceeds stale limit).
  2. **Why Untrusted:** Explains that outdated frames create unmonitored blind spots.
  3. **Site Risk:** Explicitly locked to `UNKNOWN`.
  4. **Recommended Action:** Mandates immediate physical inspection by the safety supervisor.
- Added interactive **"Request Manual Inspection"** and **"Resolve Inspection"** workflows with explicit `[Simulated Action]` labeling.

### D. Multi-Page Architecture for Operational Clarity
- Expanded the interface from a cramped single view into dedicated pages ([index.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/index.html), [cameras.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/cameras.html), [alerts.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/alerts.html), [history.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/history.html), [settings.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/settings.html)) so safety officers can navigate directly to active alerts or camera feeds with zero friction.

---

## 5. Evidence Files

All evidence assets are located in the `feedback/` directory:

| Filename | Description | Content Verified |
| :--- | :--- | :--- |
| `feedback.png` | Screenshot of the chat thread where project repository was shared and peer feedback was received. | Genuine feedback requesting more noticeable status, "RISK UNKNOWN" display, and manual inspection recommendations. |
| `Screenshot 2026-10-11 234142.png` | Screenshot of upgraded Live Laptop Webcam interface in [cameras.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/cameras.html). | Shows high-visibility `OFFLINE` status, `CURRENT SITE RISK: UNKNOWN` callout, and manual inspection instructions. |
| `Screenshot 2026-10-11 234204.png` | Screenshot of upgraded 4-Camera Monitoring Grid in [cameras.html](file:///c:/Users/sahan/OneDrive/Desktop/gr/cameras.html). | Shows prominent status badges (`FRESH`, `CRITICAL STALE`), clear frame ages, and prominent `RECOMMENDED ACTION` callouts. |

---

## 6. Testing & Automated Verification

The implemented improvements were verified against the automated test suite in [test_smartsight.js](file:///c:/Users/sahan/OneDrive/Desktop/gr/test_smartsight.js):

- **Suite 4 (Safety Separation):**
  - Test 16: Stale feed with prior hazard must become `UNKNOWN` risk, never current `HIGH` (PASS).
  - Test 17: Preserves historical hazard record while current risk remains locked to `UNKNOWN` (PASS).
- **Suite 6 (Actionable Alerts):**
  - Test 25: Actionable alert generated for unreliable camera (PASS).
  - Test 26: Alert contains all 4 structured points: What Happened, Why Untrusted, and Recommended Action (PASS).
  - Test 27: Alert explicitly confirms site risk status is `UNKNOWN` (PASS).
- **Suite 7 (Manual Inspection Workflow):**
  - Test 30: `requestManualInspection` sets inspectionRequested flag (PASS).
  - Test 31: `resolveManualInspection` clears inspection flag while maintaining `UNKNOWN` risk on unverified feed (PASS).
- **Suite 11 (Self-Explanatory Actions):**
  - Tests 47–52: Recommended actions provide tailored, actionable advice for each failure mode (PASS).
  - Tests 53–54: Inspection notes are clearly tagged as `[Simulated Action]` (PASS).

**Overall Test Suite Result:** `95/95 tests passed successfully (100%)`.
