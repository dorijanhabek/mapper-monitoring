const axios = require('axios');
const fs = require('fs');

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
      severities: [4, 5], // High + Disaster
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