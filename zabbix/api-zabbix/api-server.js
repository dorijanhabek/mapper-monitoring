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

// Fail fast if required env vars are missing
if (!ZABBIX_URL || !ZABBIX_TOKEN || !POLL_INTERVAL || !ZABBIX_LOOKBACK_SECONDS) {
    console.error('[ENV ERROR] Missing ZABBIX_URL, ZABBIX_TOKEN, POLL_INTERVAL or ZABBIX_LOOKBACK_SECONDS.');
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
            throw new Error(`[SOURCE ERROR] Zabbix API error: ${response.data.error.message} — ${response.data.error.data}`);
        }

        if (Array.isArray(response.data.result)) {
            const hasActiveAlerts = response.data.result.length > 0;
            alertStatus = { hasActiveAlerts, internalError: false };
            console.log('[ALERT CHECK] Updated alert state:', { hasActiveAlerts: alertStatus.hasActiveAlerts });
            console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
        } else {
            alertStatus = { hasActiveAlerts: false, internalError: true };
            console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
            throw new Error(`[SOURCE ERROR] Unexpected Zabbix response structure: 'result' is not an array.`);
        }

    } catch (error) {
        console.error('[SOURCE ERROR] Failed to fetch problems from Zabbix!');
        alertStatus = { hasActiveAlerts: false, internalError: true };
        console.log('[ERROR CHECK] Updated internal error state:', { internalError: alertStatus.internalError });
    }

    console.log('\n[------------------------------------------------------------]\n');
};

// Initial check
console.log('[INIT] Performing initial Zabbix alert check...');
updateAlertState();

// Periodically update the alert status
setInterval(updateAlertState, POLL_INTERVAL);

// Start the server
app.listen(3000, () => {
    console.log(`[API SERVER] Running on port 3000. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[API SERVER] ZABBIX_URL:', ZABBIX_URL);