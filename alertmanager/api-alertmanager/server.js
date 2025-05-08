const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
require('dotenv').config();

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

// Configurable time variables (in milliseconds)
const POLL_INTERVAL = process.env.POLL_INTERVAL; // How often to check for alerts

// Path to alerts.json in the tocka folder
const ALERT_FILE = path.join(__dirname, 'tocka', 'alerts.json');

app.use(cors());

// Serve static files (index.html, alerts.json, etc.) from the tocka folder
app.use(express.static(path.join(__dirname, 'tocka')));

// Ensure alerts.json exists with a default false state
fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: false }, null, 2));
console.log('[INIT] Reset alerts.json to default false state.');

// Function to check alerts and update the state in alerts.json
const updateAlertState = async () => {
    try {
        const response = await axios.get(process.env.ALERTMANAGER_URL);
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