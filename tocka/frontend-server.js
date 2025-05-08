const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = 80;
const API_HEALTH_URL = process.env.API_URL;
const POLL_INTERVAL = process.env.POLL_INTERVAL;
const ALERT_FILE = path.join(__dirname, 'tocka', 'alerts.json');

// Fail fast if required env vars are missing
if (!API_HEALTH_URL || !POLL_INTERVAL) {
    console.error('[ENV ERROR] Missing API_URL or POLL_INTERVAL.');
    process.exit(1);
  }

// Serve static frontend files
app.use(express.static('/app'));

// Health route for container monitoring
app.get('/health', (req, res) => {
  res.status(200).send('Frontend healthy');
});

// Write internalError to alerts.json if API dies
const checkBackendHealth = async () => {
  try {
    const res = await axios.get(API_HEALTH_URL, { timeout: 3000 });
    if (res.status !== 200) throw new Error(`API unhealthy: ${res.status}`);
    console.log('[FRONTEND] Backend API is healthy.');
  } catch (error) {
    console.warn('[FRONTEND] Backend API unreachable, writing internalError to alerts.json');
    fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: true }, null, 2));
  }
};

// Start backend monitoring loop
setInterval(checkBackendHealth, POLL_INTERVAL);
checkBackendHealth();

app.listen(PORT, () => {
  console.log(`[FRONTEND] Node frontend running on port ${PORT}`);
});
