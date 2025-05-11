const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const PORT = 80;
const API_URL = process.env.API_URL;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10);

// In-memory alert state
let alertStatus = {
  hasActiveAlerts: false,
  internalError: false
};

// Fail fast if required env vars are missing
if (!API_URL || !POLL_INTERVAL) {
  console.error('[ENV ERROR] Missing API_URL or POLL_INTERVAL.');
  process.exit(1);
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'tocka')));

// Health route for container monitoring
app.get('/health', (req, res) => {
  res.status(200).send('FRONTEND SERVER healthy');
});

// Internal error state
app.get('/internal', (req, res) => {
  res.status(200).json({ internalError: alertStatus.internalError });
});

// Active alerts status
app.get('/alerts', (req, res) => {
  res.status(200).json({ hasActiveAlerts: alertStatus.hasActiveAlerts });
});

// Backend check and update in-memory state
const checkBackendHealth = async () => {
  console.log('\n[************************************************************]\n');
  console.log('[CHECK] Starting full backend status check...');

  // Reset state for new poll
  let newState = {
    hasActiveAlerts: false,
    internalError: false
  };

  try {
    // Check /health
    const healthRes = await axios.get(`${API_URL}/health`, { timeout: 3000 });
    if (healthRes.status !== 200) throw new Error('[API ERROR] API not responding');
    console.log('[API OK] API is healthy');

    // Check /internal
    const sourceRes = await axios.get(`${API_URL}/internal`, { timeout: 3000 });
    if (sourceRes.data.internalError) {
      console.warn('[SOURCE ERROR] Detected source error');
      newState.internalError = true;
      alertStatus = newState;
      console.log('[UPDATE]', { internalError: alertStatus.internalError },'written to memory');
      console.log('\n[************************************************************]\n');
      return;
    }
    console.log('[SOURCE OK] No source error reported');

    // Check /alerts
    const alertRes = await axios.get(`${API_URL}/alerts`, { timeout: 3000 });
    if (alertRes.data.hasActiveAlerts) {
      newState.hasActiveAlerts = true;
      console.warn('[ALERT DETECTED] Active alerts detected');
      alertStatus = newState;
      console.log('[UPDATE]', { hasActiveAlerts: alertStatus.hasActiveAlerts },'written to memory');
      console.log('\n[************************************************************]\n');
      return;
    }

    console.log('[ALERT OK] No active alerts reported');
    alertStatus = newState;
    console.log('[UPDATE] Clean state written to memory:', { hasActiveAlerts: alertStatus.hasActiveAlerts, internalError: alertStatus.internalError });
    console.log('\n[************************************************************]\n');

  } catch (error) {
    console.warn('[API ERROR] API unreachable or failure occurred');
    newState.internalError = true;
    alertStatus = newState;
    console.log('[UPDATE]', { internalError: alertStatus.internalError },'written to memory');
    console.log('\n[************************************************************]\n');
  }
};

// Start backend monitoring loop
setInterval(checkBackendHealth, POLL_INTERVAL);
checkBackendHealth();

app.listen(PORT, () => {
  console.log(`[FRONTEND SERVER] Running on port ${PORT}. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[FRONTEND SERVER] API_URL:', API_URL);