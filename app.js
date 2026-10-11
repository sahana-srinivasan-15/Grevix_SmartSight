/**
 * SmartSight: Construction Safety Camera Reliability Monitor
 * Client-Side Industrial Surveillance Reliability Engine
 * 
 * CORE PRINCIPLE:
 * A missing or stale camera feed must NEVER be interpreted as proof that a construction site is safe.
 * 
 * Grevix AfterCode 24h Hackathon
 */

// ============================================================================
// 1. CONFIGURATION & STATE MANAGEMENT
// ============================================================================

const DEFAULT_CONFIG = {
  freshThreshold: 60,      // <= 60s: FRESH
  staleThreshold: 180,     // 61s - 180s: STALE; > 180s: CRITICAL STALE
  offlineTimeout: 300,     // > 300s: OFFLINE
  agingSpeedMultiplier: 1, // 1x = 1 real sec per sec; 5x, 10x accelerated
  isAgingPaused: false
};

// Global App State
let config = { ...DEFAULT_CONFIG };

// Load settings from localStorage if available
try {
  const savedConfig = localStorage.getItem('smartsight_config');
  if (savedConfig) {
    config = { ...config, ...JSON.parse(savedConfig) };
  }
} catch (e) {
  console.warn('LocalStorage not accessible for config:', e);
}

// Initial Simulated Cameras Specification
const INITIAL_CAMERAS = [
  {
    id: 'CAM-101',
    name: 'North Access Gate',
    zone: 'Ingress & Vehicle Crossing',
    backupCamera: 'CAM-105 (Gate South)',
    telemetryAvailable: true,
    batteryPercent: 88,
    status: 'FRESH',
    lastUploadOffsetSec: 18, // 18 seconds ago
    lastCaptureOffsetSec: 19,
    lastFrameHash: 'h-gate-90812',
    lastObservation: 'Worker & heavy truck passing. High-vis vest & hardhat verified.',
    lastObservationTimeOffsetSec: 19,
    aiConfidence: 96,
    hasActiveHazard: false,
    activeHazardDesc: null,
    currentRisk: 'LOW', // Verified safe because feed is FRESH and 0 hazards detected
    inspectionRequested: false,
    inspectionNotes: null,
    isStreamConnected: true,
    sceneType: 'gate'
  },
  {
    id: 'CAM-102',
    name: 'Scaffold Zone B',
    zone: 'High-Elevation Structural Work',
    backupCamera: 'None (Sole Viewport)',
    telemetryAvailable: true,
    batteryPercent: 74,
    status: 'FRESH',
    lastUploadOffsetSec: 34,
    lastCaptureOffsetSec: 35,
    lastFrameHash: 'h-scaff-34190',
    lastObservation: 'Worker at elevation (Level 4) without tied fall arrest harness.',
    lastObservationTimeOffsetSec: 35,
    aiConfidence: 92,
    hasActiveHazard: true,
    activeHazardDesc: 'Fall Arrest Violation: Worker unclipped at height',
    currentRisk: 'HIGH', // High risk because feed is FRESH and active hazard is verified
    inspectionRequested: false,
    inspectionNotes: null,
    isStreamConnected: true,
    sceneType: 'scaffold'
  },
  {
    id: 'CAM-103',
    name: 'Material Storage',
    zone: 'Crane Rigging & Laydown Area',
    backupCamera: 'CAM-107 (Yard East)',
    telemetryAvailable: false, // No telemetry: battery failure MUST NOT be assumed
    batteryPercent: null,
    status: 'CRITICAL STALE',
    lastUploadOffsetSec: 240, // 4 minutes ago
    lastCaptureOffsetSec: 242,
    lastFrameHash: 'h-store-11048',
    lastObservation: 'Worker without safety helmet near overhead boom swing.',
    lastObservationTimeOffsetSec: 242,
    aiConfidence: null, // Confidence cannot be validated on stale feed
    hasActiveHazard: true, // Historical record only!
    activeHazardDesc: 'Historical Hazard: Hardhat omission near rigging',
    currentRisk: 'UNKNOWN', // CORE RULE: Stale feed CANNOT confirm current condition!
    inspectionRequested: false,
    inspectionNotes: null,
    isStreamConnected: true,
    sceneType: 'storage'
  },
  {
    id: 'CAM-104',
    name: 'East Excavation',
    zone: 'Trenching & Deep Pit Perimeter',
    backupCamera: 'None (Critical Solo Coverage)',
    telemetryAvailable: false,
    batteryPercent: null,
    status: 'OFFLINE',
    lastUploadOffsetSec: 420, // 7 minutes ago
    lastCaptureOffsetSec: 423,
    lastFrameHash: 'h-trench-00871',
    lastObservation: 'Excavator operating within 1.5m of unbarricaded trench edge.',
    lastObservationTimeOffsetSec: 423,
    aiConfidence: null,
    hasActiveHazard: false,
    activeHazardDesc: null,
    currentRisk: 'UNKNOWN', // CORE RULE: Offline feed is ALWAYS UNKNOWN risk
    inspectionRequested: true, // In initial demo, CAM-104 already has inspection requested
    inspectionNotes: 'Auto-dispatched alert: Signal dropped for > 5 minutes.',
    isStreamConnected: false,
    sceneType: 'excavation'
  }
];

// Active cameras state deep-cloned
let cameras = JSON.parse(JSON.stringify(INITIAL_CAMERAS));

// Initial Simulated Alerts
let alerts = [
  {
    id: 'ALT-103-STALE',
    cameraId: 'CAM-103',
    cameraName: 'Material Storage',
    severity: 'warning',
    reason: 'Camera upload delayed beyond 180s threshold (Feed is CRITICAL STALE).',
    lastObservation: 'Worker without helmet near gantry (Recorded 4 min ago).',
    recommendedAction: 'Feed stale. Current site condition cannot be verified. Request immediate manual inspection or switch to backup CAM-107.',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    isDismissibleWithoutConfirm: false
  },
  {
    id: 'ALT-104-OFFLINE',
    cameraId: 'CAM-104',
    cameraName: 'East Excavation',
    severity: 'critical',
    reason: 'Feed heartbeat lost. Last successful upload > 5 minutes ago (OFFLINE).',
    lastObservation: 'Excavator near trench edge.',
    recommendedAction: 'CAM-104 is offline. Trench conditions cannot be verified. Immediate physical inspection required.',
    timestamp: new Date(Date.now() - 420000).toISOString(),
    isDismissibleWithoutConfirm: false
  }
];

// Event Audit Log
let auditLog = [
  {
    id: 'EVT-001',
    timestamp: new Date(Date.now() - 425000).toISOString(),
    cameraId: 'CAM-104',
    eventType: 'HEARTBEAT_LOST',
    severity: 'failure',
    description: 'Transmission stopped. Camera heartbeat packet timed out.',
    feedState: 'OFFLINE',
    riskImpact: 'UNKNOWN'
  },
  {
    id: 'EVT-002',
    timestamp: new Date(Date.now() - 420000).toISOString(),
    cameraId: 'CAM-104',
    eventType: 'INSPECTION_REQUESTED',
    severity: 'warning',
    description: 'Automated manual safety inspection request initiated.',
    feedState: 'OFFLINE',
    riskImpact: 'UNKNOWN'
  },
  {
    id: 'EVT-003',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    cameraId: 'CAM-103',
    eventType: 'FEED_STALE_CRITICAL',
    severity: 'warning',
    description: 'Image age exceeded 180s threshold. Demoted to CRITICAL STALE.',
    feedState: 'CRITICAL STALE',
    riskImpact: 'UNKNOWN'
  },
  {
    id: 'EVT-004',
    timestamp: new Date(Date.now() - 34000).toISOString(),
    cameraId: 'CAM-102',
    eventType: 'HAZARD_DETECTED',
    severity: 'warning',
    description: 'AI model verified: Worker at elevation without harness (Confidence 92%).',
    feedState: 'FRESH',
    riskImpact: 'HIGH'
  },
  {
    id: 'EVT-005',
    timestamp: new Date(Date.now() - 18000).toISOString(),
    cameraId: 'CAM-101',
    eventType: 'FRAME_VALIDATED',
    severity: 'info',
    description: 'Fresh frame ingested. Hash verified unique. All PPE compliant.',
    feedState: 'FRESH',
    riskImpact: 'LOW'
  }
];

