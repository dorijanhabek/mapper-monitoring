const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// Configurable time variables (in milliseconds)
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10); // How often to check for alerts

// Alertmanager connection
const ALERTMANAGER_URL = process.env.ALERTMANAGER_URL;

// Fail fast if required env vars are missing
if (!ALERTMANAGER_URL || !POLL_INTERVAL) {
    console.error('[ENV ERROR] Missing ALERTMANAGER_URL or POLL_INTERVAL.');
    process.exit(1);
  }

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('API SERVER healthy');
  });

// Path to alerts.json in the tocka folder
const ALERT_FILE = path.join(__dirname, 'tocka', 'alerts.json');

app.use(cors());

// Ensure alerts.json exists with a default false state
fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: false }, null, 2));
console.log('[INIT] Reset alerts.json to default false state.');

// Function to check alerts and update the state in alerts.json
const updateAlertState = async () => {
    console.log('\n[------------------------------------------------------------]\n');
    console.log('[ALERT CHECK] Checking Alertmanager for active problems...');

    try {
        const response = await axios.get(ALERTMANAGER_URL);
        const hasActiveAlerts = response.data.length > 0;

        console.log('[SOURCE] Alertmanager response:', JSON.stringify(response.data, null, 2));

        fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts, internalError: false }, null, 2));
        console.log('[ALERT CHECK] Updated alert state:', { hasActiveAlerts });
        console.log('[ERROR CHECK] Updated internal error state: { internalError: false }');
    } catch (error) {
        console.error('[SOURCE ERROR] Failed to fetch alerts:', error);
        fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: true }, null, 2));
        console.log('[ERROR CHECK] Updated internal error state: { internalError: true }');
    }
    console.log('\n[------------------------------------------------------------]\n');
};

// Initial check
console.log('[INIT] Performing initial Alertmanager alert check...');
updateAlertState();

// Periodically update the alert status
setInterval(updateAlertState, POLL_INTERVAL); // Use the POLL_INTERVAL variable

app.listen(3000, () => {
    console.log(`[API SERVER] Running on port 3000. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[API SERVER] ALERTMANAGER_URL:', ALERTMANAGER_URL);