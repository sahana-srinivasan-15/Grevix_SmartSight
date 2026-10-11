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
// Clearly Documented Configurable Feed Reliability Thresholds (Feature 1)
// ============================================================================

const DEFAULT_CONFIG = {
  // FRESH: image age up to 60 seconds (<= 60s)
  freshThreshold: 60,
  // STALE: image age greater than 60s and up to 180 seconds (61s - 180s)
  staleThreshold: 180,
  // CRITICAL STALE: image age greater than 180s (> 180s) up to offline timeout
  // OFFLINE / MISSING: no valid feed received or camera disconnected (> 300s)
  offlineTimeout: 300,
  // Demo Aging Speed Multiplier (1x = real time; 5x, 10x accelerated)
  agingSpeedMultiplier: 1,
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

/**
 * Human-readable integrity reason for camera state (Feature 6)
 * @param {Object} camera
 * @returns {string} Human-readable reason
 */
function getStatusReason(camera) {
  if (!camera) return 'Unknown camera state.';
  if (!camera.isStreamConnected || camera.status === 'OFFLINE') {
    return `Camera stream disconnected. No valid frames received for ${formatTimeAge(camera.lastUploadOffsetSec)} (> ${config.offlineTimeout}s timeout).`;
  }
  if (camera.status === 'DUPLICATE') {
    return `Identical frame hash detected (${camera.lastFrameHash ? camera.lastFrameHash.slice(0, 10) : 'N/A'}). Camera buffer appears frozen or looping.`;
  }
  if (camera.status === 'INVALID DATA' || camera.status === 'MISSING') {
    return `Validation engine rejected frame: corrupted payload or temporal anomaly detected.`;
  }
  if (camera.status === 'CRITICAL STALE') {
    return `Last valid image received ${formatTimeAge(camera.lastUploadOffsetSec)} ago (> ${config.staleThreshold}s critical threshold). Feed severely outdated.`;
  }
  if (camera.status === 'STALE') {
    return `Last valid image received ${formatTimeAge(camera.lastUploadOffsetSec)} ago (> ${config.freshThreshold}s threshold). Feed integrity degraded.`;
  }
  return `Last valid image received ${formatTimeAge(camera.lastUploadOffsetSec)} ago (≤ ${config.freshThreshold}s limit). Live stream active and verified.`;
}

/**
 * Human-readable risk explanation (Feature 3)
 * @param {Object} camera
 * @returns {string}
 */
function getRiskExplanation(camera) {
  if (!camera) return 'Site risk unknown.';
  if (camera.status === 'FRESH') {
    if (camera.hasActiveHazard) {
      return `Active hazard verified: live feed is FRESH and AI detected ${camera.activeHazardDesc || 'a safety violation'}.`;
    }
    return `Verified safe: live feed is FRESH (≤ ${config.freshThreshold}s) and zero hazards were detected in the active frame.`;
  }
  return `Site risk locked to UNKNOWN: feed is ${camera.status}. Outdated or missing imagery cannot prove safety. Physical inspection required.`;
}

/**
 * Actionable recommendation based on camera status and hazard (Priority 3)
 * @param {Object} camera
 * @returns {string}
 */
function getRecommendedAction(camera) {
  if (!camera) return 'Physical verification required.';
  if (camera.status === 'FRESH') {
    if (camera.hasActiveHazard) {
      return '⚠️ Immediate hazard intervention: Alert site supervisor to halt work until unclipped worker attaches fall arrest.';
    }
    return 'Normal automated surveillance active: Area verified compliant on live feed. Standard physical patrols continue.';
  }
  if (camera.status === 'STALE') {
    return 'Feed integrity degraded (> 60s): Inspect wireless network link. Request manual physical patrol. DO NOT assume area is safe.';
  }
  if (camera.status === 'CRITICAL STALE') {
    return 'Feed severely outdated (> 180s): Immediate manual inspection required. Switch to backup camera if available. NEVER assume site is safe.';
  }
  if (camera.status === 'OFFLINE') {
    return 'Camera stream lost (> 300s / disconnected): Immediate physical inspection mandatory. Inspect camera edge power and data link.';
  }
  if (camera.status === 'DUPLICATE') {
    return 'Frozen frame replay detected: Inspect camera edge buffer/encoder. Conduct physical patrol until fresh stream is restored.';
  }
  if (camera.status === 'INVALID DATA' || camera.status === 'MISSING') {
    return 'Validation failure / temporal drift: Verify edge NTP synchronization and network transmission. Physical inspection required.';
  }
  return 'Unverified camera status: Physical inspection required.';
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
    sceneType: 'gate',
    statusReason: 'Last valid image received 18s ago (within 60s fresh limit). Feed verified live.',
    riskExplanation: 'Verified safe: live feed is FRESH and all personnel are wearing required PPE.'
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
    sceneType: 'scaffold',
    statusReason: 'Last valid image received 34s ago (within 60s fresh limit). Feed verified live.',
    riskExplanation: 'Active hazard verified: live feed is FRESH and AI detected an unclipped worker at elevation.'
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
    sceneType: 'storage',
    statusReason: 'Last valid image received 4 minutes ago (> 180s threshold). Feed is CRITICAL STALE.',
    riskExplanation: 'Safety unverified: feed is CRITICAL STALE. Real-time conditions cannot be determined from outdated imagery.'
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
    sceneType: 'excavation',
    statusReason: 'Camera transmission halted. No valid frame received for 7 minutes (> 300s timeout).',
    riskExplanation: 'Safety unverified: camera is OFFLINE. Deep pit perimeter is unmonitored; manual inspection required.'
  }
];

// Initial Simulated Alerts Specification
const INITIAL_ALERTS = [
  {
    id: 'ALT-103-STALE',
    cameraId: 'CAM-103',
    cameraName: 'Material Storage',
    severity: 'warning',
    reason: 'Camera upload delayed beyond 180s threshold (Feed is CRITICAL STALE).',
    whatHappened: 'Image upload delayed for 4 minutes, exceeding the 180s threshold (Feed is CRITICAL STALE).',
    whyUntrusted: 'Severe transmission delay creates a surveillance blindspot. Workers or machinery may have moved since capture.',
    siteRiskStatus: 'UNKNOWN',
    lastObservation: 'Worker without helmet near gantry (Recorded 4 min ago).',
    recommendedAction: 'Feed stale. Current site condition cannot be verified. Request immediate manual inspection or switch to backup CAM-107. DO NOT assume area is safe.',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    isDismissibleWithoutConfirm: false
  },
  {
    id: 'ALT-104-OFFLINE',
    cameraId: 'CAM-104',
    cameraName: 'East Excavation',
    severity: 'critical',
    reason: 'Feed heartbeat lost. Last successful upload > 5 minutes ago (OFFLINE).',
    whatHappened: 'Camera signal lost. No heartbeat or frame received for 7 minutes (> 300s timeout).',
    whyUntrusted: 'Camera feed is completely unavailable. High-risk excavation pit perimeter is unmonitored.',
    siteRiskStatus: 'UNKNOWN',
    lastObservation: 'Excavator near trench edge.',
    recommendedAction: 'CAM-104 is offline. Trench conditions cannot be verified. Immediate physical inspection required. Never declare trench safe without visual confirmation.',
    timestamp: new Date(Date.now() - 420000).toISOString(),
    isDismissibleWithoutConfirm: false
  }
];

// Initial Event Audit Log Specification
const INITIAL_AUDIT_LOG = [
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

// Active cameras state deep-cloned
let cameras = JSON.parse(JSON.stringify(INITIAL_CAMERAS));
let alerts = JSON.parse(JSON.stringify(INITIAL_ALERTS));
let auditLog = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG));

/**
 * Load persisted non-sensitive demo state across multi-page navigation
 */
function loadStateFromLocalStorage() {
  try {
    if (typeof localStorage === 'undefined') return;
    const savedConfig = localStorage.getItem('smartsight_config');
    if (savedConfig) {
      config = { ...config, ...JSON.parse(savedConfig) };
    }
    const savedCameras = localStorage.getItem('smartsight_cameras');
    if (savedCameras) {
      const parsed = JSON.parse(savedCameras);
      if (Array.isArray(parsed) && parsed.length === INITIAL_CAMERAS.length) {
        cameras = parsed;
      }
    }
    const savedAlerts = localStorage.getItem('smartsight_alerts');
    if (savedAlerts) {
      const parsed = JSON.parse(savedAlerts);
      if (Array.isArray(parsed)) {
        alerts = parsed;
      }
    }
    const savedAudit = localStorage.getItem('smartsight_audit_log');
    if (savedAudit) {
      const parsed = JSON.parse(savedAudit);
      if (Array.isArray(parsed)) {
        auditLog = parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage load error:', e);
  }
}

/**
 * Persist demo state across multi-page navigation
 */
function saveStateToLocalStorage() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('smartsight_config', JSON.stringify(config));
    localStorage.setItem('smartsight_cameras', JSON.stringify(cameras));
    localStorage.setItem('smartsight_alerts', JSON.stringify(alerts));
    localStorage.setItem('smartsight_audit_log', JSON.stringify(auditLog));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

// Initialize state from localStorage
loadStateFromLocalStorage();

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
  const currentCfg = cfg || config;
  const now = Date.now();

  // Missing or corrupted payload check (Feature 1)
  if (!frame || typeof frame !== 'object') {
    return {
      isValid: false,
      feedFreshness: 'MISSING',
      reason: 'No frame packet received or payload missing.',
      allowHazardInference: false,
      currentRisk: 'UNKNOWN'
    };
  }

  const captureTime = new Date(frame.captureTimestamp).getTime();
  const receiveTime = new Date(frame.receiveTimestamp).getTime();

  // Rule 1: Check timestamp validity
  if (isNaN(captureTime) || isNaN(receiveTime)) {
    return {
      isValid: false,
      feedFreshness: 'INVALID DATA',
      reason: 'Malformed or missing timestamp headers in frame payload.',
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

  // Rule 5: Evaluate freshness thresholds (Feature 1)
  if (imageAgeSec <= currentCfg.freshThreshold) {
    return {
      isValid: true,
      imageAgeSec,
      feedFreshness: 'FRESH',
      reason: `Image age (${imageAgeSec}s) is within fresh threshold (≤ ${currentCfg.freshThreshold}s).`,
      allowHazardInference: true, // Only fresh frames can evaluate live site risk
      currentRisk: frame.hazardDetected ? 'HIGH' : 'LOW'
    };
  } else if (imageAgeSec <= currentCfg.staleThreshold) {
    return {
      isValid: true,
      imageAgeSec,
      feedFreshness: 'STALE',
      reason: `Image age (${imageAgeSec}s) exceeds fresh threshold (61s–${currentCfg.staleThreshold}s). Feed degraded.`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN' // Safety Rule: Stale feed cannot verify safety!
    };
  } else if (imageAgeSec <= currentCfg.offlineTimeout) {
    return {
      isValid: true,
      imageAgeSec,
      feedFreshness: 'CRITICAL STALE',
      reason: `Image age (${imageAgeSec}s) exceeds stale threshold (> ${currentCfg.staleThreshold}s). Feed critically stale.`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN' // Safety Rule: Critical stale feed cannot verify safety!
    };
  } else {
    return {
      isValid: false,
      imageAgeSec,
      feedFreshness: 'OFFLINE',
      reason: `Image age (${imageAgeSec}s) exceeds offline timeout (≥ ${currentCfg.offlineTimeout}s).`,
      allowHazardInference: false,
      currentRisk: 'UNKNOWN' // Safety Rule: Offline feed is ALWAYS UNKNOWN risk
    };
  }
}

/**
 * Recalculate camera's live status based on elapsed time
 */
function updateCameraAging(camera) {
  if (!camera) return;

  if (!camera.isStreamConnected) {
    camera.status = 'OFFLINE';
    camera.currentRisk = 'UNKNOWN';
    camera.statusReason = getStatusReason(camera);
    camera.riskExplanation = getRiskExplanation(camera);
    return;
  }

  const age = camera.lastUploadOffsetSec;

  if (camera.status === 'DUPLICATE' || camera.status === 'INVALID DATA' || camera.status === 'MISSING') {
    camera.currentRisk = 'UNKNOWN';
    camera.statusReason = getStatusReason(camera);
    camera.riskExplanation = getRiskExplanation(camera);
    return;
  }

  if (age <= config.freshThreshold) {
    camera.status = 'FRESH';
    // If fresh, risk is determined by verified hazard
    camera.currentRisk = camera.hasActiveHazard ? 'HIGH' : 'LOW';
  } else if (age <= config.staleThreshold) {
    camera.status = 'STALE';
    camera.currentRisk = 'UNKNOWN'; // CORE SAFETY RULE: Stale feed cannot verify safety!
  } else if (age <= config.offlineTimeout) {
    camera.status = 'CRITICAL STALE';
    camera.currentRisk = 'UNKNOWN'; // CORE SAFETY RULE: Critical stale feed cannot verify safety!
  } else {
    camera.status = 'OFFLINE';
    camera.currentRisk = 'UNKNOWN'; // CORE SAFETY RULE: Offline feed is ALWAYS UNKNOWN!
    camera.isStreamConnected = false;
  }

  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);
}

// ============================================================================
// 3. SIMULATION SCENARIO HANDLERS (Feature 4: Interactive Demonstration)
// ============================================================================

/**
 * Scenario 1 — Fresh Feed (≤ 60s)
 * Ingests a new live frame. Feed becomes FRESH, AI model evaluates hazards.
 */
function runScenarioFresh(targetCamId) {
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
    captureTimestamp: new Date(now - 12000).toISOString(), // 12 seconds old (within 60s limit)
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
  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);

  // Clear any active stale/offline alert for this camera
  resolveCameraAlerts(camera.id);

  // Log in Audit Trail
  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_FRESH',
    severity: 'info',
    description: `Fresh frame ingested (${camera.lastUploadOffsetSec}s old). Hash: ${randomHash}. AI confidence: ${camera.aiConfidence}%. Live evaluation active.`,
    feedState: camera.status,
    riskImpact: camera.currentRisk
  });

  showToast(`Scenario: ${camera.id} updated with fresh image. Status: FRESH. Risk: ${camera.currentRisk}.`, 'success');
  renderDashboard();
}

