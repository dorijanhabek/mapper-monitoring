const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// Configurable time variables (in milliseconds)
const POLL_INTERVAL = 10000; // How often to check for alerts

// Path to alerts.json in the kai folder
const ALERT_FILE = path.join(__dirname, 'kai', 'alerts.json');

app.use(cors());

// Serve static files (index.html, alerts.json, etc.) from the kai folder
app.use(express.static(path.join(__dirname, 'kai')));

// Ensure alerts.json exists with a default false state
fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: false }, null, 2));
console.log('[INIT] Reset alerts.json to default false state.');

// Function to check alerts and update the state in alerts.json
const updateAlertState = async () => {
    try {
        const response = await axios.get('http://kai-alertmanager:9093/api/v2/alerts');
        const hasActiveAlerts = response.data.length > 0;

        fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts, internalError: false }, null, 2));
        console.log('[ALERT CHECK] Updated alert state:', { hasActiveAlerts });
    } catch (error) {
        console.error('[ERROR] Failed to fetch alerts:', error);
        fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: true }, null, 2));
    }
};

// Initial check
console.log('[INIT] Performing initial Alertmanager alert check...');
updateAlertState();

// Periodically update the alert status
setInterval(updateAlertState, POLL_INTERVAL); // Use the POLL_INTERVAL variable

app.listen(3000, () => {
    console.log(`[SERVER] API server running on port 3000. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});