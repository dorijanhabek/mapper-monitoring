const express = require('express');
const axios = require('axios');
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

// In-memory alert state
let alertStatus = {
    hasActiveAlerts: false,
    internalError: false
};

app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('API SERVER healthy');
});

// Internal error state
app.get('/source', (req, res) => {
    res.status(200).json({ internalError: alertStatus.internalError });
});

// Active alerts status
app.get('/alerts', (req, res) => {
    res.status(200).json({ hasActiveAlerts: alertStatus.hasActiveAlerts });
});

// Function to check Alertmanager alerts and update in-memory state
const updateAlertState = async () => {
    console.log('\n[------------------------------------------------------------]\n');
    console.log('[ALERT CHECK] Checking Alertmanager for active problems...');

    try {
        const response = await axios.get(`${ALERTMANAGER_URL}/api/v2/alerts`, { timeout: 3000 });
        const hasActiveAlerts = response.data.length > 0;

        alertStatus = { hasActiveAlerts, internalError: false };

        console.log('[SOURCE] Alertmanager response:', JSON.stringify(response.data, null, 2));
        console.log('[ALERT CHECK] Updated alert state:', { hasActiveAlerts: alertStatus.hasActiveAlerts });
        console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
        console.log('\n[------------------------------------------------------------]\n');
    } catch (error) {
        console.error('[SOURCE ERROR] Failed to fetch alerts from Alertmanager!');
        alertStatus = { hasActiveAlerts: false, internalError: true };
        console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
        console.log('\n[------------------------------------------------------------]\n');
    }
};

// Initial check
console.log('[INIT] Performing initial Alertmanager alert check...');
updateAlertState();

// Periodically update the alert status
setInterval(updateAlertState, POLL_INTERVAL);

app.listen(3000, () => {
    console.log(`[API SERVER] Running on port 3000. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[API SERVER] ALERTMANAGER_URL:', ALERTMANAGER_URL);
