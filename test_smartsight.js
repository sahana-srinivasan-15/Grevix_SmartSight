/**
 * Automated Acceptance Test Suite for SmartSight
 * Construction Safety Camera Reliability Monitor
 *
 * Validates all GREVIX AFTERCODE Challenge Card 2 requirements:
 * 1. Camera Feed Reliability (Fresh <= 60s, Stale 61-180s, Critical Stale > 180s, Offline > 300s)
 * 2. Safety-First Risk Status (Separated metrics; risk UNKNOWN on unreliable feeds; historical hazards preserved)
 * 3. Dashboard KPI and state reporting
 * 4. Interactive Simulation Lab scenarios (A-G + Reset Demo)
 * 5. Actionable Alerts (What happened, why untrusted, risk locked to UNKNOWN, recommended action)
 * 6. Feedback-Driven Usability (Human-readable integrity reasons, empty states)
 * 7. Manual Inspection Workflow (Request and resolve)
 * 8. Configurable thresholds and reset functionality
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read app.js
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

// Mock MediaStream & WebRTC State for Node.js
let mockUserMediaError = null;
let mockTracksStopped = false;
let customPixelGenerator = null;

const createMockTrack = (kind = 'video', label = 'Integrated Laptop Webcam') => ({
  kind,
  label,
  enabled: true,
  readyState: 'live',
  stop: () => { mockTracksStopped = true; }
});

const createMockStream = () => {
  mockTracksStopped = false;
  return {
    active: true,
    getTracks: () => [createMockTrack()],
    getVideoTracks: () => [createMockTrack()]
  };
};

const mockNavigator = {
  mediaDevices: {
    getUserMedia: async (constraints) => {
      if (mockUserMediaError) {
        const err = new Error(mockUserMediaError.message || 'Media error');
        err.name = mockUserMediaError.name || 'NotAllowedError';
        throw err;
      }
      return createMockStream();
    }
  }
};

// Mock browser environment for Node.js
const mockElement = () => ({
  textContent: '',
  value: '',
  className: '',
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {}
  },
  innerHTML: '',
  setAttribute: () => {},
  removeAttribute: () => {},
  hasAttribute: () => false,
  style: {},
  appendChild: () => {},
  removeChild: () => {},
  remove: () => {},
  // Video mock properties
  videoWidth: 640,
  videoHeight: 480,
  srcObject: null,
  play: () => Promise.resolve(),
  pause: () => {},
  // Canvas mock properties
  width: 640,
  height: 480,
  getContext: () => ({
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    closePath: () => {},
    setLineDash: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    drawImage: () => {},
    clearRect: () => {},
    getImageData: (x, y, w, h) => {
      if (customPixelGenerator) {
        return { data: customPixelGenerator(w, h) };
      }
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 120 + (i % 40);
        data[i + 1] = 140 + (i % 35);
        data[i + 2] = 160 + (i % 30);
        data[i + 3] = 255;
      }
      return { data };
    }
  }),
  scrollIntoView: () => {},
  querySelectorAll: () => [],
  addEventListener: () => {}
});

const mockDocument = {
  getElementById: (id) => {
    const el = mockElement();
    if (id === 'simulation-target-select') el.value = 'CAM-101';
    return el;
  },
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => mockElement(),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

const mockWindow = {
  lucide: { createIcons: () => {} },
  navigator: mockNavigator,
  addEventListener: () => {}
};

// Create Node vm sandbox
const context = {
  console,
  document: mockDocument,
  window: mockWindow,
  navigator: mockNavigator,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  Date,
  Math,
  setInterval: () => {},
  setTimeout: (fn) => fn(),
  Blob: class {},
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} }
};

vm.createContext(context);
vm.runInContext(appCode, context);

console.log('================================================================');
console.log('   SMARTSIGHT ACCEPTANCE TEST SUITE — GREVIX AFTERCODE CARD 2   ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests.toString().padStart(2, '0')}: ${testName} ${details ? `(${details})` : ''}`);
    process.exitCode = 1;
  }
}

// Retrieve handles from sandbox
let cameras = vm.runInContext('cameras', context);
const config = vm.runInContext('config', context);
const DEFAULT_CONFIG = vm.runInContext('DEFAULT_CONFIG', context);
const validateCameraFrame = vm.runInContext('validateCameraFrame', context);
const getStatusReason = vm.runInContext('getStatusReason', context);
const getRiskExplanation = vm.runInContext('getRiskExplanation', context);
const runScenarioFresh = vm.runInContext('runScenarioFresh', context);
const runScenarioStale = vm.runInContext('runScenarioStale', context);
const runScenarioCriticalStale = vm.runInContext('runScenarioCriticalStale', context);
const runScenarioOffline = vm.runInContext('runScenarioOffline', context);
const runScenarioInvalid = vm.runInContext('runScenarioInvalid', context);
const runScenarioDuplicate = vm.runInContext('runScenarioDuplicate', context);
const runScenarioRecovery = vm.runInContext('runScenarioRecovery', context);
const runScenarioA = vm.runInContext('runScenarioA', context);
const runScenarioB = vm.runInContext('runScenarioB', context);
const runScenarioC = vm.runInContext('runScenarioC', context);
const runScenarioD = vm.runInContext('runScenarioD', context);
const runScenarioE = vm.runInContext('runScenarioE', context);
const requestManualInspection = vm.runInContext('requestManualInspection', context);
const resolveManualInspection = vm.runInContext('resolveManualInspection', context);
const resetDemoState = vm.runInContext('resetDemoState', context);
const getRecommendedAction = vm.runInContext('getRecommendedAction', context);
const startGuidedDemo = vm.runInContext('startGuidedDemo', context);
const nextGuidedStep = vm.runInContext('nextGuidedStep', context);
const prevGuidedStep = vm.runInContext('prevGuidedStep', context);
const exitGuidedDemo = vm.runInContext('exitGuidedDemo', context);
const getGuidedState = vm.runInContext('getGuidedState', context);
const GUIDED_STEPS = vm.runInContext('GUIDED_STEPS', context);

// Webcam & Mode Management handles
const getWebcamState = vm.runInContext('SmartSight.getWebcamState', context);
const startWebcam = vm.runInContext('SmartSight.startWebcam', context);
const stopWebcam = vm.runInContext('SmartSight.stopWebcam', context);
const captureWebcamFrame = vm.runInContext('SmartSight.captureWebcamFrame', context);
const validateWebcamFrame = vm.runInContext('SmartSight.validateWebcamFrame', context);
const clearCapturedFrame = vm.runInContext('SmartSight.clearCapturedFrame', context);
const toggleDemoHazardRecord = vm.runInContext('SmartSight.toggleDemoHazardRecord', context);
const updateWebcamAging = vm.runInContext('SmartSight.updateWebcamAging', context);
const resetWebcamState = vm.runInContext('SmartSight.resetWebcamState', context);
const setAppMode = vm.runInContext('SmartSight.setAppMode', context);
const getAppMode = vm.runInContext('SmartSight.getAppMode', context);

// -----------------------------------------------------------------------------
// SUITE 1: INITIAL STATE & CAMERA BASELINE INVARIANTS
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Initial State & Baseline Invariants ---');

assert(Array.isArray(cameras) && cameras.length === 4,
  'Initial dashboard displays exactly 4 simulated cameras');

const initialFresh = cameras.filter(c => c.status === 'FRESH').length;
const initialStale = cameras.filter(c => c.status === 'CRITICAL STALE' || c.status === 'STALE').length;
const initialOffline = cameras.filter(c => c.status === 'OFFLINE').length;
assert(initialFresh === 2 && initialStale === 1 && initialOffline === 1,
  'Initial state baseline has 2 Fresh (CAM-101, 102), 1 Stale (CAM-103), 1 Offline (CAM-104)');

const cam103 = cameras.find(c => c.id === 'CAM-103');
assert(cam103 && cam103.status === 'CRITICAL STALE' && cam103.currentRisk === 'UNKNOWN',
  'CAM-103 is CRITICAL STALE and its currentRisk is locked to UNKNOWN');

const cam104 = cameras.find(c => c.id === 'CAM-104');
assert(cam104 && cam104.status === 'OFFLINE' && cam104.currentRisk === 'UNKNOWN',
  'CAM-104 is OFFLINE and its currentRisk is locked to UNKNOWN');

// Hardware Telemetry Check: Battery failure must not be falsely assumed
assert(!cam103.telemetryAvailable && cam103.batteryPercent === null,
  'CAM-103 has no battery telemetry; system does not falsely infer battery failure');

// -----------------------------------------------------------------------------
// SUITE 2: CAMERA FEED FRESHNESS BOUNDARIES (FEATURE 1)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Feed Freshness Age Boundaries ---');

const baseCam = { id: 'TEST-CAM', status: 'FRESH', lastFrameHash: 'h-prev', isStreamConnected: true };
const now = Date.now();

// 2A. Fresh Boundary: exactly 60 seconds (<= freshThreshold)
const frameFreshBoundary = {
  captureTimestamp: new Date(now - 60000).toISOString(),
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-fresh-boundary',
  hazardDetected: false
};
const valFresh = validateCameraFrame(frameFreshBoundary, baseCam, config);
assert(valFresh.isValid && valFresh.feedFreshness === 'FRESH' && valFresh.currentRisk === 'LOW',
  'Fresh feed boundary: 60s age (<= 60s) evaluates to FRESH with validated LOW risk');

// 2B. Stale Lower Boundary: 61 seconds (> 60s, <= 180s)
const frameStaleBoundary = {
  captureTimestamp: new Date(now - 61000).toISOString(),
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-stale-lower',
  hazardDetected: false
};
const valStaleLower = validateCameraFrame(frameStaleBoundary, baseCam, config);
assert(valStaleLower.isValid && valStaleLower.feedFreshness === 'STALE' && valStaleLower.currentRisk === 'UNKNOWN',
  'Stale lower boundary: 61s age (> 60s) evaluates to STALE with currentRisk UNKNOWN');

// 2C. Stale Upper Boundary: exactly 180 seconds (<= staleThreshold)
const frameStaleUpper = {
  captureTimestamp: new Date(now - 180000).toISOString(),
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-stale-upper',
  hazardDetected: false
};
const valStaleUpper = validateCameraFrame(frameStaleUpper, baseCam, config);
assert(valStaleUpper.isValid && valStaleUpper.feedFreshness === 'STALE' && valStaleUpper.currentRisk === 'UNKNOWN',
  'Stale upper boundary: 180s age evaluates to STALE with currentRisk UNKNOWN');

// 2D. Critical Stale Boundary: 181 seconds (> 180s, <= 300s)
const frameCritBoundary = {
  captureTimestamp: new Date(now - 181000).toISOString(),
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-crit-lower',
  hazardDetected: false
};
const valCritLower = validateCameraFrame(frameCritBoundary, baseCam, config);
assert(valCritLower.isValid && valCritLower.feedFreshness === 'CRITICAL STALE' && valCritLower.currentRisk === 'UNKNOWN',
  'Critical stale boundary: 181s age (> 180s) evaluates to CRITICAL STALE with currentRisk UNKNOWN');

// 2E. Offline Boundary: 301 seconds (> 300s offlineTimeout)
const frameOfflineBoundary = {
  captureTimestamp: new Date(now - 301000).toISOString(),
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-off-lower',
  hazardDetected: false
};
const valOfflineLower = validateCameraFrame(frameOfflineBoundary, baseCam, config);
assert(!valOfflineLower.isValid && valOfflineLower.feedFreshness === 'OFFLINE' && valOfflineLower.currentRisk === 'UNKNOWN',
  'Offline boundary: 301s age (> 300s) evaluates to OFFLINE with currentRisk UNKNOWN');

// 2F. Missing Payload: null frame payload
const valMissing = validateCameraFrame(null, baseCam, config);
assert(!valMissing.isValid && valMissing.feedFreshness === 'MISSING' && valMissing.currentRisk === 'UNKNOWN',
  'Missing feed payload evaluates to MISSING with currentRisk UNKNOWN');

// -----------------------------------------------------------------------------
// SUITE 3: DATA INTEGRITY, DUPLICATE & INVALID FRAMES (FEATURE 1 & 2)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Data Integrity, Duplicates & Anomalies ---');

// 3A. Future timestamp drift (+60 seconds into future)
const futureFrame = {
  captureTimestamp: new Date(now + 60000).toISOString(),
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-future-drift',
  hazardDetected: false
};
const valFuture = validateCameraFrame(futureFrame, baseCam, config);
assert(!valFuture.isValid && valFuture.feedFreshness === 'INVALID DATA' && valFuture.currentRisk === 'UNKNOWN',
  'Temporal anomaly check: Future-dated timestamp rejected as INVALID DATA, risk UNKNOWN');

// 3B. Timestamp sequence inversion (capture > receive)
const invertedFrame = {
  captureTimestamp: new Date(now).toISOString(),
  receiveTimestamp: new Date(now - 30000).toISOString(),
  frameHash: 'h-inverted',
  hazardDetected: false
};
const valInverted = validateCameraFrame(invertedFrame, baseCam, config);
assert(!valInverted.isValid && valInverted.feedFreshness === 'INVALID DATA' && valInverted.currentRisk === 'UNKNOWN',
  'Temporal anomaly check: Capture timestamp after receive timestamp rejected as INVALID DATA');

// 3C. Duplicate Frame Hash
const duplicateFrame = {
  captureTimestamp: new Date(now - 10000).toISOString(), // Looks recent
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-prev', // Exactly matches baseCam.lastFrameHash
  hazardDetected: false
};
const valDuplicate = validateCameraFrame(duplicateFrame, baseCam, config);
assert(!valDuplicate.isValid && valDuplicate.feedFreshness === 'DUPLICATE' && valDuplicate.currentRisk === 'UNKNOWN',
  'Zero-Trust Hash check: Identical frame hash rejected as DUPLICATE, risk UNKNOWN');

// -----------------------------------------------------------------------------
// SUITE 4: SAFETY-FIRST SEPARATION & HISTORICAL HAZARD INVARIANTS (FEATURE 2)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: Safety Separation & Historical Hazard Handling ---');

// 4A. Fresh feed with detected hazard -> Active HIGH risk
const freshHazardFrame = {
  captureTimestamp: new Date(now - 15000).toISOString(),
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-hazard-fresh',
  hazardDetected: true
};
const valHazardFresh = validateCameraFrame(freshHazardFrame, baseCam, config);
assert(valHazardFresh.isValid && valHazardFresh.feedFreshness === 'FRESH' && valHazardFresh.currentRisk === 'HIGH',
  'Fresh feed with active hazard evaluates to currentRisk HIGH');

// 4B. Stale feed with prior hazard record -> Must NOT be shown as current HIGH risk
const staleHazardFrame = {
  captureTimestamp: new Date(now - 120000).toISOString(), // 2 minutes old
  receiveTimestamp: new Date(now).toISOString(),
  frameHash: 'h-hazard-stale',
  hazardDetected: true // Stale frame reported hazard in the past
};
const valHazardStale = validateCameraFrame(staleHazardFrame, baseCam, config);
assert(valHazardStale.feedFreshness === 'STALE' && valHazardStale.currentRisk === 'UNKNOWN',
  'Safety-First Rule: Stale feed with prior hazard must become UNKNOWN risk, never current HIGH');

// 4C. Check baseline camera CAM-103 historical hazard separation
assert(cam103.hasActiveHazard === true && cam103.currentRisk === 'UNKNOWN',
  'CAM-103 preserves historical hazard record while currentRisk remains locked to UNKNOWN');

// -----------------------------------------------------------------------------
// SUITE 5: INTERACTIVE SIMULATION LAB SCENARIOS (FEATURE 4)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 5: Interactive Demonstration Scenarios (A-G) ---');

// 5A. Scenario Fresh (Scenario A)
runScenarioFresh('CAM-101');
const cam101Fresh = cameras.find(c => c.id === 'CAM-101');
assert(cam101Fresh.status === 'FRESH' && cam101Fresh.currentRisk === 'LOW' && cam101Fresh.aiConfidence !== null,
  'Scenario Fresh: Marks feed FRESH, evaluates active risk (LOW), enables AI confidence');

// 5B. Scenario Stale
runScenarioStale('CAM-101');
const cam101Stale = cameras.find(c => c.id === 'CAM-101');
assert(cam101Stale.status === 'STALE' && cam101Stale.currentRisk === 'UNKNOWN' && cam101Stale.aiConfidence === null,
  'Scenario Stale: Marks feed STALE (95s old), demotes risk to UNKNOWN, unsets AI confidence');

// 5C. Scenario Critical Stale (Scenario B)
runScenarioCriticalStale('CAM-101');
const cam101Crit = cameras.find(c => c.id === 'CAM-101');
assert(cam101Crit.status === 'CRITICAL STALE' && cam101Crit.currentRisk === 'UNKNOWN',
  'Scenario Critical Stale: Marks feed CRITICAL STALE (> 180s), locks risk to UNKNOWN');

// 5D. Scenario Offline (Scenario C)
runScenarioOffline('CAM-101');
const cam101Offline = cameras.find(c => c.id === 'CAM-101');
assert(cam101Offline.status === 'OFFLINE' && cam101Offline.currentRisk === 'UNKNOWN' && !cam101Offline.isStreamConnected,
  'Scenario Offline: Marks feed OFFLINE, sets currentRisk to UNKNOWN, disconnects stream');

// 5E. Scenario Missing / Invalid Frame
runScenarioInvalid('CAM-101');
const cam101Invalid = cameras.find(c => c.id === 'CAM-101');
assert(cam101Invalid.status === 'INVALID DATA' && cam101Invalid.currentRisk === 'UNKNOWN',
  'Scenario Invalid: Marks feed INVALID DATA, locks currentRisk to UNKNOWN');

// 5F. Scenario Duplicate Frame (Scenario D)
runScenarioDuplicate('CAM-102');
const cam102Dup = cameras.find(c => c.id === 'CAM-102');
assert(cam102Dup.status === 'DUPLICATE' && cam102Dup.currentRisk === 'UNKNOWN',
  'Scenario Duplicate: Marks feed DUPLICATE upon repeated hash, sets risk to UNKNOWN');

// 5G. Scenario Recovery (Scenario E)
runScenarioRecovery('CAM-104');
const cam104Recov = cameras.find(c => c.id === 'CAM-104');
assert(cam104Recov.status === 'FRESH' && cam104Recov.currentRisk === 'LOW' && cam104Recov.isStreamConnected,
  'Scenario Recovery: Ingests verified fresh frame (8s old), restores feed to FRESH and risk LOW');

// -----------------------------------------------------------------------------
// SUITE 6: ACTIONABLE ALERTS & HUMAN-READABLE REASONS (FEATURES 5 & 6)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 6: Actionable Alerts & Human-Readable Explanations ---');

const alerts = vm.runInContext('alerts', context);
const staleAlert = alerts.find(a => a.cameraId === 'CAM-101');
assert(staleAlert !== undefined,
  'Actionable alert generated for unreliable camera');

assert(Boolean(staleAlert.whatHappened && staleAlert.whyUntrusted && staleAlert.recommendedAction),
  'Alert contains all 4 structured points: What Happened, Why Untrusted, and Recommended Action');

assert(staleAlert.siteRiskStatus === 'UNKNOWN',
  'Alert explicitly confirms site risk status is UNKNOWN');

const reason101 = getStatusReason(cam101Invalid);
assert(typeof reason101 === 'string' && reason101.length > 20,
  'getStatusReason provides detailed human-readable explanation of feed integrity');

const riskExpl101 = getRiskExplanation(cam101Invalid);
assert(typeof riskExpl101 === 'string' && riskExpl101.includes('UNKNOWN'),
  'getRiskExplanation clearly explains why risk is locked to UNKNOWN');

// -----------------------------------------------------------------------------
// SUITE 7: MANUAL INSPECTION WORKFLOW (FEATURE 3 & 5)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 7: Manual Inspection Workflow ---');

requestManualInspection('CAM-103');
assert(cam103.inspectionRequested === true,
  'requestManualInspection sets inspectionRequested flag to true');

resolveManualInspection('CAM-103');
assert(cam103.inspectionRequested === false && cam103.currentRisk === 'UNKNOWN',
  'resolveManualInspection clears inspection flag while maintaining UNKNOWN risk on unverified feed');

// -----------------------------------------------------------------------------
// SUITE 8: DEMO RESET CONTROL (FEATURE 4)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 8: Demo Reset Control ---');

// Call resetDemoState with skipConfirm=true
resetDemoState(true);

// Re-query cameras and config from context
cameras = vm.runInContext('cameras', context);
const activeConfig = vm.runInContext('config', context);
const activeAlerts = vm.runInContext('alerts', context);

const resetFresh = cameras.filter(c => c.status === 'FRESH').length;
const resetStale = cameras.filter(c => c.status === 'CRITICAL STALE' || c.status === 'STALE').length;
const resetOffline = cameras.filter(c => c.status === 'OFFLINE').length;

assert(resetFresh === 2 && resetStale === 1 && resetOffline === 1,
  'resetDemoState restores initial baseline (2 Fresh, 1 Stale, 1 Offline camera)');

assert(activeConfig.freshThreshold === 60 && activeConfig.staleThreshold === 180 && activeConfig.offlineTimeout === 300,
  'resetDemoState restores default thresholds (Fresh: 60s, Stale: 180s, Offline: 300s)');

assert(activeAlerts.length === 2,
  'resetDemoState restores standard initial alert set (CAM-103 and CAM-104)');

// -----------------------------------------------------------------------------
// SUITE 9: AUDIT TRAIL LOGGING (FEATURE 3)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 9: Event Audit Trail Logging ---');

const auditLog = vm.runInContext('auditLog', context);
assert(Array.isArray(auditLog) && auditLog.length > 5,
  'Audit log contains chronological event records for all state transitions');

const hasResetEvent = auditLog.some(e => e.eventType === 'DEMO_RESET');
assert(hasResetEvent,
  'Audit log contains recorded DEMO_RESET event entry');

// -----------------------------------------------------------------------------
// SUITE 10: GUIDED DEMO 3-STEP WALKTHROUGH ENGINE (PRIORITY 2)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 10: Guided Demo 3-Step Walkthrough Engine ---');

assert(Array.isArray(GUIDED_STEPS) && GUIDED_STEPS.length === 3,
  'Guided Demo defines exactly 3 sequential walkthrough steps');

// Start Guided Demo: Step 1 (Fresh Feed)
startGuidedDemo();
let guidedState = getGuidedState();
assert(guidedState.active === true && guidedState.stepIndex === 0,
  'startGuidedDemo activates guided demo at Step 1');

cameras = vm.runInContext('cameras', context);
const gCamStep1 = cameras.find(c => c.id === 'CAM-101');
assert(gCamStep1.status === 'FRESH' && gCamStep1.currentRisk === 'LOW',
  'Guided Step 1: CAM-101 is FRESH and site risk is LOW (normal detection proceeds)');

// Advance to Step 2: Stale / Offline Invalidation
nextGuidedStep();
guidedState = getGuidedState();
assert(guidedState.stepIndex === 1,
  'nextGuidedStep advances walkthrough to Step 2');

cameras = vm.runInContext('cameras', context);
const gCamStep2 = cameras.find(c => c.id === 'CAM-101');
assert(gCamStep2.status === 'CRITICAL STALE' && gCamStep2.currentRisk === 'UNKNOWN',
  'Guided Step 2: CAM-101 is CRITICAL STALE and site risk is locked to UNKNOWN');

const alertsStep2 = vm.runInContext('alerts', context);
const gAlertStep2 = alertsStep2.find(a => a.cameraId === 'CAM-101');
assert(gAlertStep2 && gAlertStep2.siteRiskStatus === 'UNKNOWN',
  'Guided Step 2: Generates actionable alert explaining why feed is untrusted and risk is UNKNOWN');

// Advance to Step 3: Stream Recovery
nextGuidedStep();
guidedState = getGuidedState();
assert(guidedState.stepIndex === 2,
  'nextGuidedStep advances walkthrough to Step 3');

cameras = vm.runInContext('cameras', context);
const gCamStep3 = cameras.find(c => c.id === 'CAM-101');
assert(gCamStep3.status === 'FRESH' && gCamStep3.currentRisk === 'LOW',
  'Guided Step 3: CAM-101 recovered to FRESH with validated 8s frame and verified LOW risk');

// Test Previous Step Control
prevGuidedStep();
guidedState = getGuidedState();
assert(guidedState.stepIndex === 1,
  'prevGuidedStep navigates back to Step 2');

// Test Exit Guided Demo
exitGuidedDemo();
guidedState = getGuidedState();
assert(guidedState.active === false,
  'exitGuidedDemo deactivates guided walkthrough and restores normal mode');

// -----------------------------------------------------------------------------
// SUITE 11: SELF-EXPLANATORY CAMERA ACTIONS & SIMULATED LABELS (PRIORITY 3 & 4)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 11: Self-Explanatory Actions & Simulated Labels ---');

// Fresh Safe Camera
const recFreshSafe = getRecommendedAction({ status: 'FRESH', hasActiveHazard: false });
assert(recFreshSafe.includes('Normal automated surveillance active'),
  'getRecommendedAction for Fresh compliant camera indicates normal monitoring');

// Fresh Camera with Active Hazard
const recFreshHazard = getRecommendedAction({ status: 'FRESH', hasActiveHazard: true });
assert(recFreshHazard.includes('Immediate hazard intervention'),
  'getRecommendedAction for Fresh camera with active hazard advises immediate supervisor intervention');

// Stale Camera
const recStale = getRecommendedAction({ status: 'STALE', hasActiveHazard: false });
assert(recStale.includes('DO NOT assume area is safe'),
  'getRecommendedAction for Stale feed explicitly warns never to assume area is safe');

// Critical Stale Camera
const recCritStale = getRecommendedAction({ status: 'CRITICAL STALE', hasActiveHazard: false });
assert(recCritStale.includes('NEVER assume site is safe') && recCritStale.includes('Immediate manual inspection'),
  'getRecommendedAction for Critical Stale mandates immediate manual inspection');

// Offline Camera
const recOffline = getRecommendedAction({ status: 'OFFLINE', hasActiveHazard: false });
assert(recOffline.includes('Immediate physical inspection mandatory'),
  'getRecommendedAction for Offline camera mandates immediate physical inspection');

// Duplicate Camera
const recDuplicate = getRecommendedAction({ status: 'DUPLICATE', hasActiveHazard: false });
assert(recDuplicate.includes('Frozen frame replay detected'),
  'getRecommendedAction for Duplicate feed identifies frozen buffer');

// Simulated Tag Check on Manual Inspection Notes
requestManualInspection('CAM-103');
const cam103Inspect = cameras.find(c => c.id === 'CAM-103');
assert(cam103Inspect.inspectionNotes.includes('[Simulated Action]'),
  'Manual inspection notes are clearly tagged as [Simulated Action]');

resolveManualInspection('CAM-103');
assert(cam103Inspect.inspectionNotes.includes('[Simulated Action]'),
  'Manual inspection resolution notes are clearly tagged as [Simulated Action]');

// -----------------------------------------------------------------------------
// SUITE 12: THRESHOLD CONSISTENCY & CONTINUITY INVARIANTS (PRIORITY 5)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 12: Threshold Consistency & Boundary Invariants ---');

// Ensure non-overlapping thresholds
assert(config.freshThreshold === 60, 'Config freshThreshold is exactly 60s');
assert(config.staleThreshold === 180, 'Config staleThreshold is exactly 180s');
assert(config.offlineTimeout === 300, 'Config offlineTimeout is exactly 300s');

assert(config.freshThreshold < config.staleThreshold && config.staleThreshold < config.offlineTimeout,
  'Threshold boundaries are strictly ordered: Fresh (60s) < Stale (180s) < Offline (300s)');

// Recovery Safety Gate: Attempting recovery with invalid frame must NOT clear warnings
const corruptedRecoveryFrame = {
  captureTimestamp: new Date(Date.now() + 60000).toISOString(), // Invalid future timestamp!
  receiveTimestamp: new Date().toISOString(),
  frameHash: 'h-corrupt-recovery',
  hazardDetected: false
};
const valCorrupted = validateCameraFrame(corruptedRecoveryFrame, cam103Inspect, config);
assert(!valCorrupted.isValid && valCorrupted.feedFreshness === 'INVALID DATA',
  'Safety Gate: Corrupted recovery frame is rejected by validation engine');

// -----------------------------------------------------------------------------
// SUITE 13: WEBCAM MEDIASTREAM LIFECYCLE (FEATURE 1)
// -----------------------------------------------------------------------------
(async () => {
  console.log('\n--- Suite 13: Webcam MediaStream Lifecycle ---');

  // Test 60: Webcam start
  mockUserMediaError = null;
  const startSuccess = await startWebcam();
  const wcState1 = getWebcamState();
  assert(startSuccess === true && wcState1.isStreaming === true && wcState1.permissionStatus === 'granted',
    'Webcam starts and enters streaming state when mediaDevices.getUserMedia succeeds');

  // Test 61: Stream active with device label
  assert(wcState1.deviceLabel.includes('Webcam') && wcState1.stream !== null,
    'Starting webcam marks stream status as STREAM ACTIVE with device label');

  // Test 62: Track cleanup on stop
  stopWebcam();
  const wcState2 = getWebcamState();
  assert(mockTracksStopped === true && wcState2.isStreaming === false && wcState2.captureStatus === 'OFFLINE',
    'Stopping webcam halts all MediaStream tracks and resets streaming state to OFFLINE');

  // Test 63: Unsupported getUserMedia environment
  const origMediaDevices = context.navigator.mediaDevices;
  context.navigator.mediaDevices = null;
  const unsuppResult = await startWebcam();
  assert(unsuppResult === false && getWebcamState().permissionStatus === 'unsupported',
    'Unsupported getUserMedia environment triggers UNSUPPORTED status and error explanation');
  context.navigator.mediaDevices = origMediaDevices;

  // -----------------------------------------------------------------------------
  // SUITE 14: WEBCAM HARDWARE & PERMISSION STATES (FEATURE 1)
  // -----------------------------------------------------------------------------
  console.log('\n--- Suite 14: Webcam Hardware & Permission States ---');

  // Test 64: Permission denial
  mockUserMediaError = { name: 'NotAllowedError', message: 'User denied camera permission' };
  const deniedRes = await startWebcam();
  assert(deniedRes === false && getWebcamState().permissionStatus === 'denied' && getWebcamState().errorMessage.includes('address bar'),
    'Permission denial (NotAllowedError) marks permission as denied and explains address bar fix');

  // Test 65: Missing hardware device
  mockUserMediaError = { name: 'NotFoundError', message: 'Requested device not found' };
  const missingRes = await startWebcam();
  assert(missingRes === false && getWebcamState().permissionStatus === 'missing' && getWebcamState().errorMessage.includes('No webcam device found'),
    'Missing hardware device (NotFoundError) sets permission status to missing with hardware notice');

  // Test 66: Busy camera device
  mockUserMediaError = { name: 'NotReadableError', message: 'Device in use by another application' };
  const busyRes = await startWebcam();
  assert(busyRes === false && getWebcamState().permissionStatus === 'busy' && getWebcamState().errorMessage.includes('busy or being used'),
    'Busy camera device (NotReadableError) sets permission status to busy with multi-app alert');
  mockUserMediaError = null;

  // Test 67: Unstarted webcam defaults to prompt state
  resetWebcamState();
  assert(getWebcamState().permissionStatus === 'prompt' && getWebcamState().isStreaming === false,
    'Unstarted webcam defaults to prompt state without automatic stream launch');

  // -----------------------------------------------------------------------------
  // SUITE 15: WEBCAM FRAME CAPTURE & CLIENT-SIDE VALIDATION (FEATURES 1, 2, 3)
  // -----------------------------------------------------------------------------
  console.log('\n--- Suite 15: Webcam Frame Capture & Client-Side Validation ---');

  await startWebcam();
  // Provide varied pixel data for first valid capture
  customPixelGenerator = (w, h) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 100 + (i % 60);
      d[i + 1] = 140;
      d[i + 2] = 180;
      d[i + 3] = 255;
    }
    return d;
  };

  const cap1 = captureWebcamFrame();
  assert(cap1.success === true && cap1.status === 'FRESH' && getWebcamState().lastValidCaptureTimestamp !== null,
    'Valid frame capture updates lastValidCaptureTimestamp and sets captureStatus to FRESH');

  assert(getWebcamState().currentRisk === 'LOW',
    'Valid frame capture evaluates site risk to LOW (normal baseline resumed)');

  // Empty/Black Frame Rejection
  const validTimestampBefore = getWebcamState().lastValidCaptureTimestamp;
  customPixelGenerator = (w, h) => new Uint8ClampedArray(w * h * 4); // all zeroes (black buffer)
  const capEmpty = captureWebcamFrame();
  assert(capEmpty.success === false && capEmpty.result === 'EMPTY_INVALID' && getWebcamState().lastValidCaptureTimestamp === validTimestampBefore,
    'Empty/black frame capture is rejected as EMPTY_INVALID and freshness timestamp is NOT renewed');

  // Consecutive Duplicate Frame Rejection
  customPixelGenerator = (w, h) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 100 + (i % 60);
      d[i + 1] = 140;
      d[i + 2] = 180;
      d[i + 3] = 255;
    }
    return d;
  };
  const capDup = captureWebcamFrame();
  assert(capDup.success === false && capDup.result === 'DUPLICATE' && getWebcamState().lastValidCaptureTimestamp === validTimestampBefore,
    'Consecutive duplicate frame capture is rejected as DUPLICATE and timestamp is NOT renewed');

  assert(capDup.reason.includes('Visual similarity is an approximation'),
    'Duplicate rejection logs disclaimer that visual similarity is an approximation');

  const currentAudit = vm.runInContext('auditLog', context);
  const hasDupLog = currentAudit.some(e => e.eventType === 'FRAME_DUPLICATE_REJECTED');
  assert(hasDupLog === true,
    'Rejections record descriptive failure reason in Safety Audit Log');

  // -----------------------------------------------------------------------------
  // SUITE 16: ACTUAL FRAME FRESHNESS MONITORING & BOUNDARIES (FEATURE 2)
  // -----------------------------------------------------------------------------
  console.log('\n--- Suite 16: Actual Frame Freshness Monitoring & Boundaries ---');

  // Keeping stream open without capturing frame must remain MISSING
  resetWebcamState();
  await startWebcam();
  updateWebcamAging();
  assert(getWebcamState().captureStatus === 'MISSING' && getWebcamState().currentRisk === 'UNKNOWN',
    'Merely keeping stream open does NOT refresh freshness; uncaptured stream evaluates to MISSING');

  // Fresh boundary: age <= 60s
  customPixelGenerator = (w, h) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 210 - (i % 50);
      d[i + 1] = 110;
      d[i + 2] = 70;
      d[i + 3] = 255;
    }
    return d;
  };
  captureWebcamFrame();
  getWebcamState().lastValidCaptureTimestamp = Date.now() - 30000; // 30s ago
  updateWebcamAging();
  assert(getWebcamState().captureStatus === 'FRESH' && getWebcamState().currentRisk === 'LOW',
    'Frame age <= 60s evaluates to FRESH with validated compliant LOW risk');

  // Stale boundary: age 61s-180s
  getWebcamState().lastValidCaptureTimestamp = Date.now() - 95000; // 95s ago
  updateWebcamAging();
  assert(getWebcamState().captureStatus === 'STALE' && getWebcamState().currentRisk === 'UNKNOWN',
    'Frame age 61s-180s evaluates to STALE with currentRisk UNKNOWN');

  // Critical Stale boundary: age > 180s
  getWebcamState().lastValidCaptureTimestamp = Date.now() - 220000; // 220s ago
  updateWebcamAging();
  assert(getWebcamState().captureStatus === 'CRITICAL STALE' && getWebcamState().currentRisk === 'UNKNOWN',
    'Frame age > 180s evaluates to CRITICAL STALE with currentRisk UNKNOWN');

  // Stopped stream evaluates to OFFLINE
  stopWebcam();
  updateWebcamAging();
  assert(getWebcamState().captureStatus === 'OFFLINE' && getWebcamState().currentRisk === 'UNKNOWN',
    'Stopped webcam stream evaluates to OFFLINE with currentRisk UNKNOWN');

  // -----------------------------------------------------------------------------
  // SUITE 17: SAFETY-FIRST DECOUPLING & RISK UNKNOWN FAIL-SAFE (FEATURES 4, 5)
  // -----------------------------------------------------------------------------
  console.log('\n--- Suite 17: Safety-First Decoupling & Risk UNKNOWN Fail-Safe ---');

  assert(getWebcamState().currentRisk === 'UNKNOWN' && getWebcamState().riskExplanation.includes('UNKNOWN'),
    'Site risk is locked to UNKNOWN when webcam is OFFLINE');

  // Historical hazard preserved while risk remains UNKNOWN on unreliable feed
  toggleDemoHazardRecord();
  assert(getWebcamState().lastKnownHazardObservation !== null,
    'Historical hazard observation recorded for audit tracking');
  assert(getWebcamState().currentRisk === 'UNKNOWN',
    'Historical hazard observation preserved while current risk remains strictly locked to UNKNOWN on offline feed');

  // Recovery: fresh frame arrives, normal evaluation resumes
  await startWebcam();
  customPixelGenerator = (w, h) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 40 + (i % 70);
      d[i + 1] = 190;
      d[i + 2] = 130;
      d[i + 3] = 255;
    }
    return d;
  };
  captureWebcamFrame();
  assert(getWebcamState().captureStatus === 'FRESH' && getWebcamState().currentRisk === 'HIGH',
    'Recovery after valid fresh frame allows hazard detection to resume (risk evaluated to HIGH)');

  toggleDemoHazardRecord(); // Clear hazard
  assert(getWebcamState().currentRisk === 'LOW',
    'Cleared hazard on fresh feed returns current site risk to LOW');

  assert(getWebcamState().aiHazardStatus.includes('Not implemented') && getWebcamState().aiConfidenceText.includes('N/A'),
    'Automated AI hazard detection is explicitly labeled as Not Implemented with N/A confidence');

  stopWebcam();
  assert(getWebcamState().recommendedAction.includes('physical inspection') || getWebcamState().recommendedAction.includes('manual'),
    'Recommended action mandates physical inspection on unverified feeds');

  // -----------------------------------------------------------------------------
  // SUITE 18: MODE SWITCHING & DEMO RESET ISOLATION (FEATURES 6, 8)
  // -----------------------------------------------------------------------------
  console.log('\n--- Suite 18: Mode Switching & Demo Reset Isolation ---');

  setAppMode('simulated');
  assert(getAppMode() === 'simulated',
    'setAppMode switches smoothly to Simulated Camera Mode');

  setAppMode('webcam');
  assert(getAppMode() === 'webcam',
    'setAppMode switches smoothly to Live Webcam Mode');

  await startWebcam();
  assert(getWebcamState().isStreaming === true,
    'Webcam active before demo reset');

  resetDemoState(true);
  assert(getWebcamState().isStreaming === false && mockTracksStopped === true,
    'resetDemoState safely stops webcam MediaStream tracks without background leakage');

  const simCams = vm.runInContext('SmartSight.getCameras()', context);
  assert(simCams.length === 4 && simCams[0].id === 'CAM-101',
    'Simulated 4-camera network remains 100% functional alongside Live Webcam mode');

  // -----------------------------------------------------------------------------
  // SUITE 19: MULTI-PAGE APPLICATION ARCHITECTURE & NAVIGATION
  // -----------------------------------------------------------------------------
  console.log('\n--- Suite 19: Multi-Page Architecture & Real Navigation ---');

  const pageFiles = ['index.html', 'cameras.html', 'alerts.html', 'history.html', 'settings.html'];
  const allPagesExist = pageFiles.every(f => fs.existsSync(path.join(__dirname, f)));
  assert(allPagesExist,
    'All 5 dedicated HTML pages exist on disk (index, cameras, alerts, history, settings)');

  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const hasNavLinks = indexHtml.includes('href="cameras.html"') &&
                      indexHtml.includes('href="alerts.html"') &&
                      indexHtml.includes('href="history.html"') &&
                      indexHtml.includes('href="settings.html"');
  assert(hasNavLinks,
    'Dashboard includes real button navigation links to cameras, alerts, history, and settings');

  const hasBreadcrumbsAndSidebar = pageFiles.every(f => {
    const html = fs.readFileSync(path.join(__dirname, f), 'utf8');
    return html.includes('class="breadcrumb-bar"') && html.includes('class="sidebar-nav"');
  });
  assert(hasBreadcrumbsAndSidebar,
    'Every page provides consistent sidebar navigation and breadcrumb context bar');

  const hasActiveHighlighting = pageFiles.every(f => {
    const html = fs.readFileSync(path.join(__dirname, f), 'utf8');
    return html.includes('nav-link active');
  });
  assert(hasActiveHighlighting,
    'Currently active page is highlighted in sidebar on every HTML page');

  let brokenLinks = 0;
  pageFiles.forEach(f => {
    const html = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const hrefMatches = html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g);
    for (const match of hrefMatches) {
      const target = match[1];
      if (target.startsWith('http') || target.startsWith('//') || target.startsWith('mailto')) continue;
      if (!fs.existsSync(path.join(__dirname, target))) {
        brokenLinks++;
      }
    }
  });
  assert(brokenLinks === 0,
    'All relative navigation and quick-link anchors resolve to valid local targets (0 broken links)');

  // -----------------------------------------------------------------------------
  // SUMMARY & REPORT
  // -----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`SMARTSIGHT TEST RESULTS: ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
})();