/**
 * Scenario 2 — Stale Feed (61s - 180s)
 * Ingests a frame captured 95 seconds ago. Status becomes STALE.
 * Current risk is demoted to UNKNOWN.
 */
function runScenarioStale(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  const now = Date.now();
  const staleOffsetSec = 95; // 95 seconds old (between 60s and 180s)
  const staleHash = 'h-stale-' + Math.random().toString(36).substring(2, 7);

  const framePayload = {
    captureTimestamp: new Date(now - staleOffsetSec * 1000).toISOString(),
    receiveTimestamp: new Date(now).toISOString(),
    frameHash: staleHash,
    hazardDetected: camera.hasActiveHazard
  };

  const validation = validateCameraFrame(framePayload, camera, config);

  camera.isStreamConnected = true;
  camera.status = 'STALE';
  camera.lastUploadOffsetSec = staleOffsetSec;
  camera.lastCaptureOffsetSec = staleOffsetSec + 2;
  camera.lastFrameHash = staleHash;
  camera.aiConfidence = null; // Unverified on stale feed
  camera.currentRisk = 'UNKNOWN'; // CORE SAFETY PRINCIPLE
  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);

  // Trigger Actionable Stale Alert (Feature 5)
  createOrUpdateAlert({
    id: `ALT-${camera.id}-STALE`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'warning',
    reason: `Image captured ${staleOffsetSec}s ago exceeds 60s freshness threshold (Feed is STALE).`,
    whatHappened: `Camera upload delayed by ${staleOffsetSec} seconds. Image age exceeds 60s limit.`,
    whyUntrusted: `Moderate transmission lag means site activity is not being observed in real time.`,
    siteRiskStatus: 'UNKNOWN',
    lastObservation: `${camera.lastObservation} (Historical only).`,
    recommendedAction: `${camera.id} feed is STALE. Current safety cannot be verified. Request manual verification or check network link. Never assume site is safe.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_STALE',
    severity: 'warning',
    description: `Stale frame received (95s old). Feed marked STALE. Risk demoted to UNKNOWN.`,
    feedState: 'STALE',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario: ${camera.id} received stale image (95s old). Risk: UNKNOWN.`, 'warning');
  renderDashboard();
}

/**
 * Scenario 3 — Critical Stale (> 180s)
 * Ingests a frame captured 4–5 minutes ago. Status becomes CRITICAL STALE.
 * Current risk is demoted to UNKNOWN.
 */
function runScenarioCriticalStale(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  const now = Date.now();
  const staleOffsetSec = 300; // 5 minutes old
  const staleHash = 'h-crit-' + Math.random().toString(36).substring(2, 7);

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
  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);

  // Trigger Actionable Critical Stale Alert (Feature 5)
  createOrUpdateAlert({
    id: `ALT-${camera.id}-STALE`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'warning',
    reason: `Image captured ${Math.floor(staleOffsetSec / 60)} minutes ago. Feed is CRITICAL STALE.`,
    whatHappened: `Camera upload delayed by ${Math.floor(staleOffsetSec / 60)} minutes. Image age exceeds 180s critical threshold.`,
    whyUntrusted: `Severe transmission latency creates a significant blindspot. Workers or heavy equipment may have entered hazardous areas unobserved.`,
    siteRiskStatus: 'UNKNOWN',
    lastObservation: `${camera.lastObservation} (Historical only).`,
    recommendedAction: `${camera.id} feed is CRITICAL STALE. Current safety cannot be verified. Request immediate manual inspection or switch to backup camera. DO NOT assume area is safe.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_CRITICAL_STALE',
    severity: 'warning',
    description: `Critical stale frame received (5 min old). Feed marked CRITICAL STALE. Risk locked to UNKNOWN.`,
    feedState: 'CRITICAL STALE',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario: ${camera.id} received 5-min-old image. Status: CRITICAL STALE. Risk: UNKNOWN.`, 'warning');
  renderDashboard();
}

/**
 * Scenario 4 — Camera Offline
 * Camera feed connection lost. Mark OFFLINE, risk UNKNOWN, inspection alert.
 */
function runScenarioOffline(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  camera.isStreamConnected = false;
  camera.status = 'OFFLINE';
  camera.lastUploadOffsetSec = Math.max(camera.lastUploadOffsetSec, config.offlineTimeout + 60);
  camera.aiConfidence = null;
  camera.currentRisk = 'UNKNOWN'; // CORE SAFETY PRINCIPLE
  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);

  createOrUpdateAlert({
    id: `ALT-${camera.id}-OFFLINE`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'critical',
    reason: `Feed transmission halted. No frames received beyond ${config.offlineTimeout}s timeout.`,
    whatHappened: `Stream transmission halted. Camera heartbeat packet timed out beyond ${config.offlineTimeout}s.`,
    whyUntrusted: `Camera feed is completely unavailable. Site zone is unmonitored.`,
    siteRiskStatus: 'UNKNOWN',
    lastObservation: camera.lastObservation,
    recommendedAction: `${camera.id} is offline. Site conditions cannot be verified. Immediate physical inspection required. Check edge hardware and network connectivity.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_OFFLINE',
    severity: 'failure',
    description: `Stream disconnected. Feed OFFLINE. Site risk marked UNKNOWN. Manual inspection mandated.`,
    feedState: 'OFFLINE',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario: ${camera.id} is OFFLINE. Site risk cannot be verified.`, 'danger');
  renderDashboard();
}

/**
 * Scenario 5 — Missing or Invalid Feed
 * Simulates corrupted metadata or temporal anomaly (future timestamp).
 */
function runScenarioInvalid(targetCamId) {
  const camera = cameras.find(c => c.id === targetCamId);
  if (!camera) return;

  const now = Date.now();
  // Future-dated frame packet (60 seconds into future)
  const framePayload = {
    captureTimestamp: new Date(now + 60000).toISOString(),
    receiveTimestamp: new Date(now).toISOString(),
    frameHash: 'h-invalid-' + Math.random().toString(36).substring(2, 7),
    hazardDetected: false
  };

  const validation = validateCameraFrame(framePayload, camera, config);

  camera.status = 'INVALID DATA';
  camera.aiConfidence = null;
  camera.currentRisk = 'UNKNOWN'; // CORE SAFETY PRINCIPLE: Invalid data cannot verify safety
  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);

  createOrUpdateAlert({
    id: `ALT-${camera.id}-INVALID`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'critical',
    reason: 'Validation engine rejected frame: Future-dated timestamp drift detected.',
    whatHappened: 'Incoming frame timestamp is 60s in future. Failed temporal validation check.',
    whyUntrusted: 'Clock drift or corrupt frame payload undermines stream authenticity.',
    siteRiskStatus: 'UNKNOWN',
    lastObservation: `${camera.lastObservation} (Unverified due to corrupted frame).`,
    recommendedAction: `Inspect camera edge NTP synchronization and network transmission integrity. Manual inspection recommended.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_INVALID_FRAME',
    severity: 'failure',
    description: `Future-dated frame rejected by validation engine. Feed marked INVALID DATA. Risk set to UNKNOWN.`,
    feedState: 'INVALID DATA',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario: ${camera.id} received invalid frame. Risk set to UNKNOWN.`, 'danger');
  renderDashboard();
}

/**
 * Scenario 6 — Duplicate Frame
 * Identical image content / frame hash transmitted.
 * Must NOT be trusted as fresh even if server upload timestamp is recent!
 */
function runScenarioDuplicate(targetCamId) {
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
  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);

  createOrUpdateAlert({
    id: `ALT-${camera.id}-DUPLICATE`,
    cameraId: camera.id,
    cameraName: camera.name,
    severity: 'warning',
    reason: `Duplicate frame hash detected (${repeatedHash}). Feed appears frozen or replaying.`,
    whatHappened: `Identical frame hash detected (${repeatedHash}). Repeated frame indicates frozen buffer or playback loop.`,
    whyUntrusted: `Frozen frame replay masks real site conditions with an outdated static image.`,
    siteRiskStatus: 'UNKNOWN',
    lastObservation: `${camera.lastObservation} (Frozen visual buffer).`,
    recommendedAction: `${camera.id} is sending duplicate frames. Feed cannot be verified as live. Inspect camera edge encoder hardware.`
  });

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_DUPLICATE',
    severity: 'warning',
    description: `Duplicate frame hash detected (${repeatedHash}). Feed rejected as unverified. Risk set to UNKNOWN.`,
    feedState: 'DUPLICATE',
    riskImpact: 'UNKNOWN'
  });

  showToast(`Scenario: Duplicate frame detected on ${camera.id}. Risk: UNKNOWN.`, 'warning');
  renderDashboard();
}

/**
 * Scenario 7 — Camera Recovery
 * Restores an offline or degraded camera with a genuinely fresh validated frame.
 */
function runScenarioRecovery(targetCamId) {
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

  // Safety Gate: Do NOT recover or clear warnings unless frame is genuinely fresh and valid! (Priority 4)
  if (!validation.isValid || validation.feedFreshness !== 'FRESH') {
    console.warn(`[SmartSight] Recovery rejected for ${camera.id}: frame failed validation.`, validation);
    return;
  }

  const previousStatus = camera.status;
  const previousRisk = camera.currentRisk;

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
  camera.statusReason = getStatusReason(camera);
  camera.riskExplanation = getRiskExplanation(camera);

  // Clear alerts for this camera only AFTER valid fresh frame is verified!
  resolveCameraAlerts(camera.id);

  addAuditLog({
    cameraId: camera.id,
    eventType: 'SCENARIO_RECOVERY',
    severity: 'recovery',
    description: `[STATE TRANSITION] Camera ${camera.id} recovered from ${previousStatus} (Risk: ${previousRisk}) to FRESH (Risk: LOW). Valid 8s frame verified with unique hash.`,
    feedState: 'FRESH',
    riskImpact: 'LOW'
  });

  showToast(`Scenario: ${camera.id} successfully recovered with fresh frame! Status: FRESH.`, 'success');
  renderDashboard();
}

// Backwards-compatible scenario function aliases for acceptance tests & existing callers
const runScenarioA = runScenarioFresh;
const runScenarioB = runScenarioCriticalStale;
const runScenarioC = runScenarioOffline;
const runScenarioD = runScenarioDuplicate;
const runScenarioE = runScenarioRecovery;

// ============================================================================
// 4. MANUAL INSPECTION WORKFLOW (Section 9)
// ============================================================================

function requestManualInspection(camId) {
  const camera = cameras.find(c => c.id === camId);
  if (!camera) return;

  camera.inspectionRequested = true;
  camera.inspectionNotes = `[Simulated Action] Safety inspector requested at ${new Date().toLocaleTimeString()} by operator.`;

  addAuditLog({
    cameraId: camera.id,
    eventType: 'MANUAL_INSPECTION_REQ',
    severity: 'warning',
    description: `[SIMULATED ACTION] Supervisor manual inspection dispatched for ${camera.id} (${camera.name}) - Prototype Demo.`,
    feedState: camera.status,
    riskImpact: camera.currentRisk
  });

  showToast(`[Simulated Action] Manual Inspection Requested for ${camera.id}. Simulated safety patrol dispatched.`, 'warning');
  renderDashboard();
  if (selectedCameraIdForModal === camId) {
    renderModalContent(camera);
  }
}

