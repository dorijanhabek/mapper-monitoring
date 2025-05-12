const axios = require('axios');
const fs = require('fs');

const ZABBIX_SEVERITIES = process.env.ZABBIX_SEVERITIES?.split(',').map(Number);

// Fail fast if required env vars are missing
if (!ZABBIX_SEVERITIES || ZABBIX_SEVERITIES.some(isNaN)) {
  throw new Error("[ENV ERROR] Missing ZABBIX_SEVERITIES.");
}

async function fetchZabbixProblems({ url, token, mode }) {
  const headers = {
    'Content-Type': 'application/json-rpc'
  };

  const now = Math.floor(Date.now() / 1000);
  const lookback = parseInt(process.env.ZABBIX_LOOKBACK_SECONDS, 10);
  const sevenDaysAgo = now - lookback;

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