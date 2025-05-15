const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const fetchZabbixProblems = require('./zabbixRequest');

// Configurable time variables (in milliseconds)
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10); // How often to check for alerts

// Zabbix connection
const ZABBIX_URL = process.env.ZABBIX_URL;
const ZABBIX_TOKEN = process.env.ZABBIX_TOKEN;
const ZABBIX_MODE = process.env.ZABBIX_MODE;
const ZABBIX_LOOKBACK_SECONDS = process.env.ZABBIX_LOOKBACK_SECONDS;

// API server port
const API_PORT = process.env.API_PORT;

// Validate environment variables
if (!ZABBIX_URL) {
    console.error('[ENV ERROR] ZABBIX_URL is missing.');
    process.exit(1);
}

if (!ZABBIX_TOKEN) {
    console.error('[ENV ERROR] ZABBIX_TOKEN is missing.');
    process.exit(1);
}

if (!POLL_INTERVAL || isNaN(POLL_INTERVAL) || POLL_INTERVAL <= 0) {
    console.error('[ENV ERROR] POLL_INTERVAL must be a positive number.');
    process.exit(1);
}

if (!ZABBIX_LOOKBACK_SECONDS || isNaN(ZABBIX_LOOKBACK_SECONDS) || ZABBIX_LOOKBACK_SECONDS <= 0) {
    console.error('[ENV ERROR] ZABBIX_LOOKBACK_SECONDS must be a positive number.');
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

// Function to check Zabbix alerts and update in-memory state
const updateAlertState = async () => {
    console.log('\n[------------------------------------------------------------]\n');
    console.log('[ALERT CHECK] Checking Zabbix for active problems...');

    try {
        const response = await fetchZabbixProblems({
            url: ZABBIX_URL,
            token: ZABBIX_TOKEN,
            mode: ZABBIX_MODE.toLowerCase()
        });

        console.log('[SOURCE] Zabbix response:', JSON.stringify(response.data, null, 2));

        if (response.data.error) {
            alertStatus = { hasActiveAlerts: false, internalError: true };
            console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
            console.log('\n[------------------------------------------------------------]\n');
            throw new Error(`[SOURCE ERROR] Zabbix API error: ${response.data.error.message} — ${response.data.error.data}`);
        }

        if (Array.isArray(response.data.result)) {
            const hasActiveAlerts = response.data.result.length > 0;
            alertStatus = { hasActiveAlerts, internalError: false };
            console.log('[ALERT CHECK] Updated alert state:', { hasActiveAlerts: alertStatus.hasActiveAlerts });
            console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
            console.log('\n[------------------------------------------------------------]\n');
        } else {
            alertStatus = { hasActiveAlerts: false, internalError: true };
            console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
            console.log('\n[------------------------------------------------------------]\n');
            throw new Error(`[SOURCE ERROR] Unexpected Zabbix response structure: 'result' is not an array.`);
        }

    } catch (error) {
        console.error('[SOURCE ERROR] Failed to fetch problems from Zabbix!');
        alertStatus = { hasActiveAlerts: false, internalError: true };
        console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
        console.log('\n[------------------------------------------------------------]\n');
    }
};

// Initial check
console.log('[INIT] Performing initial Zabbix alert check...');
updateAlertState();

// Periodically update the alert status
setInterval(updateAlertState, POLL_INTERVAL);

// Start the server
app.listen(API_PORT, () => {
    console.log(`[API SERVER] Running on port ${API_PORT}. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[API SERVER] ZABBIX_URL:', ZABBIX_URL);