const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const fetchZabbixProblems = require('./zabbixRequest');

//Fail fast if required env vars are missing
if (!process.env.ZABBIX_URL || !process.env.ZABBIX_TOKEN || !process.env.POLL_INTERVAL || !process.env.ZABBIX_LOOKBACK_SECONDS) {
    console.error('[ENV ERROR] Missing ZABBIX_URL, ZABBIX_TOKEN, POLL_INTERVAL or ZABBIX_LOOKBACK_SECONDS.');
    process.exit(1);
  } 

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('API SERVER healthy');
  });

// Configurable time variables (in milliseconds)
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10); // How often to check for alerts

// Path to alerts.json in the tocka folder
const ALERT_FILE = path.join(__dirname, 'tocka', 'alerts.json');

// Zabbix connection
const ZABBIX_URL = process.env.ZABBIX_URL;
const ZABBIX_TOKEN = process.env.ZABBIX_TOKEN; // Replace with your real API token

app.use(cors());

// Ensure alerts.json exists with a default false state
fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: false }, null, 2));
console.log('[INIT] Reset alerts.json to default false state.');

// Function to check Zabbix alerts and update alerts.json
const updateAlertState = async () => {
    console.log('[CHECK ALERTS] Checking Zabbix for active problems...');

    try {
        const response = await fetchZabbixProblems({
          url: process.env.ZABBIX_URL,
          token: process.env.ZABBIX_TOKEN,
          mode: process.env.ZABBIX_MODE.toLowerCase()
        });

        console.log('[SOURCE] Zabbix response:', JSON.stringify(response.data, null, 2));

        if (response.data.error) {
            fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: true }, null, 2));
            throw new Error(`Zabbix API error: ${response.data.error.message} — ${response.data.error.data}`);
        }

        if (Array.isArray(response.data.result)) {
            const hasActiveAlerts = response.data.result.length > 0;

            fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts, internalError: false }, null, 2));
            console.log('[ALERT CHECK] Updated alert state:', { hasActiveAlerts });
        } else {
            fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: true }, null, 2));
            throw new Error(`Unexpected Zabbix response structure: 'result' is not an array.`);
        }

    } catch (error) {
        console.error('[SOURCE ERROR] Failed to fetch problems from Zabbix:', error.message);
        fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: true }, null, 2));
    }
};

// Initial check
console.log('[INIT] Performing initial Zabbix alert check...');
updateAlertState();

// Periodically update the alert status
setInterval(updateAlertState, POLL_INTERVAL);

app.listen(3000, () => {
    console.log(`[API SERVER] Running on port 3000. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[API SERVER] ZABBIX_URL:', ZABBIX_URL);