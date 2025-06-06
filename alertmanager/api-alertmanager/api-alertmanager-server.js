const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Configurable time variables (in milliseconds)
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10); // How often to check for alerts

// Alertmanager connection
const ALERTMANAGER_URL = process.env.ALERTMANAGER_URL;

// API server port
const API_PORT = process.env.API_PORT;

// Validate environment variables
if (!ALERTMANAGER_URL) {
    console.error('[ENV ERROR] ALERTMANAGER_URL is missing.');
    process.exit(1);
}

if (!POLL_INTERVAL || isNaN(POLL_INTERVAL) || POLL_INTERVAL <= 0) {
    console.error('[ENV ERROR] POLL_INTERVAL must be a positive number.');
    process.exit(1);
}

if (!API_PORT || isNaN(API_PORT) || API_PORT <= 0) {
    console.error('[ENV ERROR] API_PORT must be a positive number.');
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
app.get('/internal', (req, res) => {
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

app.listen(API_PORT, () => {
    console.log(`[API SERVER] Running on port ${API_PORT}. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[API SERVER] ALERTMANAGER_URL:', ALERTMANAGER_URL);