// UI Filters
let currentCameraFilter = 'all';
let currentLogFilter = 'all';
let selectedCameraIdForModal = null;

// ============================================================================
// 2. CORE SAFETY DATA VALIDATION ENGINE (Section 5 & 6)
// ============================================================================

/**
 * Reusable Frame Validation Engine
 * 
 * Evaluates simulated incoming frame payload against strict safety rules.
 * Enforces separation between:
 * 1. Feed Freshness
 * 2. AI Confidence
 * 3. Current Site Hazard Risk
 * 
 * @param {Object} frame - Incoming image packet metadata
 * @param {Object} camera - Existing camera state
 * @param {Object} cfg - Validation thresholds
 * @returns {Object} ValidationResult
 */
function validateCameraFrame(frame, camera, cfg) {
  const now = Date.now();
  const captureTime = new Date(frame.captureTimestamp).getTime();
  const receiveTime = new Date(frame.receiveTimestamp).getTime();

  // Rule 1: Check timestamp validity
  if (isNaN(captureTime) || isNaN(receiveTime)) {
    return {
      isValid: false,
      feedFreshness: 'INVALID DATA',
      reason: 'Malformed or missing timestamp headers.',
      allowHazardInference: false,
      currentRisk: 'UNKNOWN'
    };
  }

  // Rule 2: Prevent future-dated images (tolerance 2000ms for clock drift)
  if (captureTime > now + 2000) {
    return {
      isValid: false,
      feedFreshness: 'INVALID DATA',
      reason: `Future-dated frame rejected (Capture time is ${Math.round((captureTime - now) / 1000)}s in the future).`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN'
    };
  }

  // Rule 3: Validate timestamp ordering (capture must precede or equal receive)
  if (captureTime > receiveTime + 1000) {
    return {
      isValid: false,
      feedFreshness: 'INVALID DATA',
      reason: 'Temporal anomaly: Capture timestamp is later than server receive timestamp.',
      allowHazardInference: false,
      currentRisk: 'UNKNOWN'
    };
  }

  // Rule 4: Duplicate frame detection (hash match with identical visual content)
  if (frame.frameHash && camera && camera.lastFrameHash === frame.frameHash) {
    return {
      isValid: false,
      feedFreshness: 'DUPLICATE',
      reason: `Duplicate frame hash detected (${frame.frameHash}). Camera feed may be frozen or looping.`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN' // Do NOT trust fresh receive time if content is duplicate!
    };
  }

  // Calculate age from actual capture moment
  const imageAgeSec = Math.max(0, Math.floor((now - captureTime) / 1000));

  // Rule 5: Evaluate freshness thresholds
  if (imageAgeSec <= cfg.freshThreshold) {
    return {
      isValid: true,
      imageAgeSec,
      feedFreshness: 'FRESH',
      reason: `Image age (${imageAgeSec}s) is within fresh threshold (≤ ${cfg.freshThreshold}s).`,
      allowHazardInference: true, // Only fresh frames can evaluate live site risk
      currentRisk: frame.hazardDetected ? 'HIGH' : 'LOW'
    };
  } else if (imageAgeSec <= cfg.staleThreshold) {
    return {
      isValid: true,
      imageAgeSec,
      feedFreshness: 'STALE',
      reason: `Image age (${imageAgeSec}s) exceeds fresh threshold. Feed degraded.`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN' // Safety Rule: Stale feed cannot verify safety!
    };
  } else if (imageAgeSec <= cfg.offlineTimeout) {
    return {
      isValid: true,
      imageAgeSec,
      feedFreshness: 'CRITICAL STALE',
      reason: `Image age (${imageAgeSec}s) exceeds stale threshold (180s). Feed critically stale.`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN'
    };
  } else {
    return {
      isValid: false,
      imageAgeSec,
      feedFreshness: 'OFFLINE',
      reason: `Image age (${imageAgeSec}s) exceeds offline timeout (≥ ${cfg.offlineTimeout}s).`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN'
    };
  }
}

/**
 * Recalculate camera's live status based on elapsed time
 */
function updateCameraAging(camera) {
  if (!camera.isStreamConnected) {
    camera.status = 'OFFLINE';
    camera.currentRisk = 'UNKNOWN';
    return;
  }

  const age = camera.lastUploadOffsetSec;

  if (camera.status === 'DUPLICATE') {
    camera.currentRisk = 'UNKNOWN';
    return;
  }

  if (age <= config.freshThreshold) {
    camera.status = 'FRESH';
    // If fresh, risk is determined by verified hazard
    camera.currentRisk = camera.hasActiveHazard ? 'HIGH' : 'LOW';
  } else if (age <= config.staleThreshold) {
    camera.status = 'STALE';
    camera.currentRisk = 'UNKNOWN'; // CORE SAFETY RULE
  } else if (age <= config.offlineTimeout) {
    camera.status = 'CRITICAL STALE';
    camera.currentRisk = 'UNKNOWN'; // CORE SAFETY RULE
  } else {
    camera.status = 'OFFLINE';
    camera.currentRisk = 'UNKNOWN'; // CORE SAFETY RULE
    camera.isStreamConnected = false;
  }
}

// ============================================================================
// 3. SIMULATION SCENARIO HANDLERS (Section 4)
// ============================================================================

/**
 * Scenario A — Fresh Image
 * Ingests a new live frame. Feed becomes FRESH, AI model evaluates hazards.
 */
function runScenarioA(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  const now = Date.now();
  const randomHash = 'h-' + Math.random().toString(36).substring(2, 8);
  
  // Decide hazard state for this camera
  let newHazard = false;
  let hazardDesc = null;
  let observation = '';

  if (camera.id === 'CAM-102') {
    // CAM-102 is scaffold zone - demonstrate active PPE hazard detection
    newHazard = true;
    hazardDesc = 'Fall Arrest Violation: Worker unclipped at height';
    observation = 'Worker observed on high platform without tethered safety harness.';
  } else if (camera.id === 'CAM-103') {
    // If CAM-103 recovers with fresh frame, worker has now put on helmet
    newHazard = false;
    observation = 'Worker equipped with approved MSA safety helmet. Area clear of hazards.';
  } else {
    newHazard = false;
    observation = 'Area surveyed. All workers wearing required high-vis and hardhats.';
  }

  const framePayload = {
    captureTimestamp: new Date(now - 12000).toISOString(), // 12 seconds old
    receiveTimestamp: new Date(now).toISOString(),
    frameHash: randomHash,
    hazardDetected: newHazard
  };

  const validation = validateCameraFrame(framePayload, camera, config);

  camera.isStreamConnected = true;
  camera.status = validation.feedFreshness;
  camera.lastUploadOffsetSec = 12;
  camera.lastCaptureOffsetSec = 13;
  camera.lastFrameHash = randomHash;
  camera.lastObservation = observation;
  camera.lastObservationTimeOffsetSec = 13;
  camera.aiConfidence = Math.floor(90 + Math.random() * 8);
  camera.hasActiveHazard = newHazard;
  camera.activeHazardDesc = hazardDesc;
  camera.currentRisk = validation.currentRisk;
  camera.inspectionRequested = false; // Fresh valid frame satisfies inspection need

  // Clear any active stale/offline alert for this camera
  resolveCameraAlerts(camera.id);

  // Log in Audit Trail
  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_A_FRESH',
    severity: 'info',
    description: `Scenario A executed: Ingested fresh frame (${camera.lastUploadOffsetSec}s old). Hash: ${randomHash}. AI confidence: ${camera.aiConfidence}%.`,
    feedState: camera.status,
    riskImpact: camera.currentRisk
  });

  showToast(`Scenario A: ${camera.id} updated with fresh image. Status: FRESH.`, 'success');
  renderDashboard();
}

