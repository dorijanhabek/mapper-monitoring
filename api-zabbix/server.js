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

// Zabbix connection
const ZABBIX_URL = 'http://cratis-ubuntu-lab:7080/api_jsonrpc.php';
const ZABBIX_TOKEN = 'a97192dca8e5ca252eeefd0f43a853ab36b94d99d812b0c09533e25c340c099b'; // Replace with your real API token

app.use(cors());
app.use(express.static(path.join(__dirname, 'kai')));

// Ensure alerts.json exists with a default false state
fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts: false, internalError: false }, null, 2));
console.log('[INIT] Reset alerts.json to default false state.');

// Function to check Zabbix alerts and update alerts.json
const updateAlertState = async () => {
    console.log('[CHECK ALERTS] Checking Zabbix for active problems...');

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
            throw new Error(`Zabbix API error: ${response.data.error.message} — ${response.data.error.data}`);
        }

        if (Array.isArray(response.data.result)) {
            const hasActiveAlerts = response.data.result.length > 0;

            fs.writeFileSync(ALERT_FILE, JSON.stringify({ hasActiveAlerts, internalError: false }, null, 2));
            console.log('[ALERT CHECK] Updated alert state:', { hasActiveAlerts });
        } else {
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