function resolveManualInspection(camId) {
  const camera = cameras.find(c => c.id === camId);
  if (!camera) return;

  camera.inspectionRequested = false;
  camera.inspectionNotes = `[Simulated Action] Physical patrol completed at ${new Date().toLocaleTimeString()}. Perimeter inspected physically.`;

  // IMPORTANT: Note that resolving physical patrol notes does NOT magically make
  // a dead camera feed FRESH! The feed remains in its state until fresh images arrive!
  addAuditLog({
    cameraId: camera.id,
    eventType: 'MANUAL_INSPECTION_RESOLVED',
    severity: 'info',
    description: `[SIMULATED ACTION] Physical patrol confirmed zone clear. Camera feed remains ${camera.status} pending fresh stream ingestion.`,
    feedState: camera.status,
    riskImpact: camera.status === 'FRESH' ? camera.currentRisk : 'UNKNOWN'
  });

  showToast(`[Simulated Action] Physical inspection logged for ${camera.id}. Feed integrity still requires fresh images.`, 'info');
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
  saveStateToLocalStorage();
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

/**
 * Render previews specific to Dashboard overview page (index.html)
 */
function renderDashboardPreviews() {
  const camTableBody = document.getElementById('dashboard-cameras-table-body');
  if (camTableBody) {
    camTableBody.innerHTML = cameras.map(cam => {
      const statusBadgeClass = getStatusBadgeClass(cam.status);
      const riskBadgeClass = getRiskBadgeClass(cam.currentRisk);
      return `
        <tr>
          <td><strong class="font-mono">${cam.id}</strong></td>
          <td>
            <div class="table-name-wrap">
              <strong>${cam.name}</strong>
              <small class="text-muted">${cam.zone}</small>
            </div>
          </td>
          <td>
            <span class="badge-status ${statusBadgeClass}">${cam.status}</span>
          </td>
          <td>
            <span class="badge-status ${riskBadgeClass}">${cam.currentRisk}</span>
          </td>
          <td class="font-mono text-muted">${formatTimeAge(cam.lastUploadOffsetSec)}</td>
          <td>
            <a href="cameras.html#card-${cam.id}" class="btn btn-sm btn-outline btn-table-action" title="View in Camera Monitoring">
              <i data-lucide="video"></i> Monitor
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  const alertsPreview = document.getElementById('dashboard-alerts-preview');
  if (alertsPreview) {
    if (alerts.length === 0) {
      alertsPreview.innerHTML = `
        <div class="alert-empty-state">
          <i data-lucide="check-circle-2"></i>
          <strong>All Camera Feeds Operating Reliably</strong>
          <p>No stale, duplicate, or disconnected feeds detected. Real-time safety validation active.</p>
        </div>
      `;
    } else {
      alertsPreview.innerHTML = alerts.slice(0, 3).map(alert => `
        <div class="dashboard-alert-mini alert-${alert.severity}">
          <div class="mini-alert-head">
            <span class="badge-status ${alert.severity === 'critical' ? 'badge-critical' : 'badge-stale'}">${alert.severity.toUpperCase()}</span>
            <strong class="font-mono">${alert.cameraId}</strong>
            <span class="text-muted">• ${alert.cameraName}</span>
          </div>
          <p class="mini-alert-desc">${alert.whatHappened || alert.reason}</p>
          <div class="mini-alert-footer">
            <span class="badge-status badge-unknown">RISK: UNKNOWN</span>
            <a href="alerts.html#alert-${alert.id}" class="mini-alert-link">
              View Alert & Action <i data-lucide="arrow-right"></i>
            </a>
          </div>
        </div>
      `).join('');
    }
  }

  const recentLogBody = document.getElementById('dashboard-recent-log-body');
  if (recentLogBody) {
    recentLogBody.innerHTML = auditLog.slice(0, 4).map(e => `
      <tr>
        <td class="font-mono text-muted">${new Date(e.timestamp).toLocaleTimeString()}</td>
        <td><strong class="font-mono">${e.cameraId}</strong></td>
        <td><span class="alert-severity-badge severity-${e.severity === 'failure' ? 'critical' : e.severity}">${e.eventType}</span></td>
        <td><span class="truncate-cell">${e.description || ''}</span></td>
      </tr>
    `).join('');
  }
}

/**
 * Populate input fields on Settings page or modal
 */
function populateSettingsForm() {
  const freshInput = document.getElementById('threshold-fresh-input');
  if (freshInput && document.activeElement !== freshInput) freshInput.value = config.freshThreshold;
  const staleInput = document.getElementById('threshold-stale-input');
  if (staleInput && document.activeElement !== staleInput) staleInput.value = config.staleThreshold;
  const offlineInput = document.getElementById('threshold-offline-input');
  if (offlineInput && document.activeElement !== offlineInput) offlineInput.value = config.offlineTimeout;
  const agingInput = document.getElementById('aging-speed-input');
  if (agingInput && document.activeElement !== agingInput) agingInput.value = config.agingSpeedMultiplier;
}

function renderDashboard() {
  renderWebcamSection();
  renderSummaryKPIs();
  renderCameraGrid();
  renderAlertsList();
  renderAuditTable();
  renderSidebarHealthWidget();
  renderDashboardPreviews();
  populateSettingsForm();

  // Re-trigger Lucide icon replacement
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function renderSummaryKPIs() {
  const total = cameras.length;
  const fresh = cameras.filter(c => c.status === 'FRESH').length;
  const stale = cameras.filter(c => c.status === 'STALE').length;
  const criticalStale = cameras.filter(c => c.status === 'CRITICAL STALE').length;
  const offline = cameras.filter(c => c.status === 'OFFLINE' || c.status === 'INVALID DATA' || c.status === 'MISSING').length;
  const unreliable = stale + criticalStale + offline;
  const unknownRisk = cameras.filter(c => c.currentRisk === 'UNKNOWN').length;
  // Note: Only active verified hazards on FRESH feeds count!
  const activeVerifiedHazards = cameras.filter(c => c.status === 'FRESH' && c.hasActiveHazard).length;

  const totalEl = document.getElementById('kpi-total-cameras');
  if (totalEl) totalEl.textContent = total;
  const freshEl = document.getElementById('kpi-fresh-feeds');
  if (freshEl) freshEl.textContent = fresh;
  const staleEl = document.getElementById('kpi-stale-feeds');
  if (staleEl) staleEl.textContent = stale;
  const critEl = document.getElementById('kpi-critical-stale-feeds');
  if (critEl) critEl.textContent = criticalStale;
  const offEl = document.getElementById('kpi-offline-feeds');
  if (offEl) offEl.textContent = offline;
  const unreliEl = document.getElementById('kpi-unreliable-feeds');
  if (unreliEl) unreliEl.textContent = unreliable;
  const unknownEl = document.getElementById('kpi-unknown-risk-feeds');
  if (unknownEl) unknownEl.textContent = unknownRisk;
  const hazEl = document.getElementById('kpi-verified-hazards');
  if (hazEl) hazEl.textContent = activeVerifiedHazards;

  // Dynamic filter pill counts
  const filterAll = document.getElementById('filter-count-all');
  if (filterAll) filterAll.textContent = total;
  const filterFresh = document.getElementById('filter-count-fresh');
  if (filterFresh) filterFresh.textContent = fresh;
  const filterStale = document.getElementById('filter-count-stale');
  if (filterStale) filterStale.textContent = stale + criticalStale;
  const filterOff = document.getElementById('filter-count-offline');
  if (filterOff) filterOff.textContent = offline;

  // Threshold values in subtext
  document.querySelectorAll('.threshold-fresh-val').forEach(el => el.textContent = config.freshThreshold);
  document.querySelectorAll('.threshold-stale-val').forEach(el => el.textContent = config.staleThreshold);
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

  const isSimulationPage = Boolean(
    (typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.includes('simulation')) ||
    (typeof document !== 'undefined' && document.body && document.body.classList && typeof document.body.classList.contains === 'function' && document.body.classList.contains('simulation-page'))
  );

  let filtered = cameras;
  if (isSimulationPage) {
    const targetSelect = document.getElementById('simulation-target-select');
    const targetId = targetSelect ? targetSelect.value : 'CAM-101';
    filtered = cameras.filter(cam => cam.id === targetId);
  } else {
    // Filter cameras
    filtered = cameras.filter(cam => {
      if (currentCameraFilter === 'all') return true;
      if (currentCameraFilter === 'fresh') return cam.status === 'FRESH';
      if (currentCameraFilter === 'stale') return cam.status === 'STALE' || cam.status === 'CRITICAL STALE';
      if (currentCameraFilter === 'offline') return cam.status === 'OFFLINE' || cam.status === 'INVALID DATA' || cam.status === 'MISSING';
      return true;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-card">
        <i data-lucide="video-off" class="empty-state-icon"></i>
        <h3 class="empty-state-title">No Cameras Match the "${currentCameraFilter.toUpperCase()}" Filter</h3>
        <p class="empty-state-text">There are currently no surveillance feeds matching this status on site. You can select another filter or view all cameras.</p>
        <button class="btn btn-primary btn-sm" id="btn-reset-cam-filter">
          <i data-lucide="eye"></i> Show All Site Cameras
        </button>
      </div>
    `;
    document.getElementById('btn-reset-cam-filter')?.addEventListener('click', () => {
      currentCameraFilter = 'all';
      document.querySelectorAll('.filter-pill').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
      });
      renderCameraGrid();
      if (window.lucide) window.lucide.createIcons();
    });
    return;
  }

  grid.innerHTML = filtered.map(camera => {
    const statusBadgeClass = getStatusBadgeClass(camera.status);
    const riskBadgeClass = getRiskBadgeClass(camera.currentRisk);
    const isStaleOrOffline = camera.status !== 'FRESH';

    const inspectionBadge = camera.inspectionRequested ? `
      <span class="badge-status badge-inspection">
        <i data-lucide="clipboard-check"></i> INSPECTION PENDING
      </span>
    ` : '';

    return `
      <article class="camera-card" id="card-${camera.id}">
        <!-- Header: Camera ID, Name, Zone, Connection & Freshness Badges -->
        <div class="cam-card-header">
          <div class="cam-header-left">
            <span class="cam-id-tag font-mono">${camera.id}</span>
            <div class="cam-title-wrap">
              <h3 class="cam-name">${camera.name}</h3>
              <span class="cam-zone"><i data-lucide="map-pin"></i> ${camera.zone}</span>
            </div>
          </div>
          <div class="cam-header-right">
            <span class="cam-conn-pill ${camera.isStreamConnected ? 'conn-active' : 'conn-offline'}">
              <span class="status-dot"></span> ${camera.isStreamConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span class="badge-status ${statusBadgeClass}">${camera.status}</span>
            ${inspectionBadge}
          </div>
        </div>

        <!-- Viewport HUD Preview -->
        <div class="cam-viewport-wrapper">
          <canvas id="canvas-${camera.id}" class="cam-canvas" width="480" height="200"></canvas>
          
          <div class="cam-hud-top">
            <span class="hud-rec">
              <span class="rec-dot ${camera.status === 'FRESH' ? 'active' : (camera.status === 'OFFLINE' ? 'dead' : 'frozen')}"></span>
              ${camera.status === 'FRESH' ? 'REC LIVE' : (camera.status === 'OFFLINE' ? 'STREAM LOST' : 'BUFFER FROZEN')}
            </span>
            <span class="hud-cam-id font-mono">${camera.id} • ${camera.sceneType.toUpperCase()}</span>
          </div>

          ${camera.status === 'CRITICAL STALE' ? `
            <div class="cam-stale-watermark">
              <i data-lucide="alert-triangle"></i> CRITICAL STALE — NOT LIVE
            </div>
          ` : ''}

          <div class="cam-hud-bottom">
            <span class="hud-timestamp font-mono">Frame Age: ${formatTimeAge(camera.lastUploadOffsetSec)}</span>
            <span class="hud-disclaimer">SIMULATED FEED</span>
          </div>
        </div>

        <!-- Structured Status Grid: Connection, Freshness, Last Frame, Age, Site Risk, AI Confidence -->
        <div class="cam-status-grid">
          <div class="status-grid-item">
            <span class="grid-item-label">Feed Freshness</span>
            <span class="grid-item-val ${statusBadgeClass}">${camera.status}</span>
          </div>
          <div class="status-grid-item">
            <span class="grid-item-label">Last Valid Frame</span>
            <span class="grid-item-val font-mono">${camera.isStreamConnected ? formatTimeAge(camera.lastUploadOffsetSec) + ' ago' : 'No Signal'}</span>
          </div>
          <div class="status-grid-item">
            <span class="grid-item-label">Frame Age</span>
            <span class="grid-item-val font-mono">${formatTimeAge(camera.lastUploadOffsetSec)}</span>
          </div>
          <div class="status-grid-item item-risk">
            <span class="grid-item-label">Current Site Risk</span>
            <span class="grid-item-val ${riskBadgeClass}">${camera.currentRisk}</span>
          </div>
          <div class="status-grid-item">
            <span class="grid-item-label">Connection</span>
            <span class="grid-item-val">${camera.isStreamConnected ? 'Active Carrier' : 'Carrier Lost'}</span>
          </div>
          <div class="status-grid-item">
            <span class="grid-item-label">AI Confidence</span>
            <span class="grid-item-val">${camera.aiConfidence ? `${camera.aiConfidence}%` : '<span class="text-dim">N/A</span>'}</span>
          </div>
        </div>

        <!-- Card Body: Observations & Action Callout -->
        <div class="cam-card-body">
          <div class="hazard-observation-box ${camera.status === 'FRESH' && camera.hasActiveHazard ? 'has-hazard' : (camera.status === 'FRESH' ? 'is-safe' : 'is-historical')}">
            <div class="obs-header-row">
              <span class="obs-title-tag">
                ${camera.status === 'FRESH' 
                  ? (camera.hasActiveHazard ? '<i data-lucide="alert-octagon"></i> Active Hazard Observation' : '<i data-lucide="check-circle-2"></i> Compliance Observation')
                  : '<i data-lucide="history"></i> Historical Record (Outdated)'}
              </span>
              <span class="obs-time-tag font-mono">${formatTimeAge(camera.lastObservationTimeOffsetSec)} ago</span>
            </div>
            <p class="obs-text">${camera.lastObservation}</p>
            ${camera.status !== 'FRESH' ? `
              <p class="obs-disclaimer-note">
                ⚠️ Outdated visual data cannot verify safety. Current site risk locked to UNKNOWN.
              </p>
            ` : ''}
          </div>

          <!-- Recommended Action Banner -->
          <div class="cam-action-callout action-${camera.status === 'FRESH' && !camera.hasActiveHazard ? 'safe' : (camera.status === 'FRESH' ? 'danger' : 'warning')}">
            <div class="action-callout-header">
              <i data-lucide="${camera.status === 'FRESH' && !camera.hasActiveHazard ? 'shield-check' : (camera.status === 'FRESH' ? 'alert-octagon' : 'clipboard-alert')}"></i>
              <span>RECOMMENDED ACTION:</span>
            </div>
            <p class="action-callout-text">${getRecommendedAction(camera)}</p>
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="cam-card-footer">
          <button class="btn btn-outline btn-sm view-details-btn" data-cam-id="${camera.id}" aria-label="View diagnostics for ${camera.id}">
            <i data-lucide="eye"></i> Diagnostics
          </button>
          
          ${isStaleOrOffline ? `
            ${camera.inspectionRequested ? `
              <button class="btn btn-success btn-sm resolve-inspect-btn" data-cam-id="${camera.id}" aria-label="Resolve patrol for ${camera.id}">
                <i data-lucide="check-check"></i> Resolve Patrol
              </button>
            ` : `
              <button class="btn btn-warning btn-sm request-inspect-btn" data-cam-id="${camera.id}" aria-label="Request inspection for ${camera.id}">
                <i data-lucide="clipboard-alert"></i> Request Manual Inspection
              </button>
            `}
          ` : `
            <button class="btn btn-secondary btn-sm test-stale-btn" data-cam-id="${camera.id}" title="Simulate stale delay" aria-label="Simulate stale feed for ${camera.id}">
              <i data-lucide="clock"></i> Test Stale
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
          <span class="alert-severity-badge severity-${alert.severity}">${alert.severity.toUpperCase()}</span>
        </div>

        <!-- Actionable Alerts: 4 Structured Points (Feature 5) -->
        <div class="alert-explanation-grid">
          <div class="alert-row">
            <strong>1. What Happened:</strong> ${alert.whatHappened || alert.reason}
          </div>
          <div class="alert-row">
            <strong>2. Why Feed Cannot Be Trusted:</strong> ${alert.whyUntrusted || 'Data staleness or stream loss prevents real-time hazard verification.'}
          </div>
          <div class="alert-row alert-risk-lock">
            <strong>3. Current Site Risk:</strong>
            <span class="badge-unknown-risk">LOCKED TO UNKNOWN</span>
            <span class="text-risk-unknown">Outdated/offline feeds cannot prove safety — NEVER assume area is safe.</span>
          </div>
          <div class="alert-row">
            <strong>4. Historical Observation:</strong> ${alert.lastObservation || 'None recorded'}
          </div>
        </div>

        <div class="alert-action-rec">
          <i data-lucide="arrow-right-circle"></i>
          <span><strong>Recommended Next Action:</strong> ${alert.recommendedAction || 'Request manual inspection or check camera connection. Do not rely on unverified feed.'}</span>
        </div>
      </div>
      <div class="alert-item-actions">
        <button class="btn btn-sm btn-outline alert-inspect-btn" data-cam-id="${alert.cameraId}" aria-label="Request manual inspection for ${alert.cameraId}">
          <i data-lucide="clipboard-alert"></i> Inspect
        </button>
        <button class="btn btn-sm btn-secondary alert-dismiss-btn" data-alert-id="${alert.id}" aria-label="Dismiss alert for ${alert.cameraId}">
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
        <span class="detail-value">${camera.inspectionRequested ? '<span class="badge badge-stale font-mono">REQUESTED</span>' : 'None Active'}</span>
      </div>
    </div>

    <!-- The 3 Separated Metrics -->
    <div>
      <h4 class="modal-section-title"><i data-lucide="shield-check"></i> The Three Safety Separation Rules</h4>
      <div class="safety-triad-grid">
        <div class="triad-col">
          <span class="triad-label">Feed Freshness</span>
          <span class="triad-value ${getStatusBadgeClass(camera.status)}">${camera.status}</span>
          <span class="triad-sub">Age: ${formatTimeAge(camera.lastUploadOffsetSec)}</span>
        </div>
        <div class="triad-col">
          <span class="triad-label">AI Confidence</span>
          <span class="triad-value ${camera.aiConfidence ? 'badge-fresh' : 'badge-unknown'}">${camera.aiConfidence ? `${camera.aiConfidence}%` : 'N/A'}</span>
          <span class="triad-sub">${camera.status === 'FRESH' ? 'Verified on live frame' : 'Zero trust on degraded feed'}</span>
        </div>
        <div class="triad-col">
          <span class="triad-label">Current Site Risk</span>
          <span class="triad-value ${getRiskBadgeClass(camera.currentRisk)}">${camera.currentRisk}</span>
          <span class="triad-sub">${camera.currentRisk === 'UNKNOWN' ? 'Safety cannot be proven' : 'Verified Compliant'}</span>
        </div>
      </div>
    </div>

    <!-- Timestamp & Validation Breakdown -->
    <div>
      <h4 class="modal-section-title"><i data-lucide="file-check-2"></i> Validation Rule Integrity Checks</h4>
      <div class="validation-table-wrap">
        <table class="validation-table">
          <thead>
            <tr>
              <th style="width: 30%;">Safety Rule</th>
              <th style="width: 44%;">Observed Telemetry</th>
              <th style="width: 26%;">Integrity Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Timestamp Ordering</strong></td>
              <td>
                <div class="metric-timing-box">
                  <span>Capture: ${simulatedCaptureTime}</span>
                  <span>Receive: ${simulatedReceiveTime}</span>
                </div>
              </td>
              <td><span class="check-pass"><i data-lucide="check"></i> PASS (Valid)</span></td>
            </tr>
            <tr>
              <td><strong>Freshness Threshold</strong></td>
              <td>
                <div class="metric-timing-box">
                  <span>Age: <strong>${camera.lastUploadOffsetSec}s</strong></span>
                  <span>Limit: ≤ ${config.freshThreshold}s</span>
                </div>
              </td>
              <td>
                <span class="${camera.lastUploadOffsetSec <= config.freshThreshold ? 'check-pass' : 'check-fail'}">
                  <i data-lucide="${camera.lastUploadOffsetSec <= config.freshThreshold ? 'check' : 'alert-triangle'}"></i>
                  ${camera.lastUploadOffsetSec <= config.freshThreshold ? 'PASS (Fresh)' : 'DEGRADED'}
                </span>
              </td>
            </tr>
            <tr>
              <td><strong>Frame Hash Uniqueness</strong></td>
              <td>
                <div class="metric-timing-box">
                  <span>Hash: <code style="font-size: 10.5px;">${camera.lastFrameHash ? camera.lastFrameHash.slice(0, 16) + '...' : 'N/A'}</code></span>
                </div>
              </td>
              <td>
                <span class="${camera.status === 'DUPLICATE' ? 'check-fail' : 'check-pass'}">
                  <i data-lucide="${camera.status === 'DUPLICATE' ? 'alert-octagon' : 'check'}"></i>
                  ${camera.status === 'DUPLICATE' ? 'FAIL (Duplicate)' : 'PASS (Unique)'}
                </span>
              </td>
            </tr>
            <tr>
              <td><strong>Site Risk Fail-Safe</strong></td>
              <td>
                <div class="metric-timing-box">
                  <span>Status: <strong>${camera.status}</strong></span>
                </div>
              </td>
              <td>
                <span class="${camera.status === 'FRESH' ? 'check-pass' : 'check-fail'}">
                  <i data-lucide="${camera.status === 'FRESH' ? 'shield-check' : 'shield-alert'}"></i>
                  ${camera.status === 'FRESH' ? 'Normal Detection' : 'FAIL-SAFE: UNKNOWN'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Observation & Notes -->
    <div class="hazard-observation-box ${camera.hasActiveHazard ? 'has-hazard' : ''}">
      <span class="obs-label">
        <i data-lucide="${camera.hasActiveHazard ? 'alert-triangle' : 'clipboard-list'}"></i>
        Observation Record:
      </span>
      <p class="obs-text">${camera.lastObservation}</p>
      ${camera.inspectionNotes ? `<div class="obs-notes"><strong>Inspection Notes:</strong> ${camera.inspectionNotes}</div>` : ''}
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
    const webcamHudClock = document.getElementById('webcam-hud-clock');
    if (webcamHudClock) {
      webcamHudClock.textContent = now.toLocaleTimeString();
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

      // Update webcam feed freshness aging
      updateWebcamAging();

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

// Reset Demo State (Feature 4)
function resetDemoState(skipConfirm = false) {
  const performReset = () => {
    // Safely stop webcam and release all media stream tracks without leaking
    stopWebcam();
    resetWebcamState();

    cameras = JSON.parse(JSON.stringify(INITIAL_CAMERAS));
    config = { ...DEFAULT_CONFIG };
    alerts = [
      {
        id: 'ALT-103-STALE',
        cameraId: 'CAM-103',
        cameraName: 'Material Storage',
        severity: 'warning',
        reason: 'Camera upload delayed beyond 180s threshold (Feed is CRITICAL STALE).',
        whatHappened: 'Image upload delayed for 4 minutes, exceeding the 180s threshold (Feed is CRITICAL STALE).',
        whyUntrusted: 'Severe transmission delay creates a surveillance blindspot. Workers or machinery may have moved since capture.',
        siteRiskStatus: 'UNKNOWN',
        lastObservation: 'Worker without helmet near gantry (Recorded 4 min ago).',
        recommendedAction: 'Feed stale. Current site condition cannot be verified. Request immediate manual inspection or switch to backup CAM-107. DO NOT assume area is safe.',
        timestamp: new Date().toISOString()
      },
      {
        id: 'ALT-104-OFFLINE',
        cameraId: 'CAM-104',
        cameraName: 'East Excavation',
        severity: 'critical',
        reason: 'Feed heartbeat lost. Last successful upload > 5 minutes ago (OFFLINE).',
        whatHappened: 'Camera signal lost. No heartbeat or frame received for 7 minutes (> 300s timeout).',
        whyUntrusted: 'Camera feed is completely unavailable. High-risk excavation pit perimeter is unmonitored.',
        siteRiskStatus: 'UNKNOWN',
        lastObservation: 'Excavator near trench edge.',
        recommendedAction: 'CAM-104 is offline. Trench conditions cannot be verified. Immediate physical inspection required. Never declare trench safe without visual confirmation.',
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
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('smartsight_config');
        localStorage.removeItem('smartsight_cameras');
        localStorage.removeItem('smartsight_alerts');
        localStorage.removeItem('smartsight_audit_log');
      }
    } catch (e) {}

    showToast('Demo state successfully reset to initial scenario.', 'info');
    renderDashboard();
  };

  if (skipConfirm || typeof document === 'undefined') {
    performReset();
  } else {
    openConfirmDialog(
      'Reset Demo State?',
      'This will restore the initial demonstration scenario (2 Fresh, 1 Stale, 1 Offline camera) and default threshold configurations.',
      performReset
    );
  }
}

// ============================================================================
// 11B. GUIDED DEMO WALKTHROUGH ENGINE (Priority 2)
// ============================================================================

const GUIDED_STEPS = [
  {
    stepNumber: 1,
    title: 'Fresh Feed Validation',
    targetCamId: 'CAM-101',
    headline: 'Normal Automated Surveillance on Fresh Feed',
    description: 'When a camera delivers frames captured within the freshness limit (≤ 60s), the surveillance engine verifies temporal ordering, hash uniqueness, and allows AI hazard evaluation to proceed normally.',
    action: () => {
      runScenarioFresh('CAM-101');
    },
    diffItems: [
      { label: 'Target Camera', value: 'CAM-101 (North Access Gate)' },
      { label: 'Feed Freshness', value: 'FRESH (Age: 12s ≤ 60s limit)' },
      { label: 'AI Confidence', value: '96% (Verified on active live frame)' },
      { label: 'Current Site Risk', value: 'LOW (Verified Safe by active detection)' },
      { label: 'Active Alerts', value: '0 Alerts for CAM-101 (Normal monitoring active)' }
    ]
  },
  {
    stepNumber: 2,
    title: 'Stale / Offline Invalidation',
    targetCamId: 'CAM-101',
    headline: 'Zero-Trust Lockout: Site Risk Demoted to UNKNOWN',
    description: 'When image upload latency exceeds the threshold (> 180s) or carrier drops, the image CANNOT be trusted to prove site safety. The engine immediately locks current site risk to UNKNOWN, invalidates AI confidence, and dispatches an actionable alert recommending manual physical inspection.',
    action: () => {
      runScenarioCriticalStale('CAM-101');
    },
    diffItems: [
      { label: 'Target Camera', value: 'CAM-101 (North Access Gate)' },
      { label: 'Feed Freshness', value: 'CRITICAL STALE (5 min old > 180s limit)' },
      { label: 'AI Confidence', value: 'N/A (Invalidated — zero trust on stale feed)' },
      { label: 'Current Site Risk', value: 'LOCKED TO UNKNOWN (Fail-safe: never assumed safe)' },
      { label: 'Actionable Alert', value: 'ALT-CAM-101-STALE dispatched (Manual inspection recommended)' }
    ]
  },
  {
    stepNumber: 3,
    title: 'Validated Stream Recovery',
    targetCamId: 'CAM-101',
    headline: 'Resuming Safety Monitoring After Fresh Handshake',
    description: 'Safety warnings are NOT cleared by manual notes alone. The camera must transmit a genuinely new, fresh frame (8s old) with a unique cryptographic hash. Once validated, normal hazard evaluation resumes and alerts are safely resolved.',
    action: () => {
      runScenarioRecovery('CAM-101');
    },
    diffItems: [
      { label: 'Target Camera', value: 'CAM-101 (North Access Gate)' },
      { label: 'Feed Freshness', value: 'RESTORED TO FRESH (Age: 8s ≤ 60s limit)' },
      { label: 'AI Confidence', value: '94% (Live detection re-established)' },
      { label: 'Current Site Risk', value: 'LOW (Verified Safe on live frame)' },
      { label: 'Actionable Alert', value: 'Resolved & cleared after verified fresh frame' }
    ]
  }
];

let guidedDemoActive = false;
let currentGuidedStepIndex = 0;

function startGuidedDemo() {
  guidedDemoActive = true;
  currentGuidedStepIndex = 0;
  renderGuidedDemoStep();

  if (typeof document !== 'undefined') {
    const deck = document.getElementById('guided-demo-deck');
    if (deck) {
      deck.removeAttribute('hidden');
      if (typeof deck.scrollIntoView === 'function') {
        deck.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  showToast('Guided Demo Started: Step 1 of 3 (Fresh Feed Validation).', 'info');
}

function nextGuidedStep() {
  if (!guidedDemoActive) {
    startGuidedDemo();
    return;
  }
  if (currentGuidedStepIndex < GUIDED_STEPS.length - 1) {
    currentGuidedStepIndex++;
    renderGuidedDemoStep();
    showToast(`Guided Demo: Step ${currentGuidedStepIndex + 1} of 3 (${GUIDED_STEPS[currentGuidedStepIndex].title}).`, 'info');
  } else {
    // Restart from step 1
    currentGuidedStepIndex = 0;
    renderGuidedDemoStep();
    showToast('Guided Demo restarted from Step 1.', 'info');
  }
}

function prevGuidedStep() {
  if (!guidedDemoActive) return;
  if (currentGuidedStepIndex > 0) {
    currentGuidedStepIndex--;
    renderGuidedDemoStep();
    showToast(`Guided Demo: Returned to Step ${currentGuidedStepIndex + 1} of 3.`, 'info');
  }
}

function exitGuidedDemo() {
  guidedDemoActive = false;
  if (typeof document !== 'undefined') {
    const deck = document.getElementById('guided-demo-deck');
    if (deck) {
      deck.setAttribute('hidden', '');
    }
    document.querySelectorAll('.camera-card').forEach(c => c.classList.remove('guided-tour-highlight'));
  }
  showToast('Exited Guided Demo. Manual scenario controls active.', 'info');
}

function renderGuidedDemoStep() {
  const step = GUIDED_STEPS[currentGuidedStepIndex];
  if (!step) return;

  // Execute step action
  step.action();

  if (typeof document === 'undefined') return;

  // Highlight target card
  document.querySelectorAll('.camera-card').forEach(c => c.classList.remove('guided-tour-highlight'));
  const targetCard = document.getElementById(`card-${step.targetCamId}`);
  if (targetCard) {
    targetCard.classList.add('guided-tour-highlight');
    setTimeout(() => {
      if (typeof targetCard.scrollIntoView === 'function') {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }

  // Update deck DOM elements
  const counterEl = document.getElementById('guided-step-counter');
  const titleEl = document.getElementById('guided-step-title');
  const headlineEl = document.getElementById('guided-headline');
  const textEl = document.getElementById('guided-text');
  const targetNoteEl = document.getElementById('guided-target-note');
  const diffListEl = document.getElementById('guided-diff-list');
  const prevBtn = document.getElementById('guided-prev-btn');
  const nextBtn = document.getElementById('guided-next-btn');

  if (counterEl) counterEl.textContent = `STEP ${step.stepNumber} OF 3`;
  if (titleEl) titleEl.textContent = step.title;
  if (headlineEl) headlineEl.textContent = step.headline;
  if (textEl) textEl.textContent = step.description;
  if (targetNoteEl) {
    targetNoteEl.innerHTML = `Observing target: <strong>${step.targetCamId}</strong> (highlighted below)`;
  }

  if (diffListEl) {
    diffListEl.innerHTML = step.diffItems.map(item => `
      <li class="guided-diff-item">
        <span class="diff-label">${item.label}:</span>
        <span class="diff-val">${item.value}</span>
      </li>
    `).join('');
  }

  if (prevBtn) {
    prevBtn.disabled = currentGuidedStepIndex === 0;
  }

  if (nextBtn) {
    if (currentGuidedStepIndex === GUIDED_STEPS.length - 1) {
      nextBtn.innerHTML = `<span>Restart Tour</span> <i data-lucide="rotate-ccw"></i>`;
    } else {
      nextBtn.innerHTML = `<span>Next: ${GUIDED_STEPS[currentGuidedStepIndex + 1].title}</span> <i data-lucide="arrow-right"></i>`;
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function getGuidedState() {
  return {
    active: guidedDemoActive,
    stepIndex: currentGuidedStepIndex,
    steps: GUIDED_STEPS
  };
}

// ============================================================================
// 11B. LIVE LAPTOP WEBCAM ENGINE & FRAME FRESHNESS MONITOR
// Client-Side WebRTC Integration, Frame Validation & Decoupled Site Risk
// ============================================================================

// Operational Dashboard Mode ('webcam' | 'simulated')
let currentAppMode = 'webcam';

// Webcam State Model
const webcamState = {
  stream: null,
  isStreaming: false,
  permissionStatus: 'prompt', // 'prompt' | 'granted' | 'denied' | 'missing' | 'busy' | 'unsupported' | 'error'
  errorMessage: null,
  deviceLabel: 'Laptop Integrated Webcam',

  // Frame Capture & Freshness
  lastValidCaptureTimestamp: null,
  lastValidFrameAgeSec: null,
  lastValidFrameHash: null,
  lastValidAvgLuma: null,
  lastCapturedImageDataUrl: null,
  lastCaptureTimeFormatted: 'No frame captured',
  captureStatus: 'OFFLINE', // 'MISSING' | 'FRESH' | 'STALE' | 'CRITICAL STALE' | 'OFFLINE'

  // Validation
  lastValidationResult: null, // 'VALID' | 'DUPLICATE' | 'EMPTY_INVALID' | null
  lastRejectionReason: null,

  // Safety Decoupling
  currentRisk: 'UNKNOWN',
  lastKnownHazardObservation: null,
  lastKnownHazardTimestamp: null,
  recommendedAction: 'Camera offline: Start webcam or conduct immediate physical inspection. Never declare site safe based on outdated feeds.',
  statusReason: 'Webcam is stopped. No valid frames captured.',
  riskExplanation: 'Current site risk locked to UNKNOWN: camera stream is offline. Outdated or missing feeds cannot verify safety.',

  // AI Limitations Notice
  aiHazardStatus: 'Not implemented (Simulation only)',
  aiConfidenceText: 'N/A (Real-time AI model not connected)'
};

/**
 * Switch operational mode between Live Laptop Webcam and Simulated Camera Grid
 * @param {'webcam' | 'simulated'} mode
 */
function setAppMode(mode, shouldScroll = false) {
  currentAppMode = mode;
  const webcamSec = document.getElementById('webcam-section');
  const simSec = document.getElementById('cameras-section');
  const simWrapper = document.getElementById('simulated-wrapper');
  const btnWebcam = document.getElementById('btn-mode-webcam');
  const btnSim = document.getElementById('btn-mode-simulated');
  const statusText = document.getElementById('current-mode-status-text');
  const navWebcam = document.getElementById('sidebar-nav-webcam');
  const navCameras = document.getElementById('sidebar-nav-cameras');

  if (btnWebcam) {
    btnWebcam.classList.toggle('active', mode === 'webcam');
    btnWebcam.setAttribute('aria-selected', mode === 'webcam' ? 'true' : 'false');
  }
  if (btnSim) {
    btnSim.classList.toggle('active', mode === 'simulated');
    btnSim.setAttribute('aria-selected', mode === 'simulated' ? 'true' : 'false');
  }

  if (mode === 'webcam') {
    if (statusText) {
      statusText.innerHTML = '<span class="indicator-dot dot-live"></span> Live Webcam Mode Active';
    }
    if (navWebcam) navWebcam.classList.add('active');
    if (navCameras) navCameras.classList.remove('active');
    if (webcamSec) {
      webcamSec.classList.add('mode-focused');
      if (shouldScroll) {
        webcamSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    if (simSec) simSec.classList.remove('mode-focused');
  } else {
    if (statusText) {
      statusText.innerHTML = '<span class="indicator-dot dot-sim"></span> Simulated Camera Mode Active';
    }
    if (navWebcam) navWebcam.classList.remove('active');
    if (navCameras) navCameras.classList.add('active');
    if (simSec) {
      simSec.classList.add('mode-focused');
      if (shouldScroll) {
        simSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    if (webcamSec) webcamSec.classList.remove('mode-focused');
  }

  if (webcamSec) webcamSec.style.display = 'block';
  if (simWrapper) simWrapper.style.display = 'block';

  if (typeof window !== 'undefined' && window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Start laptop webcam via browser getUserMedia API
 * @param {MediaStream|null} mockStream - Optional mock stream for automated test environments
 * @returns {Promise<boolean>}
 */
async function startWebcam(mockStream = null) {
  const hasGetUserMedia = typeof navigator !== 'undefined' && 
                          navigator.mediaDevices && 
                          typeof navigator.mediaDevices.getUserMedia === 'function';

  if (!hasGetUserMedia && !mockStream) {
    webcamState.permissionStatus = 'unsupported';
    webcamState.errorMessage = 'Camera access (getUserMedia) is not supported in this browser environment or requires HTTPS / localhost.';
    webcamState.statusReason = 'getUserMedia API is unsupported in this context.';
    webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: camera API is unavailable.';
    webcamState.recommendedAction = 'Open SmartSight in a supported browser (Chrome, Edge, Firefox, Safari) with WebRTC permissions enabled.';
    addAuditLog({
      cameraId: 'WEBCAM-LOCAL',
      eventType: 'HARDWARE_UNSUPPORTED',
      severity: 'failure',
      description: 'getUserMedia is not supported or not accessible in this context.',
      feedState: 'UNSUPPORTED',
      riskImpact: 'UNKNOWN'
    });
    renderWebcamSection();
    showToast('Webcam API is not supported in this browser environment.', 'error');
    return false;
  }

  try {
    let stream;
    if (mockStream) {
      stream = mockStream;
    } else {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
    }

    webcamState.stream = stream;
    webcamState.isStreaming = true;
    webcamState.permissionStatus = 'granted';
    webcamState.errorMessage = null;

    // Detect device label if track available
    const videoTrack = stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
    if (videoTrack && videoTrack.label) {
      webcamState.deviceLabel = videoTrack.label;
    } else {
      webcamState.deviceLabel = 'Integrated Laptop Webcam';
    }

    // Attach stream to video element
    const videoEl = document.getElementById('webcam-preview');
    if (videoEl) {
      videoEl.srcObject = stream;
      if (typeof videoEl.play === 'function') {
        videoEl.play().catch(e => console.warn('Webcam autoplay note:', e));
      }
    }

    // Important: Merely keeping stream open does NOT count as a validated frame!
    if (!webcamState.lastValidCaptureTimestamp) {
      webcamState.captureStatus = 'MISSING';
      webcamState.currentRisk = 'UNKNOWN';
      webcamState.statusReason = 'Webcam stream is active. Active stream alone does NOT count as a validated frame. Click "Capture Frame" to snapshot and validate.';
      webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: stream active but zero validated frames captured.';
      webcamState.recommendedAction = 'Click "Capture Frame" to snapshot and validate a frame, or perform physical site inspection.';
    }

    addAuditLog({
      cameraId: 'WEBCAM-LOCAL',
      eventType: 'STREAM_CONNECTED',
      severity: 'info',
      description: `Laptop webcam stream started successfully (${webcamState.deviceLabel}). Permission granted.`,
      feedState: webcamState.captureStatus,
      riskImpact: 'UNKNOWN'
    });

    renderWebcamSection();
    showToast('Webcam started. Click "Capture Frame" to validate feed.', 'success');
    return true;
  } catch (err) {
    webcamState.isStreaming = false;
    webcamState.stream = null;
    webcamState.captureStatus = 'OFFLINE';
    webcamState.currentRisk = 'UNKNOWN';

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      webcamState.permissionStatus = 'denied';
      webcamState.errorMessage = 'Camera permission was denied. Click the camera icon in your browser address bar to grant permission, then click "Start Camera" again.';
      webcamState.statusReason = 'Permission denied by user or system policy.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      webcamState.permissionStatus = 'missing';
      webcamState.errorMessage = 'No webcam device found. Please verify that your laptop webcam is enabled or connect an external camera.';
      webcamState.statusReason = 'No camera hardware found.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      webcamState.permissionStatus = 'busy';
      webcamState.errorMessage = 'Camera is currently busy or being used by another application (e.g., Zoom, Teams, Google Meet). Please close other apps and try again.';
      webcamState.statusReason = 'Camera is locked by another process.';
    } else {
      webcamState.permissionStatus = 'error';
      webcamState.errorMessage = `Unable to start camera: ${err.message || 'Media stream error'}`;
      webcamState.statusReason = `Camera initialization error: ${err.name || 'Error'}`;
    }

    webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: camera stream is unavailable.';
    webcamState.recommendedAction = 'Verify camera hardware and browser permissions, or dispatch physical site inspection.';

    addAuditLog({
      cameraId: 'WEBCAM-LOCAL',
      eventType: 'STREAM_FAILED',
      severity: 'failure',
      description: webcamState.errorMessage,
      feedState: 'OFFLINE',
      riskImpact: 'UNKNOWN'
    });

    renderWebcamSection();
    showToast(webcamState.errorMessage, 'error');
    return false;
  }
}

/**
 * Stop laptop webcam and cleanly release all MediaStream tracks
 */
function stopWebcam() {
  if (webcamState.stream) {
    try {
      const tracks = typeof webcamState.stream.getTracks === 'function' 
        ? webcamState.stream.getTracks() 
        : [];
      tracks.forEach(track => {
        if (typeof track.stop === 'function') {
          track.stop();
        }
      });
    } catch (e) {
      console.warn('Error stopping tracks:', e);
    }
    webcamState.stream = null;
  }

  const wasStreaming = webcamState.isStreaming;
  webcamState.isStreaming = false;
  webcamState.captureStatus = 'OFFLINE';
  webcamState.currentRisk = 'UNKNOWN';
  webcamState.statusReason = webcamState.lastValidCaptureTimestamp
    ? `Webcam stream stopped by user. Last valid frame was captured ${formatTimeAge(webcamState.lastValidFrameAgeSec || 0)} ago.`
    : 'Webcam is stopped. No valid frames captured.';
  webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: camera stream is stopped. Outdated or missing feeds cannot verify safety.';
  webcamState.recommendedAction = 'Camera offline: Start webcam or conduct immediate physical inspection.';

  const videoEl = document.getElementById('webcam-preview');
  if (videoEl) {
    videoEl.srcObject = null;
  }

  if (wasStreaming) {
    addAuditLog({
      cameraId: 'WEBCAM-LOCAL',
      eventType: 'STREAM_STOPPED',
      severity: 'info',
      description: 'Webcam stream stopped by user. All MediaStream tracks safely released.',
      feedState: 'OFFLINE',
      riskImpact: 'UNKNOWN'
    });
    showToast('Webcam stopped and media tracks released.', 'info');
  }

  renderWebcamSection();
}

/**
 * Lightweight client-side frame validation
 * @param {Uint8ClampedArray|Array|null} pixelData - RGBA or luminance array
 * @param {string|null} prevHash - Previous valid frame hash
 * @param {number} width - Sample width
 * @param {number} height - Sample height
 * @returns {Object} { isValid, result, reason, hash, avgLuma }
 */
function validateWebcamFrame(pixelData, prevHash = null, width = 16, height = 16) {
  if (!pixelData || pixelData.length === 0) {
    return {
      isValid: false,
      result: 'EMPTY_INVALID',
      reason: 'Empty image payload received (zero bytes or null canvas data).',
      hash: null,
      avgLuma: 0
    };
  }

  const lumas = [];
  let totalLuma = 0;
  const step = pixelData.length >= width * height * 4 ? 4 : 1;

  for (let i = 0; i < pixelData.length; i += step) {
    let luma;
    if (step === 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      luma = 0.299 * r + 0.587 * g + 0.114 * b;
    } else {
      luma = pixelData[i];
    }
    lumas.push(luma);
    totalLuma += luma;
  }

  const avgLuma = totalLuma / lumas.length;

  // Check variance for solid black or empty frame
  let variance = 0;
  for (let l of lumas) {
    variance += (l - avgLuma) * (l - avgLuma);
  }
  const stdDev = Math.sqrt(variance / lumas.length);

  // Reject blank or completely black frame (lens covered or empty buffer)
  if (avgLuma < 3 && stdDev < 2) {
    return {
      isValid: false,
      result: 'EMPTY_INVALID',
      reason: 'Empty or blank frame detected (average luminance < 3). Lens may be covered or stream buffer is uninitialized.',
      hash: null,
      avgLuma
    };
  }

  // Generate perceptual binary hash based on average luminance
  let hashBits = '';
  for (let l of lumas) {
    hashBits += (l >= avgLuma ? '1' : '0');
  }

  // Duplicate detection comparison
  if (prevHash && prevHash.length === hashBits.length) {
    let diffBits = 0;
    for (let i = 0; i < hashBits.length; i++) {
      if (hashBits[i] !== prevHash[i]) {
        diffBits++;
      }
    }
    const diffPct = (diffBits / hashBits.length) * 100;
    // If difference is <= 1.5% (Hamming distance threshold)
    if (diffBits <= Math.max(2, Math.floor(hashBits.length * 0.015))) {
      return {
        isValid: false,
        result: 'DUPLICATE',
        reason: `Consecutive frame is visually identical to previous capture (${(100 - diffPct).toFixed(1)}% match). Likely frozen buffer or replayed frame. Note: Visual similarity is an approximation and cannot prove that an image is stale.`,
        hash: hashBits,
        avgLuma,
        diffBits
      };
    }
  }

  return {
    isValid: true,
    result: 'VALID',
    reason: 'Valid frame captured with distinct entropy and verified timestamp.',
    hash: hashBits,
    avgLuma
  };
}

/**
 * Capture frame from live webcam video onto canvas and perform validation
 * @param {HTMLCanvasElement|null} mockCanvas - Optional canvas for testing
 * @returns {Object}
 */
function captureWebcamFrame(mockCanvas = null) {
  if (!webcamState.isStreaming) {
    showToast('Camera is not streaming. Click "Start Camera" first.', 'warning');
    return { success: false, result: 'NOT_STREAMING', reason: 'Webcam is stopped.', status: 'OFFLINE' };
  }

  const canvas = mockCanvas || document.getElementById('webcam-captured-canvas');
  const video = document.getElementById('webcam-preview');

  if (!canvas) {
    return { success: false, result: 'NO_CANVAS', reason: 'Canvas element not found.', status: webcamState.captureStatus };
  }

  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) {
    return { success: false, result: 'NO_CTX', reason: 'Canvas 2D context not available.', status: webcamState.captureStatus };
  }

  // Draw video frame to canvas if video is playing
  if (video && video.videoWidth && video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Sample pixel data for validation
  let pixelData = null;
  try {
    let sampleCanvas;
    if (typeof document !== 'undefined' && document.createElement) {
      sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 16;
      sampleCanvas.height = 16;
      const sCtx = sampleCanvas.getContext('2d');
      if (sCtx && typeof sCtx.drawImage === 'function') {
        sCtx.drawImage(canvas, 0, 0, 16, 16);
        if (typeof sCtx.getImageData === 'function') {
          const img = sCtx.getImageData(0, 0, 16, 16);
          pixelData = img ? img.data : null;
        }
      }
    }
  } catch (e) {
    console.warn('Canvas pixel extraction notice:', e);
  }

  // Validate the captured frame
  const validation = validateWebcamFrame(pixelData, webcamState.lastValidFrameHash, 16, 16);

  if (!validation.isValid) {
    webcamState.lastValidationResult = validation.result;
    webcamState.lastRejectionReason = validation.reason;

    // Do NOT refresh last valid timestamp or frame age!
    const rejectionEvent = validation.result === 'DUPLICATE' ? 'FRAME_DUPLICATE_REJECTED' : 'FRAME_INVALID_REJECTED';
    const severity = validation.result === 'DUPLICATE' ? 'warning' : 'failure';

    addAuditLog({
      cameraId: 'WEBCAM-LOCAL',
      eventType: rejectionEvent,
      severity,
      description: validation.reason,
      feedState: webcamState.captureStatus,
      riskImpact: 'UNKNOWN'
    });

    renderWebcamSection();
    showToast(`Capture Rejected: ${validation.result === 'DUPLICATE' ? 'Likely Duplicate Frame' : 'Invalid/Empty Frame'}`, 'warning');
    return {
      success: false,
      result: validation.result,
      reason: validation.reason,
      status: webcamState.captureStatus
    };
  }

  // Valid Frame Accepted!
  webcamState.lastValidCaptureTimestamp = Date.now();
  webcamState.lastValidFrameAgeSec = 0;
  webcamState.lastValidFrameHash = validation.hash;
  webcamState.lastValidAvgLuma = validation.avgLuma;
  webcamState.lastValidationResult = 'VALID';
  webcamState.lastRejectionReason = null;
  webcamState.captureStatus = 'FRESH';
  webcamState.lastCaptureTimeFormatted = new Date().toLocaleTimeString();

  // Resume normal safety workflow
  webcamState.currentRisk = webcamState.lastKnownHazardObservation ? 'HIGH' : 'LOW';
  webcamState.statusReason = `Valid frame captured and verified (Age: 0s ≤ ${config.freshThreshold}s limit). Feed integrity FRESH.`;
  webcamState.riskExplanation = webcamState.lastKnownHazardObservation
    ? `Active hazard noted in inspection: ${webcamState.lastKnownHazardObservation}. Feed is FRESH.`
    : `Feed is FRESH (age 0s ≤ ${config.freshThreshold}s). Normal surveillance active. (Note: Automated AI hazard detection is not implemented; manual inspections continue).`;
  webcamState.recommendedAction = 'Feed verified fresh. Regular surveillance and manual safety patrols continue.';

  addAuditLog({
    cameraId: 'WEBCAM-LOCAL',
    eventType: 'FRAME_VALIDATED',
    severity: 'recovery',
    description: `Valid webcam frame captured and verified (Hash: ${validation.hash.slice(0, 10)}...). Freshness timestamp renewed.`,
    feedState: 'FRESH',
    riskImpact: webcamState.currentRisk
  });

  renderWebcamSection();
  showToast('Frame captured & validated as FRESH!', 'success');
  return {
    success: true,
    result: 'VALID',
    status: 'FRESH',
    hash: validation.hash
  };
}

/**
 * Clear captured frame and reset capture state
 */
function clearCapturedFrame() {
  webcamState.lastValidCaptureTimestamp = null;
  webcamState.lastValidFrameAgeSec = null;
  webcamState.lastValidFrameHash = null;
  webcamState.lastValidAvgLuma = null;
  webcamState.lastValidationResult = null;
  webcamState.lastRejectionReason = null;
  webcamState.lastCaptureTimeFormatted = 'No frame captured';
  webcamState.captureStatus = webcamState.isStreaming ? 'MISSING' : 'OFFLINE';
  webcamState.currentRisk = 'UNKNOWN';
  webcamState.statusReason = webcamState.isStreaming
    ? 'Captured frame cleared. Stream active but no validated frame is held.'
    : 'Webcam is stopped. No valid frames captured.';
  webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: no validated frame is active.';
  webcamState.recommendedAction = 'Click "Capture Frame" to snapshot and validate a frame, or perform physical site inspection.';

  const canvas = document.getElementById('webcam-captured-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    if (ctx && typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  addAuditLog({
    cameraId: 'WEBCAM-LOCAL',
    eventType: 'FRAME_CLEARED',
    severity: 'info',
    description: 'Captured frame cleared from in-browser buffer. Feed status set to MISSING.',
    feedState: webcamState.captureStatus,
    riskImpact: 'UNKNOWN'
  });

  renderWebcamSection();
  showToast('Captured frame cleared.', 'info');
}

/**
 * Toggle demo hazard observation for testing safety decoupling
 */
function toggleDemoHazardRecord() {
  if (!webcamState.lastKnownHazardObservation) {
    webcamState.lastKnownHazardObservation = 'Fall Arrest Violation: Worker unclipped at elevation (Demo Observation)';
    webcamState.lastKnownHazardTimestamp = new Date().toLocaleTimeString();
    if (webcamState.captureStatus === 'FRESH') {
      webcamState.currentRisk = 'HIGH';
      webcamState.riskExplanation = 'Active hazard verified on FRESH feed: ' + webcamState.lastKnownHazardObservation;
    } else {
      webcamState.currentRisk = 'UNKNOWN'; // Core invariant: stale/missing feed MUST NOT show active high/low
      webcamState.riskExplanation = `Site risk locked to UNKNOWN: feed is ${webcamState.captureStatus}. Prior hazard observation preserved as historical record only.`;
    }
    showToast('Demo hazard observation recorded.', 'warning');
  } else {
    webcamState.lastKnownHazardObservation = null;
    webcamState.lastKnownHazardTimestamp = null;
    if (webcamState.captureStatus === 'FRESH') {
      webcamState.currentRisk = 'LOW';
      webcamState.riskExplanation = 'Feed is FRESH (≤ 60s). Zero hazards recorded. Normal surveillance active.';
    } else {
      webcamState.currentRisk = 'UNKNOWN';
      webcamState.riskExplanation = `Site risk locked to UNKNOWN: feed is ${webcamState.captureStatus}.`;
    }
    showToast('Demo hazard observation cleared.', 'info');
  }

  renderWebcamSection();
}

/**
 * Recalculate webcam freshness age and update status
 */
function updateWebcamAging() {
  if (!webcamState.isStreaming) {
    webcamState.captureStatus = 'OFFLINE';
    webcamState.currentRisk = 'UNKNOWN';
    webcamState.statusReason = webcamState.lastValidCaptureTimestamp
      ? `Webcam stream is offline. Last valid frame was captured ${formatTimeAge(webcamState.lastValidFrameAgeSec || 0)} ago.`
      : 'Webcam is stopped. No valid frames captured.';
    webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: camera stream is offline. Outdated imagery cannot verify safety.';
    webcamState.recommendedAction = 'Camera offline: Start webcam or conduct immediate physical inspection.';
    renderWebcamSection();
    return;
  }

  if (!webcamState.lastValidCaptureTimestamp) {
    webcamState.captureStatus = 'MISSING';
    webcamState.currentRisk = 'UNKNOWN';
    webcamState.statusReason = 'Webcam stream is active. Active stream alone does NOT count as a validated frame. Click "Capture Frame" to snapshot and validate.';
    webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: stream active but zero validated frames captured.';
    webcamState.recommendedAction = 'Click "Capture Frame" to snapshot and validate a frame, or perform manual physical site inspection.';
    renderWebcamSection();
    return;
  }

  const elapsedMs = Date.now() - webcamState.lastValidCaptureTimestamp;
  const ageSec = Math.floor(elapsedMs / 1000);
  webcamState.lastValidFrameAgeSec = ageSec;

  if (ageSec <= config.freshThreshold) {
    webcamState.captureStatus = 'FRESH';
    webcamState.currentRisk = webcamState.lastKnownHazardObservation ? 'HIGH' : 'LOW';
    webcamState.statusReason = `Last valid frame captured ${formatTimeAge(ageSec)} ago (≤ ${config.freshThreshold}s demo limit). Feed integrity verified.`;
    webcamState.riskExplanation = webcamState.lastKnownHazardObservation
      ? `Active hazard noted in inspection: ${webcamState.lastKnownHazardObservation}. Feed is FRESH.`
      : `Feed is FRESH (age ${formatTimeAge(ageSec)} ≤ ${config.freshThreshold}s). Normal surveillance active. (Note: AI hazard detection is not implemented; physical patrols continue).`;
    webcamState.recommendedAction = 'Feed is verified fresh. Continue regular site monitoring and physical inspections.';
  } else if (ageSec <= config.staleThreshold) {
    webcamState.captureStatus = 'STALE';
    webcamState.currentRisk = 'UNKNOWN'; // CORE FAIL-SAFE
    webcamState.statusReason = `Last valid frame captured ${formatTimeAge(ageSec)} ago (> ${config.freshThreshold}s limit). Feed integrity degraded.`;
    webcamState.riskExplanation = `Current site risk locked to UNKNOWN: frame is STALE (${formatTimeAge(ageSec)} old). Outdated images cannot prove site safety.`;
    webcamState.recommendedAction = 'Feed is stale. Capture a new frame to refresh feed freshness, or conduct manual physical inspection. DO NOT assume area is safe.';
  } else {
    webcamState.captureStatus = 'CRITICAL STALE';
    webcamState.currentRisk = 'UNKNOWN'; // CORE FAIL-SAFE
    webcamState.statusReason = `Last valid frame captured ${formatTimeAge(ageSec)} ago (> ${config.staleThreshold}s critical threshold). Feed severely outdated.`;
    webcamState.riskExplanation = `Current site risk locked to UNKNOWN: feed is CRITICAL STALE (${formatTimeAge(ageSec)} old). Immediate inspection required.`;
    webcamState.recommendedAction = 'Feed is critically stale. Capture a new frame immediately or dispatch safety supervisor. NEVER assume site is safe based on outdated images.';
  }

  renderWebcamSection();
}

/**
 * Reset webcam state back to initial offline baseline
 */
function resetWebcamState() {
  stopWebcam();
  webcamState.permissionStatus = 'prompt';
  webcamState.errorMessage = null;
  webcamState.deviceLabel = 'Laptop Integrated Webcam';
  webcamState.lastValidCaptureTimestamp = null;
  webcamState.lastValidFrameAgeSec = null;
  webcamState.lastValidFrameHash = null;
  webcamState.lastValidAvgLuma = null;
  webcamState.lastCapturedImageDataUrl = null;
  webcamState.lastCaptureTimeFormatted = 'No frame captured';
  webcamState.captureStatus = 'OFFLINE';
  webcamState.lastValidationResult = null;
  webcamState.lastRejectionReason = null;
  webcamState.currentRisk = 'UNKNOWN';
  webcamState.lastKnownHazardObservation = null;
  webcamState.lastKnownHazardTimestamp = null;
  webcamState.recommendedAction = 'Camera offline: Start webcam or conduct physical site inspection.';
  webcamState.statusReason = 'Webcam is stopped. No valid frames captured.';
  webcamState.riskExplanation = 'Current site risk locked to UNKNOWN: camera stream is offline.';

  const canvas = document.getElementById('webcam-captured-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    if (ctx && typeof ctx.clearRect === 'function') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  renderWebcamSection();
}

/**
 * Render all Webcam Section DOM elements
 */
function renderWebcamSection() {
  const permBadge = document.getElementById('perm-status-badge');
  const permBanner = document.getElementById('webcam-permission-banner');
  const permTitle = document.getElementById('perm-banner-title');
  const permDesc = document.getElementById('perm-banner-desc');

  // 1. Permission Banner
  if (permBadge && permBanner) {
    permBanner.className = `webcam-permission-banner banner-${webcamState.permissionStatus}`;
    permBadge.className = `perm-status-badge badge-${webcamState.permissionStatus}`;

    switch (webcamState.permissionStatus) {
      case 'granted':
        permBadge.textContent = 'PERMISSION: GRANTED';
        if (permTitle) permTitle.textContent = 'Camera Permission Granted & Active';
        if (permDesc) permDesc.textContent = `Live video stream connected from ${webcamState.deviceLabel}. Zero frames transmitted externally.`;
        break;
      case 'denied':
        permBadge.textContent = 'PERMISSION: DENIED';
        if (permTitle) permTitle.textContent = 'Camera Access Denied';
        if (permDesc) permDesc.textContent = webcamState.errorMessage || 'Browser permission was denied. Please allow camera permissions in your browser address bar.';
        break;
      case 'missing':
        permBadge.textContent = 'HARDWARE: NOT FOUND';
        if (permTitle) permTitle.textContent = 'No Camera Device Detected';
        if (permDesc) permDesc.textContent = webcamState.errorMessage || 'No camera hardware found on this computer.';
        break;
      case 'busy':
        permBadge.textContent = 'HARDWARE: BUSY';
        if (permTitle) permTitle.textContent = 'Camera In Use Elsewhere';
        if (permDesc) permDesc.textContent = webcamState.errorMessage || 'Camera is locked by another running application.';
        break;
      case 'unsupported':
        permBadge.textContent = 'BROWSER: UNSUPPORTED';
        if (permTitle) permTitle.textContent = 'getUserMedia Unsupported';
        if (permDesc) permDesc.textContent = webcamState.errorMessage || 'Camera API is not supported in this browser environment.';
        break;
      default:
        permBadge.textContent = 'PERMISSION: PROMPT';
        if (permTitle) permTitle.textContent = 'Camera Permission: Ready to Request';
        if (permDesc) permDesc.textContent = 'Click "Start Camera" below to grant browser webcam access. Video will not start automatically without user interaction.';
    }
  }

  // 2. Video Preview elements
  const streamBadge = document.getElementById('webcam-stream-status-badge');
  const videoPlaceholder = document.getElementById('webcam-video-placeholder');
  const videoHud = document.getElementById('webcam-video-hud');
  const startBtn = document.getElementById('webcam-start-btn');
  const stopBtn = document.getElementById('webcam-stop-btn');
  const captureBtn = document.getElementById('webcam-capture-btn');
  const hudDevice = document.getElementById('webcam-hud-device');

  if (streamBadge) {
    if (webcamState.isStreaming) {
      streamBadge.textContent = 'STREAM ACTIVE';
      streamBadge.className = 'stream-status-badge status-streaming';
    } else {
      streamBadge.textContent = 'CAMERA OFFLINE';
      streamBadge.className = 'stream-status-badge status-offline';
    }
  }

  if (videoPlaceholder) {
    videoPlaceholder.style.display = webcamState.isStreaming ? 'none' : 'flex';
  }
  if (videoHud) {
    videoHud.style.display = webcamState.isStreaming ? 'flex' : 'none';
  }
  if (hudDevice) {
    hudDevice.textContent = webcamState.deviceLabel;
  }

  if (startBtn) startBtn.disabled = webcamState.isStreaming;
  if (stopBtn) stopBtn.disabled = !webcamState.isStreaming;
  if (captureBtn) captureBtn.disabled = !webcamState.isStreaming;

  // 3. Captured Frame elements
  const captureBadge = document.getElementById('webcam-capture-badge');
  const canvasPlaceholder = document.getElementById('webcam-canvas-placeholder');
  const canvasHud = document.getElementById('webcam-canvas-hud');
  const snapshotHudTime = document.getElementById('webcam-snapshot-timestamp-hud');

  if (captureBadge) {
    if (!webcamState.lastValidCaptureTimestamp && !webcamState.lastValidationResult) {
      captureBadge.textContent = 'NO FRAME CAPTURED';
      captureBadge.className = 'capture-validity-badge badge-missing';
    } else if (webcamState.lastValidationResult === 'VALID') {
      captureBadge.textContent = `VALID (${webcamState.captureStatus})`;
      captureBadge.className = `capture-validity-badge badge-granted`;
    } else if (webcamState.lastValidationResult === 'DUPLICATE') {
      captureBadge.textContent = 'REJECTED: DUPLICATE';
      captureBadge.className = 'capture-validity-badge badge-busy';
    } else if (webcamState.lastValidationResult === 'EMPTY_INVALID') {
      captureBadge.textContent = 'REJECTED: EMPTY/BLANK';
      captureBadge.className = 'capture-validity-badge badge-denied';
    }
  }

  const hasCapture = !!(webcamState.lastValidCaptureTimestamp || webcamState.lastValidationResult);
  if (canvasPlaceholder) {
    canvasPlaceholder.style.display = hasCapture ? 'none' : 'flex';
  }
  if (canvasHud) {
    canvasHud.style.display = hasCapture ? 'flex' : 'none';
  }
  if (snapshotHudTime) {
    snapshotHudTime.textContent = webcamState.lastCaptureTimeFormatted || '--:--:--';
  }

  // 4. Rejection Alert box
  const rejectionAlert = document.getElementById('webcam-rejection-alert');
  const rejectionTitle = document.getElementById('webcam-rejection-title');
  const rejectionReason = document.getElementById('webcam-rejection-reason');

  if (rejectionAlert) {
    if (webcamState.lastValidationResult && webcamState.lastValidationResult !== 'VALID' && webcamState.lastRejectionReason) {
      rejectionAlert.style.display = 'flex';
      if (rejectionTitle) {
        rejectionTitle.textContent = webcamState.lastValidationResult === 'DUPLICATE'
          ? 'Consecutive Duplicate Frame Rejected'
          : 'Empty or Blank Frame Rejected';
      }
      if (rejectionReason) {
        rejectionReason.textContent = webcamState.lastRejectionReason;
      }
    } else {
      rejectionAlert.style.display = 'none';
    }
  }

  // 5. Four Metric KPI Cards
  const metricConn = document.getElementById('metric-webcam-connection');
  const metricConnDesc = document.getElementById('metric-webcam-conn-desc');
  if (metricConn) {
    metricConn.textContent = webcamState.isStreaming ? 'STREAMING' : 'OFFLINE';
    metricConn.className = `metric-status-badge ${webcamState.isStreaming ? 'status-streaming' : 'status-offline'}`;
  }
  if (metricConnDesc) {
    metricConnDesc.textContent = webcamState.isStreaming ? 'MediaStream active' : 'MediaStream stopped';
  }

  const metricLastFrame = document.getElementById('metric-webcam-last-frame');
  const metricFrameAge = document.getElementById('metric-webcam-frame-age');
  if (metricLastFrame) {
    metricLastFrame.textContent = webcamState.lastCaptureTimeFormatted || 'Never Captured';
  }
  if (metricFrameAge) {
    metricFrameAge.textContent = webcamState.lastValidFrameAgeSec !== null
      ? `Frame Age: ${formatTimeAge(webcamState.lastValidFrameAgeSec)}`
      : 'Frame Age: N/A';
  }

  const metricFreshness = document.getElementById('metric-webcam-freshness');
  const metricFreshnessDesc = document.getElementById('metric-webcam-freshness-desc');
  if (metricFreshness) {
    metricFreshness.textContent = webcamState.captureStatus;
    let badgeClass = 'status-missing';
    if (webcamState.captureStatus === 'FRESH') badgeClass = 'status-fresh';
    else if (webcamState.captureStatus === 'STALE') badgeClass = 'status-stale';
    else if (webcamState.captureStatus === 'CRITICAL STALE') badgeClass = 'status-critical';
    else if (webcamState.captureStatus === 'OFFLINE') badgeClass = 'status-offline';
    metricFreshness.className = `metric-status-badge ${badgeClass}`;
  }
  if (metricFreshnessDesc) {
    if (webcamState.captureStatus === 'FRESH') metricFreshnessDesc.textContent = `Age ≤ ${config.freshThreshold}s (Verified)`;
    else if (webcamState.captureStatus === 'STALE') metricFreshnessDesc.textContent = `Age 61s–${config.staleThreshold}s (Degraded)`;
    else if (webcamState.captureStatus === 'CRITICAL STALE') metricFreshnessDesc.textContent = `Age > ${config.staleThreshold}s (High delay)`;
    else if (webcamState.captureStatus === 'OFFLINE') metricFreshnessDesc.textContent = 'Camera disconnected';
    else metricFreshnessDesc.textContent = 'No valid frame ingested';
  }

  const metricRisk = document.getElementById('metric-webcam-risk');
  const metricRiskDesc = document.getElementById('metric-webcam-risk-desc');
  if (metricRisk) {
    metricRisk.textContent = webcamState.currentRisk;
    let riskClass = 'status-unknown';
    if (webcamState.currentRisk === 'LOW') riskClass = 'status-low';
    else if (webcamState.currentRisk === 'HIGH') riskClass = 'status-high';
    metricRisk.className = `metric-status-badge ${riskClass}`;
  }
  if (metricRiskDesc) {
    if (webcamState.currentRisk === 'UNKNOWN') metricRiskDesc.textContent = 'Feed unverified; safety unknown';
    else if (webcamState.currentRisk === 'LOW') metricRiskDesc.textContent = 'Verified compliant on fresh frame';
    else if (webcamState.currentRisk === 'HIGH') metricRiskDesc.textContent = 'Verified hazard on fresh frame';
  }

  // 6. Action Strip text
  const integrityReason = document.getElementById('webcam-integrity-reason');
  if (integrityReason) integrityReason.textContent = webcamState.statusReason;

  const riskExplanation = document.getElementById('webcam-risk-explanation');
  if (riskExplanation) riskExplanation.textContent = webcamState.riskExplanation;

  const actionText = document.getElementById('webcam-recommended-action-text');
  if (actionText) actionText.textContent = webcamState.recommendedAction;

  // 7. Historical hazard observation
  const histText = document.getElementById('webcam-historical-text');
  const histTime = document.getElementById('webcam-historical-time');
  if (histText) {
    histText.textContent = webcamState.lastKnownHazardObservation || 'No prior hazard observation recorded.';
  }
  if (histTime) {
    histTime.textContent = webcamState.lastKnownHazardTimestamp
      ? `Recorded: ${webcamState.lastKnownHazardTimestamp}`
      : 'Timestamp: None';
  }
}

// ============================================================================
// 12. INITIALIZATION & GLOBAL EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Setup clock & ticker
  setupLiveClockAndAging();

  // Initial render
  renderDashboard();

  // Operational Mode Switcher Controls
  document.getElementById('btn-mode-webcam')?.addEventListener('click', () => setAppMode('webcam'));
  document.getElementById('btn-mode-simulated')?.addEventListener('click', () => setAppMode('simulated'));

  // Real Laptop Webcam Controls
  document.getElementById('webcam-start-btn')?.addEventListener('click', () => startWebcam());
  document.getElementById('webcam-stop-btn')?.addEventListener('click', () => stopWebcam());
  document.getElementById('webcam-capture-btn')?.addEventListener('click', () => captureWebcamFrame());
  document.getElementById('webcam-clear-capture-btn')?.addEventListener('click', () => clearCapturedFrame());
  document.getElementById('webcam-inject-hazard-btn')?.addEventListener('click', () => toggleDemoHazardRecord());

  // Window unload cleanup (safely release media tracks)
  window.addEventListener('beforeunload', () => stopWebcam());

  // Guided Demo Walkthrough Controls (Priority 2)
  document.getElementById('start-guided-demo-btn')?.addEventListener('click', startGuidedDemo);
  document.getElementById('btn-start-guided-from-strip')?.addEventListener('click', startGuidedDemo);
  document.getElementById('guided-prev-btn')?.addEventListener('click', prevGuidedStep);
  document.getElementById('guided-next-btn')?.addEventListener('click', nextGuidedStep);
  document.getElementById('guided-exit-btn')?.addEventListener('click', exitGuidedDemo);

  // Header controls
  document.getElementById('reset-demo-header-btn')?.addEventListener('click', () => resetDemoState());
  document.getElementById('reset-demo-sidebar-btn')?.addEventListener('click', () => resetDemoState());

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

  // Scenario Buttons (Feature 4: 7 Scenarios + Reset)
  const getSelectedCam = () => document.getElementById('simulation-target-select')?.value || 'CAM-101';
  document.getElementById('simulation-target-select')?.addEventListener('change', () => {
    renderCameraGrid();
    if (window.lucide) window.lucide.createIcons();
  });
  document.getElementById('btn-scenario-a')?.addEventListener('click', () => runScenarioFresh(getSelectedCam()));
  document.getElementById('btn-scenario-stale')?.addEventListener('click', () => runScenarioStale(getSelectedCam()));
  document.getElementById('btn-scenario-b')?.addEventListener('click', () => runScenarioCriticalStale(getSelectedCam()));
  document.getElementById('btn-scenario-c')?.addEventListener('click', () => runScenarioOffline(getSelectedCam()));
  document.getElementById('btn-scenario-invalid')?.addEventListener('click', () => runScenarioInvalid(getSelectedCam()));
  document.getElementById('btn-scenario-d')?.addEventListener('click', () => runScenarioDuplicate(getSelectedCam()));
  document.getElementById('btn-scenario-e')?.addEventListener('click', () => runScenarioRecovery(getSelectedCam()));
  document.getElementById('btn-scenario-reset')?.addEventListener('click', () => resetDemoState());

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

  // Settings Modal & Page Handlers
  const settingsModal = document.getElementById('settings-modal-backdrop');
  const openSettings = () => {
    populateSettingsForm();
    if (settingsModal) {
      settingsModal.removeAttribute('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  };

  document.getElementById('header-settings-btn')?.addEventListener('click', (e) => {
    if (settingsModal) {
      e.preventDefault();
      openSettings();
    }
  });
  document.getElementById('open-settings-btn')?.addEventListener('click', (e) => {
    if (settingsModal) {
      e.preventDefault();
      openSettings();
    }
  });
  document.getElementById('settings-close-btn')?.addEventListener('click', () => settingsModal?.setAttribute('hidden', ''));

  const handleSettingsSave = () => {
    const freshInput = document.getElementById('threshold-fresh-input');
    const staleInput = document.getElementById('threshold-stale-input');
    const offlineInput = document.getElementById('threshold-offline-input');
    const agingInput = document.getElementById('aging-speed-input');

    if (freshInput) config.freshThreshold = parseInt(freshInput.value, 10) || 60;
    if (staleInput) config.staleThreshold = parseInt(staleInput.value, 10) || 180;
    if (offlineInput) config.offlineTimeout = parseInt(offlineInput.value, 10) || 300;
    if (agingInput) config.agingSpeedMultiplier = parseInt(agingInput.value, 10) || 1;

    saveStateToLocalStorage();
    if (settingsModal && !settingsModal.hasAttribute('hidden')) {
      settingsModal.setAttribute('hidden', '');
    }
    showToast('Validation thresholds saved successfully.', 'success');
    renderDashboard();
  };

  const handleSettingsReset = () => {
    config = { ...DEFAULT_CONFIG };
    populateSettingsForm();
    saveStateToLocalStorage();
    showToast('Defaults restored in settings.', 'info');
    renderDashboard();
  };

  document.getElementById('settings-save-btn')?.addEventListener('click', handleSettingsSave);
  document.getElementById('settings-page-save-btn')?.addEventListener('click', handleSettingsSave);
  document.getElementById('settings-reset-default-btn')?.addEventListener('click', handleSettingsReset);
  document.getElementById('settings-page-reset-btn')?.addEventListener('click', handleSettingsReset);

  // Challenge Card Context Modal
  const challengeModal = document.getElementById('challenge-modal-backdrop');
  document.getElementById('open-challenge-info-btn')?.addEventListener('click', (e) => {
    if (challengeModal) {
      e.preventDefault();
      challengeModal.removeAttribute('hidden');
      if (window.lucide) window.lucide.createIcons();
    }
  });
  document.getElementById('challenge-close-btn')?.addEventListener('click', () => challengeModal?.setAttribute('hidden', ''));
  document.getElementById('challenge-modal-dismiss-btn')?.addEventListener('click', () => challengeModal?.setAttribute('hidden', ''));

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
  document.getElementById('mobile-sidebar-open')?.addEventListener('click', () => sidebar?.classList.add('open'));
  document.getElementById('mobile-sidebar-close')?.addEventListener('click', () => sidebar?.classList.remove('open'));

  // Safely stop webcam tracks when navigating away or unbinding
  window.addEventListener('beforeunload', () => stopWebcam());
  window.addEventListener('pagehide', () => stopWebcam());

  // Keyboard Escape Handler for Accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (settingsModal && !settingsModal.hasAttribute('hidden')) settingsModal.setAttribute('hidden', '');
      if (challengeModal && !challengeModal.hasAttribute('hidden')) challengeModal.setAttribute('hidden', '');
      const camModal = document.getElementById('camera-modal-backdrop');
      if (camModal && !camModal.hasAttribute('hidden')) closeCameraModal();
      const confModal = document.getElementById('confirm-modal-backdrop');
      if (confModal && !confModal.hasAttribute('hidden')) closeConfirmDialog();
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

// ============================================================================
// 13. GLOBAL EXPORTS (For Testing & Developer Console Diagnostics)
// ============================================================================

const SmartSightExports = {
  DEFAULT_CONFIG,
  getConfig: () => config,
  getCameras: () => cameras,
  getAlerts: () => alerts,
  getAuditLog: () => auditLog,
  validateCameraFrame,
  updateCameraAging,
  getStatusReason,
  getRiskExplanation,
  runScenarioFresh,
  runScenarioStale,
  runScenarioCriticalStale,
  runScenarioOffline,
  runScenarioInvalid,
  runScenarioDuplicate,
  runScenarioRecovery,
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  runScenarioE,
  requestManualInspection,
  resolveManualInspection,
  resetDemoState,
  renderDashboard,
  getRecommendedAction,
  startGuidedDemo,
  nextGuidedStep,
  prevGuidedStep,
  exitGuidedDemo,
  GUIDED_STEPS,
  getGuidedState: () => ({ active: guidedDemoActive, stepIndex: currentGuidedStepIndex, steps: GUIDED_STEPS }),
  // Real Laptop Webcam & Mode Management Exports
  getWebcamState: () => webcamState,
  startWebcam,
  stopWebcam,
  captureWebcamFrame,
  validateWebcamFrame,
  clearCapturedFrame,
  toggleDemoHazardRecord,
  updateWebcamAging,
  resetWebcamState,
  setAppMode,
  getAppMode: () => currentAppMode,
  renderWebcamSection
};

if (typeof window !== 'undefined') {
  window.SmartSight = SmartSightExports;
}
if (typeof globalThis !== 'undefined') {
  globalThis.SmartSight = SmartSightExports;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartSightExports;
}