/**
 * Scenario B — Stale Image
 * Ingests a frame captured 5 minutes ago (300s). Status becomes CRITICAL STALE.
 * Current risk is demoted to UNKNOWN.
 */
function runScenarioB(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  const now = Date.now();
  const staleOffsetSec = 300; // 5 minutes old
  const staleHash = 'h-stale-' + Math.random().toString(36).substring(2, 7);

  const framePayload = {
    captureTimestamp: new Date(now - staleOffsetSec * 1000).toISOString(),
    receiveTimestamp: new Date(now).toISOString(),
    frameHash: staleHash,
    hazardDetected: camera.hasActiveHazard
  };

  const validation = validateCameraFrame(framePayload, camera, config);

  camera.isStreamConnected = true;
  camera.status = 'CRITICAL STALE';
  camera.lastUploadOffsetSec = staleOffsetSec;
  camera.lastCaptureOffsetSec = staleOffsetSec + 2;
  camera.lastFrameHash = staleHash;
  camera.aiConfidence = null; // Do NOT claim high confidence on 5min old image
  camera.currentRisk = 'UNKNOWN'; // CORE SAFETY PRINCIPLE

  // Trigger Actionable Stale Alert
  createOrUpdateAlert({
    id: `ALT-${camera.id}-STALE`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'warning',
    reason: `Image captured ${Math.floor(staleOffsetSec / 60)} minutes ago. Feed is CRITICAL STALE.`,
    lastObservation: `${camera.lastObservation} (Historical only).`,
    recommendedAction: `${camera.id} feed is stale. Current safety cannot be verified. Request immediate manual verification.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_B_STALE',
    severity: 'warning',
    description: `Scenario B: 5-minute-old frame received. Feed marked CRITICAL STALE. Risk set to UNKNOWN.`,
    feedState: 'CRITICAL STALE',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario B: ${camera.id} received 5-min-old image. Risk: UNKNOWN.`, 'warning');
  renderDashboard();
}

/**
 * Scenario C — Offline or Missing Feed
 * Camera feed connection lost. Mark OFFLINE, risk UNKNOWN, inspection alert.
 */
function runScenarioC(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  camera.isStreamConnected = false;
  camera.status = 'OFFLINE';
  camera.lastUploadOffsetSec = Math.max(camera.lastUploadOffsetSec, config.offlineTimeout + 60);
  camera.aiConfidence = null;
  camera.currentRisk = 'UNKNOWN'; // CORE SAFETY PRINCIPLE

  createOrUpdateAlert({
    id: `ALT-${camera.id}-OFFLINE`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'critical',
    reason: `Feed transmission halted. No frames received beyond ${config.offlineTimeout}s timeout.`,
    lastObservation: camera.lastObservation,
    recommendedAction: `${camera.id} is offline. Site conditions cannot be verified. Request immediate manual inspection.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_C_OFFLINE',
    severity: 'failure',
    description: `Scenario C: Stream disconnected. Feed OFFLINE. Site risk marked UNKNOWN.`,
    feedState: 'OFFLINE',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario C: ${camera.id} is OFFLINE. Site risk cannot be verified.`, 'danger');
  renderDashboard();
}

/**
 * Scenario D — Duplicate Frame
 * Identical image content / frame hash transmitted.
 * Must NOT be trusted as fresh even if server upload timestamp is recent!
 */
function runScenarioD(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  const now = Date.now();
  // Reuse existing camera hash to simulate static frame loop / camera buffer stuck
  const repeatedHash = camera.lastFrameHash || 'h-frozen-0001';

  const framePayload = {
    captureTimestamp: new Date(now - 10000).toISOString(), // Looks recent
    receiveTimestamp: new Date(now).toISOString(),
    frameHash: repeatedHash, // BUT identical hash to previous!
    hazardDetected: false
  };

  const validation = validateCameraFrame(framePayload, camera, config);

  camera.status = 'DUPLICATE';
  camera.aiConfidence = null;
  camera.currentRisk = 'UNKNOWN'; // Zero-Trust: duplicate frame cannot prove site safety!

  createOrUpdateAlert({
    id: `ALT-${camera.id}-DUPLICATE`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'warning',
    reason: `Duplicate frame hash detected (${repeatedHash}). Feed appears frozen or replaying.`,
    lastObservation: `${camera.lastObservation} (Frozen visual buffer).`,
    recommendedAction: `${camera.id} is sending duplicate frames. Feed cannot be verified as live. Inspect camera hardware.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_D_DUPLICATE',
    severity: 'warning',
    description: `Scenario D: Duplicate frame hash detected (${repeatedHash}). Feed rejected as unverified. Risk set to UNKNOWN.`,
    feedState: 'DUPLICATE',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario D: Duplicate frame detected on ${camera.id}. Risk: UNKNOWN.`, 'warning');
  renderDashboard();
}

/**
 * Scenario E — Camera Recovery
 * Restores an offline or degraded camera with a genuinely fresh validated frame.
 */
function runScenarioE(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  const now = Date.now();
  const recoveredHash = 'h-recov-' + Math.random().toString(36).substring(2, 8);

  const framePayload = {
    captureTimestamp: new Date(now - 8000).toISOString(),
    receiveTimestamp: new Date(now).toISOString(),
    frameHash: recoveredHash,
    hazardDetected: false // Default recovered to clean state unless CAM-102
  };

  const validation = validateCameraFrame(framePayload, camera, config);

  camera.isStreamConnected = true;
  camera.status = 'FRESH';
  camera.lastUploadOffsetSec = 8;
  camera.lastCaptureOffsetSec = 9;
  camera.lastFrameHash = recoveredHash;
  camera.lastObservation = 'Feed re-established. Live scanning active. Area clean.';
  camera.lastObservationTimeOffsetSec = 9;
  camera.aiConfidence = 94;
  camera.hasActiveHazard = false;
  camera.activeHazardDesc = null;
  camera.currentRisk = 'LOW';
  camera.inspectionRequested = false;

  // Clear alerts for this camera
  resolveCameraAlerts(camera.id);

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_E_RECOVERY',
    severity: 'recovery',
    description: `Scenario E: Camera ${camera.id} recovered. Fresh frame verified (8s old). Normal safety monitoring resumed.`,
    feedState: 'FRESH',
    riskImpact: 'LOW'
  });

  showToast(`Scenario E: ${camera.id} successfully recovered with fresh frame!`, 'success');
  renderDashboard();
}

// ============================================================================
// 4. MANUAL INSPECTION WORKFLOW (Section 9)
// ============================================================================

function requestManualInspection(camId) {
  const camera = cameras.find(c => c.id === camId);
  if (!camera) return;

  camera.inspectionRequested = true;
  camera.inspectionNotes = `Simulated dispatch: Safety inspector requested at ${new Date().toLocaleTimeString()} by operator.`;

  addAuditLog({
    cameraId: camera.id,
    eventType: 'MANUAL_INSPECTION_REQ',
    severity: 'warning',
    description: `Supervisor manual inspection dispatched for ${camera.id} (${camera.name}).`,
    feedState: camera.status,
    riskImpact: camera.currentRisk
  });

  showToast(`Manual Inspection Requested for ${camera.id}. Safety patrol dispatched (Simulated).`, 'warning');
  renderDashboard();
  if (selectedCameraIdForModal === camId) {
    renderModalContent(camera);
  }
}

function resolveManualInspection(camId) {
  const camera = cameras.find(c => c.id === camId);
  if (!camera) return;

  camera.inspectionRequested = false;
  camera.inspectionNotes = `Physical patrol completed at ${new Date().toLocaleTimeString()}. Perimeter inspected physically.`;

  // IMPORTANT: Note that resolving physical patrol notes does NOT magically make
  // a dead camera feed FRESH! The feed remains in its state until fresh images arrive!
  addAuditLog({
    cameraId: camera.id,
    eventType: 'MANUAL_INSPECTION_RESOLVED',
    severity: 'info',
    description: `Physical patrol confirmed zone clear. Camera feed remains ${camera.status} pending fresh stream ingestion.`,
    feedState: camera.status,
    riskImpact: camera.status === 'FRESH' ? camera.currentRisk : 'UNKNOWN'
  });

  showToast(`Physical inspection logged for ${camera.id}. Feed integrity still requires fresh images.`, 'info');
  renderDashboard();
  if (selectedCameraIdForModal === camId) {
    renderModalContent(camera);
  }
}

// ============================================================================
// 5. ALERT SYSTEM HELPERS
// ============================================================================

function createOrUpdateAlert(newAlert) {
  const existingIdx = alerts.findIndex(a => a.cameraId === newAlert.cameraId);
  if (existingIdx >= 0) {
    alerts[existingIdx] = { ...alerts[existingIdx], ...newAlert, timestamp: new Date().toISOString() };
  } else {
    alerts.unshift({
      ...newAlert,
      timestamp: new Date().toISOString()
    });
  }
}

function resolveCameraAlerts(camId) {
  alerts = alerts.filter(a => a.cameraId !== camId);
}

function dismissAlert(alertId) {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return;

  // Confirmation rule: Do not let users dismiss unresolved critical conditions without confirmation!
  if (alert.severity === 'critical' || alert.severity === 'warning') {
    openConfirmDialog(
      'Dismiss Critical Safety Alert?',
      `Alert for ${alert.cameraId} indicates an unresolved condition (${alert.reason}). Dismissing this will remove it from the active dashboard, but current site risk remains UNKNOWN until a fresh camera feed is verified.`,
      () => {
        alerts = alerts.filter(a => a.id !== alertId);
        addAuditLog({
          cameraId: alert.cameraId,
          eventType: 'ALERT_DISMISSED',
          severity: 'info',
          description: `User acknowledged and dismissed ${alert.severity.toUpperCase()} alert (${alert.id}).`,
          feedState: 'UNRESOLVED',
          riskImpact: 'UNKNOWN'
        });
        showToast(`Alert for ${alert.cameraId} dismissed with supervisor confirmation.`, 'info');
        renderDashboard();
      }
    );
  } else {
    alerts = alerts.filter(a => a.id !== alertId);
    renderDashboard();
  }
}

// ============================================================================
// 6. EVENT AUDIT LOG & CSV EXPORT (Section 8)
// ============================================================================

function addAuditLog(entry) {
  const newLog = {
    id: 'EVT-' + String(auditLog.length + 1).padStart(3, '0'),
    timestamp: new Date().toISOString(),
    ...entry
  };
  auditLog.unshift(newLog);
  // Cap at 100 entries
  if (auditLog.length > 100) auditLog.pop();
}

function exportAuditLogCSV() {
  if (auditLog.length === 0) {
    showToast('Audit log is empty.', 'info');
    return;
  }

  const headers = ['Event ID', 'Timestamp', 'Camera ID', 'Event Type', 'Severity', 'Description', 'Feed State', 'Risk Impact'];
  const rows = auditLog.map(e => [
    `"${e.id}"`,
    `"${new Date(e.timestamp).toLocaleString()}"`,
    `"${e.cameraId}"`,
    `"${e.eventType}"`,
    `"${e.severity.toUpperCase()}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${e.feedState}"`,
    `"${e.riskImpact}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smartsight_safety_audit_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Audit log exported successfully as CSV.', 'success');
}

// ============================================================================
// 7. HUD VIEWPORT CANVAS GENERATOR (Simulated Camera Video)
// ============================================================================

/**
 * Draws an authentic industrial CCTV viewport without using fake misleading photos.
 * Uses wireframe vector construction site models, grid overlays, crosshairs,
 * detection bounding boxes, and timestamp stamps.
 */
function drawCameraViewport(canvas, camera) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Background dark surveillance grade
  ctx.fillStyle = '#0b111e';
  ctx.fillRect(0, 0, width, height);

  if (camera.status === 'OFFLINE' || !camera.isStreamConnected) {
    // Draw static noise / test card pattern
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Subtle noise lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Centered offline warning graphic
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO SIGNAL — CARRIER LOSS', width / 2, height / 2 - 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px "Inter", sans-serif';
    ctx.fillText('FEED TIMEOUT EXCEEDED', width / 2, height / 2 + 12);
    return;
  }

  // Draw simulated construction scene background based on sceneType
  drawSceneVector(ctx, width, height, camera.sceneType);

  // If stale, apply amber tint wash
  if (camera.status === 'STALE' || camera.status === 'CRITICAL STALE') {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    ctx.fillRect(0, 0, width, height);
  }

  // If duplicate, apply purple tint wash
  if (camera.status === 'DUPLICATE') {
    ctx.fillStyle = 'rgba(139, 92, 246, 0.18)';
    ctx.fillRect(0, 0, width, height);
  }

  // Draw Camera HUD / Crosshair Elements
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;

  // Corner brackets
  const bSize = 14;
  const m = 12;
  // Top-left
  ctx.beginPath(); ctx.moveTo(m, m + bSize); ctx.lineTo(m, m); ctx.lineTo(m + bSize, m); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(width - m - bSize, m); ctx.lineTo(width - m, m); ctx.lineTo(width - m, m + bSize); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(m, height - m - bSize); ctx.lineTo(m, height - m); ctx.lineTo(m + bSize, height - m); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(width - m - bSize, height - m); ctx.lineTo(width - m, height - m); ctx.lineTo(width - m, height - m - bSize); ctx.stroke();

  // Center subtle reticle
  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // Draw simulated AI Detection Bounding Boxes
  drawAiDetections(ctx, width, height, camera);
}

function drawSceneVector(ctx, w, h, sceneType) {
  // Horizon and ground plane
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  // Perspective ground grid
  for (let x = -w * 0.5; x <= w * 1.5; x += 40) {
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.55);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Structures depending on zone
  if (sceneType === 'scaffold') {
    // Scaffolding lattice towers
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    const sx = w * 0.25;
    const sw = w * 0.5;
    ctx.strokeRect(sx, h * 0.15, sw, h * 0.55);
    // Horizontal platforms
    for (let y = h * 0.25; y < h * 0.7; y += 30) {
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + sw, y); ctx.stroke();
      // Cross braces
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + sw, y + 30); ctx.stroke();
    }
  } else if (sceneType === 'gate') {
    // Security gate & barrier arm
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.1, h * 0.35, 40, h * 0.35); // guard booth
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.55); ctx.lineTo(w * 0.7, h * 0.55); ctx.stroke(); // boom gate
  } else if (sceneType === 'storage') {
    // Tower crane mast and rigging container
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.65, h * 0.1, 24, h * 0.6); // crane mast
    // Laydown containers
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(w * 0.15, h * 0.45, 90, 45);
    ctx.strokeRect(w * 0.15, h * 0.45, 90, 45);
  } else if (sceneType === 'excavation') {
    // Trench cut silhouette
    ctx.fillStyle = '#090e17';
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.6);
    ctx.lineTo(w * 0.4, h * 0.85);
    ctx.lineTo(w * 0.85, h * 0.85);
    ctx.lineTo(w * 0.9, h * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawAiDetections(ctx, w, h, camera) {
  // If feed is fresh with active hazard (CAM-102)
  if (camera.status === 'FRESH' && camera.hasActiveHazard) {
    const bx = w * 0.42;
    const by = h * 0.22;
    const bw = 55;
    const bh = 85;

    // Red warning bounding box
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // Label tag
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bx, by - 18, bw + 60, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`NO HARNESS [${camera.aiConfidence}%]`, bx + 4, by - 5);
  } else if (camera.status === 'FRESH' && !camera.hasActiveHazard) {
    // Green verified bounding box
    const bx = w * 0.35;
    const by = h * 0.38;
    const bw = 48;
    const bh = 75;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // Label tag
    ctx.fillStyle = '#10b981';
    ctx.fillRect(bx, by - 18, bw + 45, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`PPE OK [${camera.aiConfidence}%]`, bx + 4, by - 5);
  } else if (camera.status === 'CRITICAL STALE' || camera.status === 'STALE') {
    // Amber historical ghost box
    const bx = w * 0.25;
    const by = h * 0.35;
    const bw = 55;
    const bh = 80;

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillRect(bx, by - 18, bw + 75, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`HISTORICAL GHOST (STALE)`, bx + 4, by - 5);
  } else if (camera.status === 'DUPLICATE') {
    // Duplicate warning badge centered
    ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
    ctx.fillRect(w * 0.15, h * 0.4, w * 0.7, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DUPLICATE FRAME DETECTED', w / 2, h * 0.4 + 16);
    ctx.font = '9px "Inter", sans-serif';
    ctx.fillText('IDENTICAL HASH — REPLAY WARNING', w / 2, h * 0.4 + 28);
  }
}

// ============================================================================
// 8. DASHBOARD RENDERING & UI UPDATES
// ============================================================================

function renderDashboard() {
  renderSummaryKPIs();
  renderCameraGrid();
  renderAlertsList();
  renderAuditTable();
  renderSidebarHealthWidget();

  // Re-trigger Lucide icon replacement
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function renderSummaryKPIs() {
  const total = cameras.length;
  const fresh = cameras.filter(c => c.status === 'FRESH').length;
  const stale = cameras.filter(c => c.status === 'STALE' || c.status === 'CRITICAL STALE').length;
  const offline = cameras.filter(c => c.status === 'OFFLINE' || c.status === 'INVALID DATA').length;
  // Note: Only active verified hazards on FRESH feeds count!
  const activeVerifiedHazards = cameras.filter(c => c.status === 'FRESH' && c.hasActiveHazard).length;

  document.getElementById('kpi-total-cameras').textContent = total;
  document.getElementById('kpi-fresh-feeds').textContent = fresh;
  document.getElementById('kpi-stale-feeds').textContent = stale;
  document.getElementById('kpi-offline-feeds').textContent = offline;
  document.getElementById('kpi-verified-hazards').textContent = activeVerifiedHazards;

  // Threshold values in subtext
  document.querySelectorAll('.threshold-fresh-val').forEach(el => el.textContent = config.freshThreshold);
  document.querySelectorAll('.threshold-offline-val').forEach(el => el.textContent = config.offlineTimeout);
}

function renderSidebarHealthWidget() {
  const freshCount = cameras.filter(c => c.status === 'FRESH').length;
  const staleCount = cameras.filter(c => c.status === 'STALE' || c.status === 'CRITICAL STALE').length;
  const offlineCount = cameras.filter(c => c.status === 'OFFLINE').length;
  const total = cameras.length || 1;
  const freshPct = Math.round((freshCount / total) * 100);

  const freshPctEl = document.getElementById('sidebar-fresh-pct');
  const progressFill = document.getElementById('sidebar-progress-fill');
  const badge = document.getElementById('overall-health-badge');

  if (freshPctEl) freshPctEl.textContent = `${freshPct}%`;
  if (progressFill) progressFill.style.width = `${freshPct}%`;

  if (badge) {
    if (freshPct >= 75) {
      badge.textContent = 'HEALTHY';
      badge.className = 'widget-status status-healthy';
    } else if (freshPct >= 50) {
      badge.textContent = 'DEGRADED';
      badge.className = 'widget-status status-degraded';
    } else {
      badge.textContent = 'CRITICAL';
      badge.className = 'widget-status status-critical';
    }
  }

  // Update nav pills
  const navCam = document.getElementById('nav-camera-count');
  const navAlert = document.getElementById('nav-alert-count');
  if (navCam) navCam.textContent = cameras.length;
  if (navAlert) navAlert.textContent = alerts.length;
}

function renderCameraGrid() {
  const grid = document.getElementById('cameras-grid');
  if (!grid) return;

  // Filter cameras
  const filtered = cameras.filter(cam => {
    if (currentCameraFilter === 'all') return true;
    if (currentCameraFilter === 'fresh') return cam.status === 'FRESH';
    if (currentCameraFilter === 'stale') return cam.status === 'STALE' || cam.status === 'CRITICAL STALE';
    if (currentCameraFilter === 'offline') return cam.status === 'OFFLINE';
    return true;
  });

  grid.innerHTML = filtered.map(camera => {
    const statusBadgeClass = getStatusBadgeClass(camera.status);
    const riskBadgeClass = getRiskBadgeClass(camera.currentRisk);

    const isStaleOrOffline = camera.status !== 'FRESH';
    const inspectionBadge = camera.inspectionRequested ? `
      <span class="badge-status badge-inspection">
        <i data-lucide="clipboard-check"></i> INSPECTION REQUESTED
      </span>
    ` : '';

    return `
      <article class="camera-card" id="card-${camera.id}">
        <!-- Header -->
        <div class="cam-card-header">
          <div class="cam-meta-left">
            <span class="cam-id-tag">${camera.id}</span>
            <div class="cam-title-wrap">
              <h3 class="cam-name">${camera.name}</h3>
              <span class="cam-zone">${camera.zone}</span>
            </div>
          </div>
          <div class="cam-status-badges">
            ${inspectionBadge}
            <span class="badge-status ${statusBadgeClass}">${camera.status}</span>
          </div>
        </div>

        <!-- Viewport HUD -->
        <div class="cam-viewport-wrapper">
          <canvas id="canvas-${camera.id}" class="cam-canvas" width="480" height="200"></canvas>
          
          <div class="cam-hud-top">
            <span class="hud-rec">
              <span class="rec-dot ${camera.status === 'FRESH' ? 'active' : (camera.status === 'OFFLINE' ? 'dead' : 'frozen')}"></span>
              ${camera.status === 'FRESH' ? 'REC LIVE' : (camera.status === 'OFFLINE' ? 'LOST' : 'STALLED')}
            </span>
            <span class="hud-cam-id">${camera.id} • ${camera.sceneType.toUpperCase()}</span>
          </div>

          ${camera.status === 'CRITICAL STALE' ? `
            <div class="cam-stale-watermark">
              <i data-lucide="alert-triangle"></i> CRITICAL STALE — NOT LIVE
            </div>
          ` : ''}

          <div class="cam-hud-bottom">
            <span class="hud-timestamp">AGE: ${formatTimeAge(camera.lastUploadOffsetSec)}</span>
            <span class="hud-disclaimer">SIMULATED SURVEILLANCE FEED</span>
          </div>
        </div>

        <!-- The Safety Triad: 3 Explicitly Separated Metrics (Requirement 6) -->
        <div class="safety-triad-grid">
          <div class="triad-col">
            <span class="triad-label">1. Feed Freshness</span>
            <span class="triad-value ${statusBadgeClass}">
              ${camera.status}
            </span>
            <span class="triad-sub">${formatTimeAge(camera.lastUploadOffsetSec)} ago</span>
          </div>

          <div class="triad-col">
            <span class="triad-label">2. AI Confidence</span>
            <span class="triad-value">
              ${camera.aiConfidence ? `${camera.aiConfidence}%` : '<span class="text-dim">N/A (Unverified)</span>'}
            </span>
            <span class="triad-sub">${camera.aiConfidence ? 'Bounding box verified' : 'Feed unreliable'}</span>
          </div>

          <div class="triad-col">
            <span class="triad-label">3. Current Site Risk</span>
            <span class="triad-value ${riskBadgeClass}">
              ${camera.currentRisk}
            </span>
            <span class="triad-sub">
              ${camera.currentRisk === 'UNKNOWN' ? 'Cannot confirm safety' : (camera.currentRisk === 'HIGH' ? 'Active hazard' : 'Verified safe')}
            </span>
          </div>
        </div>

        <!-- Card Body Observations -->
        <div class="cam-card-body">
          <div class="hazard-observation-box ${camera.hasActiveHazard ? 'has-hazard' : ''} ${camera.status !== 'FRESH' ? 'is-historical' : ''}">
            <span class="obs-label">${camera.status === 'FRESH' ? 'Latest AI Observation' : 'Last Known Observation (Historical)'}:</span>
            <p class="obs-text">${camera.lastObservation}</p>
            <span class="obs-meta">Observation offset: ${formatTimeAge(camera.lastObservationTimeOffsetSec)} ago</span>
          </div>

          <div class="cam-time-meta">
            <span>Last Upload: <strong>${camera.isStreamConnected ? `${formatTimeAge(camera.lastUploadOffsetSec)} ago` : 'Disconnected'}</strong></span>
            <span>Frame Hash: <strong>${camera.lastFrameHash ? camera.lastFrameHash.slice(0, 10) : 'None'}</strong></span>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="cam-card-footer">
          <button class="btn btn-outline btn-sm view-details-btn" data-cam-id="${camera.id}">
            <i data-lucide="eye"></i> View Details
          </button>
          
          ${isStaleOrOffline ? `
            ${camera.inspectionRequested ? `
              <button class="btn btn-success btn-sm resolve-inspect-btn" data-cam-id="${camera.id}">
                <i data-lucide="check-check"></i> Resolve Patrol
              </button>
            ` : `
              <button class="btn btn-warning btn-sm request-inspect-btn" data-cam-id="${camera.id}">
                <i data-lucide="clipboard-alert"></i> Request Manual Inspection
              </button>
            `}
          ` : `
            <button class="btn btn-secondary btn-sm test-stale-btn" data-cam-id="${camera.id}" title="Simulate stale delay">
              <i data-lucide="fast-forward"></i> Age Feed
            </button>
          `}
        </div>
      </article>
    `;
  }).join('');

  // Render viewports for each card
  filtered.forEach(camera => {
    const canvas = document.getElementById(`canvas-${camera.id}`);
    if (canvas) {
      drawCameraViewport(canvas, camera);
    }
  });

  // Attach card event listeners
  attachCardEvents();
}

function attachCardEvents() {
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const camId = btn.getAttribute('data-cam-id');
      openCameraModal(camId);
    });
  });

  document.querySelectorAll('.request-inspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const camId = btn.getAttribute('data-cam-id');
      requestManualInspection(camId);
    });
  });

  document.querySelectorAll('.resolve-inspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const camId = btn.getAttribute('data-cam-id');
      resolveManualInspection(camId);
    });
  });

  document.querySelectorAll('.test-stale-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const camId = btn.getAttribute('data-cam-id');
      runScenarioB(camId);
    });
  });
}

function renderAlertsList() {
  const container = document.getElementById('alerts-container');
  const countBadge = document.getElementById('active-alert-badge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${alerts.length} Active`;
  }

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="alert-empty-state">
        <i data-lucide="check-circle-2"></i>
        <strong>All Camera Feeds Operating Reliably</strong>
        <p>No stale, duplicate, or disconnected feeds detected. Real-time safety validation active.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = alerts.map(alert => `
    <div class="alert-item alert-${alert.severity}" id="alert-${alert.id}">
      <div class="alert-item-icon">
        <i data-lucide="${alert.severity === 'critical' ? 'alert-octagon' : (alert.severity === 'warning' ? 'alert-triangle' : 'info')}"></i>
      </div>
      <div class="alert-item-content">
        <div class="alert-item-header">
          <span class="alert-cam-id">${alert.cameraId}</span>
          <h4 class="alert-title">${alert.cameraName}</h4>
          <span class="alert-severity-badge severity-${alert.severity}">${alert.severity}</span>
        </div>
        <p class="alert-desc"><strong>Reason:</strong> ${alert.reason}</p>
        <p class="alert-desc"><strong>Last Known Observation:</strong> ${alert.lastObservation}</p>
        <div class="alert-action-rec">
          <i data-lucide="arrow-right-circle"></i> <strong>Recommended Action:</strong> ${alert.recommendedAction}
        </div>
      </div>
      <div class="alert-item-actions">
        <button class="btn btn-sm btn-outline alert-inspect-btn" data-cam-id="${alert.cameraId}">
          <i data-lucide="clipboard-alert"></i> Inspect
        </button>
        <button class="btn btn-sm btn-secondary alert-dismiss-btn" data-alert-id="${alert.id}">
          <i data-lucide="check"></i> Dismiss
        </button>
      </div>
    </div>
  `).join('');

  // Attach alert listeners
  container.querySelectorAll('.alert-inspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const camId = btn.getAttribute('data-cam-id');
      requestManualInspection(camId);
    });
  });

  container.querySelectorAll('.alert-dismiss-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const alertId = btn.getAttribute('data-alert-id');
      dismissAlert(alertId);
    });
  });
}

