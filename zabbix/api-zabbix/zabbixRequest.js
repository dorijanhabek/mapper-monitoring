const axios = require('axios');
const fs = require('fs');

const ZABBIX_SEVERITIES = process.env.ZABBIX_SEVERITIES?.split(',').map(Number);
const ZABBIX_LOOKBACK_SECONDS = parseInt(process.env.ZABBIX_LOOKBACK_SECONDS, 10);

// Validate environment variables
if (!ZABBIX_SEVERITIES || !Array.isArray(ZABBIX_SEVERITIES) || ZABBIX_SEVERITIES.some(isNaN)) {
    console.error('[ENV ERROR] ZABBIX_SEVERITIES must be an array of numbers.');
    process.exit(1);
}

if (!ZABBIX_LOOKBACK_SECONDS || isNaN(ZABBIX_LOOKBACK_SECONDS) || ZABBIX_LOOKBACK_SECONDS <= 0) {
    console.error('[ENV ERROR] ZABBIX_LOOKBACK_SECONDS must be a positive number.');
    process.exit(1);
}

async function fetchZabbixProblems({ url, token, mode }) {
  const headers = {
    'Content-Type': 'application/json-rpc'
  };

  const now = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = now - ZABBIX_LOOKBACK_SECONDS;

  const data = {
    jsonrpc: '2.0',
    method: 'problem.get',
    params: {
      severities: ZABBIX_SEVERITIES,
      sortfield: 'eventid',
      sortorder: 'DESC',
      acknowledged: false,
      time_from: sevenDaysAgo
    },
    id: 1
  };

  if (mode === 'old') {
    data.auth = token; // Auth token for Zabbix 6 and lower
  } else {
    headers.Authorization = `Bearer ${token}`; // Bearer token for Zabbix 6+
  }

  return axios.post(url, data, { headers });
}

module.exports = fetchZabbixProblems;