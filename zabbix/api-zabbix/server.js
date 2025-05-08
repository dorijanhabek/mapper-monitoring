const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

// Configurable time variables (in milliseconds)
const POLL_INTERVAL = process.env.POLL_INTERVAL; // How often to check for alerts

// Path to alerts.json in the tocka folder
const ALERT_FILE = path.join(__dirname, 'tocka', 'alerts.json');

// Zabbix connection
const ZABBIX_URL = process.env.ZABBIX_URL;
const ZABBIX_TOKEN = process.env.ZABBIX_TOKEN; // Replace with your real API token

app.use(cors());
app.use(express.static(path.join(__dirname, 'tocka')));

// Ensure alerts.json exists with a default false state
fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: false }, null, 2));
console.log('[INIT] Reset alerts.json to default false state.');

// Function to check Zabbix alerts and update alerts.json
const updateAlertState = async () => {
    console.log('[CHECK ALERTS] Checking Zabbix for active problems...');

    console.log('[DEBUG] ZABBIX_URL:', ZABBIX_URL);

    try {
        const response = await axios.post(
            ZABBIX_URL,
            {
                jsonrpc: '2.0',
                method: 'problem.get',
                params: {
                    severities: [4, 5], // High + Disaster
                    sortfield: 'eventid',
                    sortorder: 'DESC'
                },
                id: 1
            },
            {
                headers: {
                    'Content-Type': 'application/json-rpc',
                    'Authorization': `Bearer ${ZABBIX_TOKEN}`
                }
            }
        );

        console.log('[DEBUG] Zabbix response:', JSON.stringify(response.data, null, 2));

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
        console.error('[ERROR] Failed to fetch problems from Zabbix:', error.message);
        fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: true }, null, 2));
    }
};

// Initial check
console.log('[INIT] Performing initial Zabbix alert check...');
updateAlertState();

// Periodically update the alert status
setInterval(updateAlertState, POLL_INTERVAL);

app.listen(3000, () => {
    console.log(`[SERVER] API server running on port 3000. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});