function renderAuditTable() {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;

  const filtered = auditLog.filter(log => {
    if (currentLogFilter === 'all') return true;
    if (currentLogFilter === 'warning') return log.severity === 'warning';
    if (currentLogFilter === 'failure') return log.severity === 'failure';
    if (currentLogFilter === 'recovery') return log.severity === 'recovery';
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 20px; color: var(--slate-400);">No audit log events match this filter.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(log => `
    <tr>
      <td class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</td>
      <td class="log-cam">${log.cameraId}</td>
      <td><span class="log-type-badge">${log.eventType}</span></td>
      <td><span class="alert-severity-badge severity-${log.severity === 'failure' ? 'critical' : log.severity}">${log.severity}</span></td>
      <td>${log.description}</td>
      <td><span class="badge-status ${getStatusBadgeClass(log.feedState)}">${log.feedState}</span></td>
      <td><span class="${getRiskBadgeClass(log.riskImpact)}">${log.riskImpact}</span></td>
    </tr>
  `).join('');
}

// ============================================================================
// 9. MODALS: CAMERA DETAILS, SETTINGS, CHALLENGE CARD & CONFIRMATION
// ============================================================================

function openCameraModal(camId) {
  selectedCameraIdForModal = camId;
  const camera = cameras.find(c => c.id === camId);
  if (!camera) return;

  const modal = document.getElementById('camera-modal-backdrop');
  document.getElementById('modal-camera-id').textContent = camera.id;
  document.getElementById('modal-camera-title').textContent = `${camera.name} — Detailed Diagnostics`;

  renderModalContent(camera);
  modal.removeAttribute('hidden');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function renderModalContent(camera) {
  const body = document.getElementById('modal-body-content');
  const footerActions = document.getElementById('modal-primary-actions');

  const now = Date.now();
  const simulatedCaptureTime = new Date(now - camera.lastCaptureOffsetSec * 1000).toLocaleString();
  const simulatedReceiveTime = new Date(now - camera.lastUploadOffsetSec * 1000).toLocaleString();

  // Telemetry check rule (Section 5): "Do not infer that a camera's battery has failed unless battery telemetry is actually available. If unavailable, report that the cause of the camera failure is unknown."
  const batteryReport = camera.telemetryAvailable && camera.batteryPercent !== null
    ? `${camera.batteryPercent}% (Telemetry Verified)`
    : 'Unknown (No battery telemetry available on this unit)';

  body.innerHTML = `
    <!-- Top Metadata Grid -->
    <div class="modal-grid-2">
      <div class="modal-detail-card">
        <span class="detail-label">Site Area & Zone</span>
        <span class="detail-value">${camera.zone}</span>
      </div>
      <div class="modal-detail-card">
        <span class="detail-label">Backup Camera Overlap</span>
        <span class="detail-value">${camera.backupCamera}</span>
      </div>
      <div class="modal-detail-card">
        <span class="detail-label">Hardware Battery Telemetry</span>
        <span class="detail-value">${batteryReport}</span>
      </div>
      <div class="modal-detail-card">
        <span class="detail-label">Active Inspection Request</span>
        <span class="detail-value">${camera.inspectionRequested ? '<span class="text-stale">REQUESTED</span>' : 'None Active'}</span>
      </div>
    </div>

    <!-- The 3 Separated Metrics -->
    <div>
      <h4 class="modal-section-title">The Three Safety Separation Rules</h4>
      <div class="safety-triad-grid" style="border: 1px solid var(--slate-200); border-radius: var(--radius-md);">
        <div class="triad-col">
          <span class="triad-label">Feed Freshness</span>
          <span class="triad-value ${getStatusBadgeClass(camera.status)}">${camera.status}</span>
          <span class="triad-sub">Age: ${formatTimeAge(camera.lastUploadOffsetSec)}</span>
        </div>
        <div class="triad-col">
          <span class="triad-label">AI Confidence</span>
          <span class="triad-value">${camera.aiConfidence ? `${camera.aiConfidence}%` : 'N/A'}</span>
          <span class="triad-sub">${camera.status === 'FRESH' ? 'Verified on live frame' : 'Zero trust on degraded feed'}</span>
        </div>
        <div class="triad-col">
          <span class="triad-label">Current Site Risk</span>
          <span class="triad-value ${getRiskBadgeClass(camera.currentRisk)}">${camera.currentRisk}</span>
          <span class="triad-sub">${camera.currentRisk === 'UNKNOWN' ? 'Safety cannot be proven' : 'Verified'}</span>
        </div>
      </div>
    </div>

    <!-- Timestamp & Validation Breakdown -->
    <div>
      <h4 class="modal-section-title">Validation Rule Checks</h4>
      <table class="validation-table">
        <thead>
          <tr>
            <th>Safety Rule</th>
            <th>Observed Metric</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Timestamp Ordering</strong></td>
            <td>Capture: ${simulatedCaptureTime}<br>Receive: ${simulatedReceiveTime}</td>
            <td class="check-pass">PASS (Capture ≤ Receive)</td>
          </tr>
          <tr>
            <td><strong>Freshness Threshold</strong></td>
            <td>Age: ${camera.lastUploadOffsetSec}s (Threshold: ${config.freshThreshold}s)</td>
            <td class="${camera.lastUploadOffsetSec <= config.freshThreshold ? 'check-pass' : 'check-fail'}">
              ${camera.lastUploadOffsetSec <= config.freshThreshold ? 'PASS (Fresh)' : 'DEGRADED (Exceeded)'}
            </td>
          </tr>
          <tr>
            <td><strong>Frame Hash Uniqueness</strong></td>
            <td>Hash: <code>${camera.lastFrameHash || 'N/A'}</code></td>
            <td class="${camera.status === 'DUPLICATE' ? 'check-fail' : 'check-pass'}">
              ${camera.status === 'DUPLICATE' ? 'FAIL (Duplicate Hash)' : 'PASS (Unique)'}
            </td>
          </tr>
          <tr>
            <td><strong>Site Risk Safety Rule</strong></td>
            <td>Feed is ${camera.status}</td>
            <td class="${camera.status === 'FRESH' ? 'check-pass' : 'check-fail'}">
              ${camera.status === 'FRESH' ? 'Normal Hazard Detection' : 'FAIL-SAFE: Risk set to UNKNOWN'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Observation & Notes -->
    <div class="hazard-observation-box ${camera.hasActiveHazard ? 'has-hazard' : ''}">
      <span class="obs-label">Observation Record:</span>
      <p class="obs-text">${camera.lastObservation}</p>
      ${camera.inspectionNotes ? `<p style="margin-top:4px; font-size:0.75rem; color:var(--slate-600);"><strong>Inspection Notes:</strong> ${camera.inspectionNotes}</p>` : ''}
    </div>
  `;

  // Modal actions
  footerActions.innerHTML = `
    ${camera.inspectionRequested ? `
      <button class="btn btn-success modal-action-resolve" data-cam-id="${camera.id}">
        <i data-lucide="check"></i> Resolve Physical Inspection
      </button>
    ` : `
      <button class="btn btn-warning modal-action-inspect" data-cam-id="${camera.id}">
        <i data-lucide="clipboard-alert"></i> Request Manual Inspection
      </button>
    `}
    <button class="btn btn-primary modal-action-fresh" data-cam-id="${camera.id}">
      <i data-lucide="refresh-cw"></i> Inject Fresh Frame
    </button>
  `;

  footerActions.querySelector('.modal-action-inspect')?.addEventListener('click', () => {
    requestManualInspection(camera.id);
  });
  footerActions.querySelector('.modal-action-resolve')?.addEventListener('click', () => {
    resolveManualInspection(camera.id);
  });
  footerActions.querySelector('.modal-action-fresh')?.addEventListener('click', () => {
    runScenarioA(camera.id);
    renderModalContent(camera);
  });
}

function closeCameraModal() {
  document.getElementById('camera-modal-backdrop').setAttribute('hidden', '');
  selectedCameraIdForModal = null;
}

// Confirmation Dialog Helper
let confirmProceedCallback = null;
function openConfirmDialog(title, message, onProceed) {
  const modal = document.getElementById('confirm-modal-backdrop');
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-body').textContent = message;
  confirmProceedCallback = onProceed;
  modal.removeAttribute('hidden');
}

function closeConfirmDialog() {
  document.getElementById('confirm-modal-backdrop').setAttribute('hidden', '');
  confirmProceedCallback = null;
}

// ============================================================================
// 10. REAL-TIME TICKER & AGE SIMULATION
// ============================================================================

function setupLiveClockAndAging() {
  const clockEl = document.getElementById('live-clock');

  setInterval(() => {
    // 1. Live system clock
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString();
    }

    // 2. Dynamic aging if not paused
    if (!config.isAgingPaused) {
      const increment = config.agingSpeedMultiplier;
      cameras.forEach(camera => {
        camera.lastUploadOffsetSec += increment;
        camera.lastCaptureOffsetSec += increment;
        camera.lastObservationTimeOffsetSec += increment;

        // Auto transition fresh -> stale -> offline if timeout reached
        updateCameraAging(camera);
      });

      // Update UI counts and cards dynamically
      renderSummaryKPIs();
      renderSidebarHealthWidget();

      // Update text in open cards without re-rendering everything
      cameras.forEach(camera => {
        const card = document.getElementById(`card-${camera.id}`);
        if (card) {
          const canvas = document.getElementById(`canvas-${camera.id}`);
          if (canvas) drawCameraViewport(canvas, camera);
        }
      });
    }
  }, 1000);
}

// ============================================================================
// 11. HELPER FORMATTERS
// ============================================================================

function formatTimeAge(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `${mins}m ${remSec}s`;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'FRESH': return 'badge-fresh';
    case 'STALE': return 'badge-stale';
    case 'CRITICAL STALE': return 'badge-critical-stale';
    case 'OFFLINE': return 'badge-offline';
    case 'DUPLICATE': return 'badge-duplicate';
    default: return 'badge-invalid';
  }
}

function getRiskBadgeClass(risk) {
  switch (risk) {
    case 'LOW': return 'risk-low';
    case 'HIGH': return 'risk-high';
    default: return 'risk-unknown';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle-2' : (type === 'danger' ? 'alert-octagon' : (type === 'warning' ? 'alert-triangle' : 'info'))}" class="toast-icon"></i>
    <div class="toast-body">
      <span class="toast-title">${type.toUpperCase()}</span>
      <span class="toast-message">${message}</span>
    </div>
  `;

  container.appendChild(toast);
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Reset Demo State
function resetDemoState() {
  openConfirmDialog(
    'Reset Demo State?',
    'This will restore the initial demonstration scenario (2 Fresh, 1 Stale, 1 Offline camera) and default threshold configurations.',
    () => {
      cameras = JSON.parse(JSON.stringify(INITIAL_CAMERAS));
      config = { ...DEFAULT_CONFIG };
      alerts = [
        {
          id: 'ALT-103-STALE',
          cameraId: 'CAM-103',
          cameraName: 'Material Storage',
          severity: 'warning',
          reason: 'Camera upload delayed beyond 180s threshold (Feed is CRITICAL STALE).',
          lastObservation: 'Worker without helmet near gantry (Recorded 4 min ago).',
          recommendedAction: 'Feed stale. Current site condition cannot be verified. Request immediate manual inspection or switch to backup CAM-107.',
          timestamp: new Date().toISOString()
        },
        {
          id: 'ALT-104-OFFLINE',
          cameraId: 'CAM-104',
          cameraName: 'East Excavation',
          severity: 'critical',
          reason: 'Feed heartbeat lost. Last successful upload > 5 minutes ago (OFFLINE).',
          lastObservation: 'Excavator near trench edge.',
          recommendedAction: 'CAM-104 is offline. Trench conditions cannot be verified. Immediate physical inspection required.',
          timestamp: new Date().toISOString()
        }
      ];

      addAuditLog({
        cameraId: 'SYSTEM',
        eventType: 'DEMO_RESET',
        severity: 'info',
        description: 'Demonstration scenario reset to initial baseline state.',
        feedState: 'INITIALIZED',
        riskImpact: 'NORMALIZED'
      });

      try {
        localStorage.removeItem('smartsight_config');
      } catch (e) {}

      showToast('Demo state successfully reset to initial scenario.', 'info');
      renderDashboard();
    }
  );
}

// ============================================================================
// 12. INITIALIZATION & GLOBAL EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Setup clock & ticker
  setupLiveClockAndAging();

  // Initial render
  renderDashboard();

  // Header controls
  document.getElementById('reset-demo-header-btn')?.addEventListener('click', resetDemoState);
  document.getElementById('reset-demo-sidebar-btn')?.addEventListener('click', resetDemoState);

  // Pause/Resume ticker
  const tickerBtn = document.getElementById('toggle-ticker-btn');
  tickerBtn?.addEventListener('click', () => {
    config.isAgingPaused = !config.isAgingPaused;
    const tickerIcon = document.getElementById('ticker-icon');
    const tickerText = document.getElementById('ticker-text');
    if (config.isAgingPaused) {
      tickerText.textContent = 'Resume Aging';
      tickerBtn.classList.add('btn-warning');
      showToast('Dynamic time aging paused.', 'info');
    } else {
      tickerText.textContent = 'Pause Aging';
      tickerBtn.classList.remove('btn-warning');
      showToast('Dynamic time aging resumed.', 'info');
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // Scenario Buttons
  const getSelectedCam = () => document.getElementById('simulation-target-select').value;
  document.getElementById('btn-scenario-a')?.addEventListener('click', () => runScenarioA(getSelectedCam()));
  document.getElementById('btn-scenario-b')?.addEventListener('click', () => runScenarioB(getSelectedCam()));
  document.getElementById('btn-scenario-c')?.addEventListener('click', () => runScenarioC(getSelectedCam()));
  document.getElementById('btn-scenario-d')?.addEventListener('click', () => runScenarioD(getSelectedCam()));
  document.getElementById('btn-scenario-e')?.addEventListener('click', () => runScenarioE(getSelectedCam()));

  // Camera Grid Filter Pills
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCameraFilter = btn.getAttribute('data-filter');
      renderCameraGrid();
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // Audit Log Filter Buttons
  document.querySelectorAll('.log-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLogFilter = btn.getAttribute('data-log-filter');
      renderAuditTable();
    });
  });

  // Export CSV & Clear Log
  document.getElementById('export-csv-btn')?.addEventListener('click', exportAuditLogCSV);
  document.getElementById('clear-log-btn')?.addEventListener('click', () => {
    auditLog = [];
    renderAuditTable();
    showToast('Displayed audit log cleared.', 'info');
  });

  // Settings Modal Handlers
  const settingsModal = document.getElementById('settings-modal-backdrop');
  const openSettings = () => {
    document.getElementById('threshold-fresh-input').value = config.freshThreshold;
    document.getElementById('threshold-stale-input').value = config.staleThreshold;
    document.getElementById('threshold-offline-input').value = config.offlineTimeout;
    document.getElementById('aging-speed-input').value = config.agingSpeedMultiplier;
    settingsModal.removeAttribute('hidden');
    if (window.lucide) window.lucide.createIcons();
  };

  document.getElementById('header-settings-btn')?.addEventListener('click', openSettings);
  document.getElementById('open-settings-btn')?.addEventListener('click', openSettings);
  document.getElementById('settings-close-btn')?.addEventListener('click', () => settingsModal.setAttribute('hidden', ''));

  document.getElementById('settings-save-btn')?.addEventListener('click', () => {
    config.freshThreshold = parseInt(document.getElementById('threshold-fresh-input').value, 10) || 60;
    config.staleThreshold = parseInt(document.getElementById('threshold-stale-input').value, 10) || 180;
    config.offlineTimeout = parseInt(document.getElementById('threshold-offline-input').value, 10) || 300;
    config.agingSpeedMultiplier = parseInt(document.getElementById('aging-speed-input').value, 10) || 1;

    try {
      localStorage.setItem('smartsight_config', JSON.stringify(config));
    } catch (e) {}

    settingsModal.setAttribute('hidden', '');
    showToast('Validation thresholds saved successfully.', 'success');
    renderDashboard();
  });

  document.getElementById('settings-reset-default-btn')?.addEventListener('click', () => {
    config = { ...DEFAULT_CONFIG };
    document.getElementById('threshold-fresh-input').value = config.freshThreshold;
    document.getElementById('threshold-stale-input').value = config.staleThreshold;
    document.getElementById('threshold-offline-input').value = config.offlineTimeout;
    document.getElementById('aging-speed-input').value = config.agingSpeedMultiplier;
    try {
      localStorage.removeItem('smartsight_config');
    } catch (e) {}
    showToast('Defaults restored in settings.', 'info');
  });

  // Challenge Card Context Modal
  const challengeModal = document.getElementById('challenge-modal-backdrop');
  document.getElementById('open-challenge-info-btn')?.addEventListener('click', () => {
    challengeModal.removeAttribute('hidden');
    if (window.lucide) window.lucide.createIcons();
  });
  document.getElementById('challenge-close-btn')?.addEventListener('click', () => challengeModal.setAttribute('hidden', ''));
  document.getElementById('challenge-modal-dismiss-btn')?.addEventListener('click', () => challengeModal.setAttribute('hidden', ''));

  // Camera Details Modal Close
  document.getElementById('modal-close-btn')?.addEventListener('click', closeCameraModal);
  document.getElementById('modal-secondary-action')?.addEventListener('click', closeCameraModal);

  // Confirmation Modal Handlers
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeConfirmDialog);
  document.getElementById('confirm-proceed-btn')?.addEventListener('click', () => {
    if (confirmProceedCallback) confirmProceedCallback();
    closeConfirmDialog();
  });

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  document.getElementById('mobile-sidebar-open')?.addEventListener('click', () => sidebar.classList.add('open'));
  document.getElementById('mobile-sidebar-close')?.addEventListener('click', () => sidebar.classList.remove('open'));

  // Keyboard Escape Handler for Accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!settingsModal.hasAttribute('hidden')) settingsModal.setAttribute('hidden', '');
      if (!challengeModal.hasAttribute('hidden')) challengeModal.setAttribute('hidden', '');
      if (!document.getElementById('camera-modal-backdrop').hasAttribute('hidden')) closeCameraModal();
      if (!document.getElementById('confirm-modal-backdrop').hasAttribute('hidden')) closeConfirmDialog();
    }
  });

  // Backdrop click to close modals
  [settingsModal, challengeModal, document.getElementById('camera-modal-backdrop'), document.getElementById('confirm-modal-backdrop')].forEach(m => {
    m?.addEventListener('click', (e) => {
      if (e.target === m) {
        m.setAttribute('hidden', '');
      }
    });
  });
});
