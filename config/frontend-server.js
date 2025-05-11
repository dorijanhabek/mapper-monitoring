const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 80;
const API_HEALTH_URL = process.env.API_URL;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10);
const ALERT_FILE = path.join(__dirname, 'tocka', 'alerts.json');

// Ensure alerts.json exists with a default false state
fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: false }, null, 2));
console.log('[INIT] Reset alerts.json to default false state.');

// Fail fast if required env vars are missing
if (!API_HEALTH_URL || !POLL_INTERVAL) {
    console.error('[ENV ERROR] Missing API_URL or POLL_INTERVAL.');
    process.exit(1);
  }

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'tocka')));

// Serve alerts.json
app.get('/alerts', (req, res) => {
  res.sendFile(ALERT_FILE);
});

// Health route for container monitoring
app.get('/health', (req, res) => {
  res.status(200).send('FRONTEND SERVER healthy');
});

// Write internalError to alerts.json if API dies
const checkBackendHealth = async () => {
  console.log('\n[************************************************************]\n');
  console.log('[CHECK] Starting full backend status check...');

  // Default fallback state
  let finalState = {
    hasActiveAlerts: false,
    internalError: false
  };

  try {
    // Check /health
    const healthRes = await axios.get(`${API_HEALTH_URL}/health`, { timeout: 3000 });
    if (healthRes.status !== 200) throw new Error('[API ERROR] API not responding');
    console.log('[API OK] API is healthy');

    // Check /source
    const sourceRes = await axios.get(`${API_HEALTH_URL}/source`, { timeout: 3000 });
    if (sourceRes.data.internalError) {
      console.warn('[SOURCE ERROR] Detected internal error');
      finalState.internalError = true;
      fs.writeFileSync(ALERT_FILE, JSON.stringify(finalState, null, 2));
      console.log('[WRITE] internalError=true written to alerts.json');
      console.log('\n[************************************************************]\n');
      return;
    }
    console.log('[SOURCE OK] No internal error reported');

    // Check /alerts
    const alertRes = await axios.get(`${API_HEALTH_URL}/alerts`, { timeout: 3000 });
    if (alertRes.data.hasActiveAlerts) {
      finalState.hasActiveAlerts = true;
      console.warn('[ALERT DETECTED] Active alerts detected');
      fs.writeFileSync(ALERT_FILE, JSON.stringify(finalState, null, 2));
      console.log('[WRITE] hasActiveAlerts=true written to alerts.json');
      console.log('\n[************************************************************]\n');
      return;
    }

    // All good — write clean state
    console.log('[ALERT OK] No active alerts reported');
    fs.writeFileSync(ALERT_FILE, JSON.stringify(finalState, null, 2));
    console.log('[WRITE] No alerts, no internal error written to alerts.json');
    console.log('\n[************************************************************]\n');

  } catch (error) {
    console.warn('[API ERROR] Backend unreachable or failure occurred');
    finalState.internalError = true;
    fs.writeFileSync(ALERT_FILE, JSON.stringify(finalState, null, 2));
    console.log('[WRITE] internalError=true written to alerts.json');
    console.log('\n[************************************************************]\n');
  }
};

// Start backend monitoring loop
setInterval(checkBackendHealth, POLL_INTERVAL);
checkBackendHealth();

app.listen(PORT, () => {
  console.log(`[FRONTEND SERVER] Running on port ${PORT}. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[FRONTEND SERVER] API_HEALTH_URL:', API_HEALTH_URL);