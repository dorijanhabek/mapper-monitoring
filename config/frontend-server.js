const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const FRONTEND_PORT = process.env.FRONTEND_PORT;
const API_URL = process.env.API_URL;
const API_CUSTOM_NAME = process.env.API_CUSTOM_NAME;
const SHOW_API_LABEL = process.env.SHOW_API_LABEL;
const SHOW_GLITCH_ANIMATION = process.env.SHOW_GLITCH_ANIMATION;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10);

// In-memory label list
let labelList = {
};

// In-memory alert state
let alertStatus = {
  hasActiveAlerts: false,
  internalError: false
};

// Validate environment variables
if (!API_URL) {
    console.error('[ENV ERROR] API_URL is missing.');
    process.exit(1);
}

if (!POLL_INTERVAL || isNaN(POLL_INTERVAL) || POLL_INTERVAL <= 0) {
    console.error('[ENV ERROR] POLL_INTERVAL must be a positive number.');
    process.exit(1);
}

if (!FRONTEND_PORT || isNaN(FRONTEND_PORT) || FRONTEND_PORT <= 0) {
    console.error('[ENV ERROR] FRONTEND_PORT must be a positive number.');
    process.exit(1);
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'tocka')));

// Health route for container monitoring
app.get('/health', (req, res) => {
  res.status(200).send('FRONTEND SERVER healthy');
});

// Internal error state
app.get('/internal', (req, res) => {
  res.status(200).json({ internalError: alertStatus.internalError });
});

// Active alerts status
app.get('/alerts', (req, res) => {
  res.status(200).json({ hasActiveAlerts: alertStatus.hasActiveAlerts });
});

// API labels
app.get('/label', (req, res) => {
  res.status(200).json(labelList);
});

// Glitch animation toggle
app.get('/glitch', (req, res) => {
  if (SHOW_GLITCH_ANIMATION === 'true') {
    res.status(200).send('Disabled');
  } else {
    res.status(204).send('Disabled');
  }
});

// Update or remove entries from labelList
function updateList(url, status) {
  // Respect SHOW_API_LABEL toggle
  if (SHOW_API_LABEL === 'false') return;
  
  if (!url || !status) return;

  if (status === 'CLEAR') {
    if (labelList[url]) {
      delete labelList[url];
      console.log(`[LABEL REMOVED] ${url}`);
    }
  } else {
    labelList[url] = status;
    console.log(`[LABEL UPDATED] ${url} -> ${status}`);
  }
}

// Backend check and update in-memory state
const checkBackendHealth = async () => {
  console.log('\n[++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++]\n');
  console.log('[CHECK] Starting full backend status check...');

  // Reset state for new poll
  let newState = {
    hasActiveAlerts: false,
    internalError: false
  };

  const apiUrls = API_URL.split(',').map(url => url.trim());
  const apiNames = API_CUSTOM_NAME ? API_CUSTOM_NAME.split(',').map(name => name.trim()) : apiUrls;

  // Validate that each API_URL has a corresponding API_CUSTOM_NAME
  if (apiNames.length !== apiUrls.length) {
    console.error('[ENV ERROR] API_URL and API_CUSTOM_NAME count mismatch.');
    process.exit(1);
  }

  for (let i = 0; i < apiUrls.length; i++) {
    const baseUrl = apiUrls[i];
    const isLast = i === apiUrls.length - 1;
    console.log('\n[************************************************************]\n');

    try {
      // Health check
      const healthRes = await axios.get(`${baseUrl}/health`, { timeout: 3000 });
      if (healthRes.status !== 200) throw new Error('[API ERROR] API not responding!');
      console.log(`[API OK] ${apiNames[i]} is healthy`);
      updateList(apiNames[i], 'CLEAR');

      // Internal error check
      const sourceRes = await axios.get(`${baseUrl}/internal`, { timeout: 3000 });
      if (sourceRes.data.internalError) {
        console.warn(`[SOURCE ERROR] ${apiNames[i]} reported source error!`);
        newState.internalError = true;
        alertStatus = newState;
        updateList(apiNames[i], 'SOURCE_ERROR');
        console.log('[UPDATE]', { internalError: alertStatus.internalError }, 'written to memory');
        if (isLast) {
          console.log('\n[++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++]\n');
          return;
        }
        continue;
      }
      console.log(`[SOURCE OK] ${apiNames[i]} has no source errors`);
      updateList(apiNames[i], 'CLEAR');

      // Alerts check
      const alertRes = await axios.get(`${baseUrl}/alerts`, { timeout: 3000 });
      if (alertRes.data.hasActiveAlerts) {
        newState.hasActiveAlerts = true;
        console.warn(`[ALERT DETECTED] ${apiNames[i]} has active alerts`);
        alertStatus = newState;
        updateList(apiNames[i], 'ALERT_DETECTED');
        console.log('[UPDATE]', { hasActiveAlerts: alertStatus.hasActiveAlerts }, 'written to memory');
        if (isLast) {
          console.log('\n[++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++]\n');
          return;
        }
        continue;
      }
      console.log(`[ALERT OK] ${apiNames[i]} has no alerts`);
      updateList(apiNames[i], 'CLEAR');

    } catch (error) {
      console.warn(`[API ERROR] ${apiNames[i]} is unreachable or failed!`);
      newState.internalError = true;
      alertStatus = newState;
      updateList(apiNames[i], 'API_ERROR');
      console.log('[UPDATE]', { internalError: alertStatus.internalError }, 'written to memory');
      if (isLast) {
        console.log('\n[++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++]\n');
        return;
      }
      continue;
    }
  }

  // Final state evaluation after all checks
  alertStatus = newState;
  if (!alertStatus.hasActiveAlerts && !alertStatus.internalError) {
    console.log('\n[************************************************************]');
    console.log('\n[CHECK DONE] Clean state written to memory:', { hasActiveAlerts: alertStatus.hasActiveAlerts, internalError: alertStatus.internalError });
  } else {
    console.log('\n[************************************************************]');
    console.log('\n[CHECK DONE]', { hasActiveAlerts: alertStatus.hasActiveAlerts, internalError: alertStatus.internalError }, 'written to memory');
  }
  console.log('\n[++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++]\n');
};

// Start backend monitoring loop
setInterval(checkBackendHealth, POLL_INTERVAL);
checkBackendHealth();

app.listen(FRONTEND_PORT, () => {
  console.log(`[FRONTEND SERVER] Running on port ${FRONTEND_PORT}. Polling interval set to ${POLL_INTERVAL / 1000} seconds.`);
});

console.log('[FRONTEND SERVER] API_URL:', API_URL);