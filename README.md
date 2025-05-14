## License

This project is covered by a custom license. See LICENCE.md for terms.

---

# Frontend Environment Variables

| Variable           | Description                                                                 | Default / Example Value                     |
|--------------------|-----------------------------------------------------------------------------|----------------------------------------------|
| `SHOW_API_LABEL`   | Whether to display API labels in the frontend UI.                          | `true`                                       |
| `API_URL`          | Comma-separated list of backend API URLs to monitor.                       | `http://tocka-api-zabbix:3000`              |
| `API_CUSTOM_NAME`  | Comma-separated list of display names for backend APIs.                    | `tocka-api-zabbix`                           |
| `POLL_INTERVAL`    | How often to check the backend APIs (in milliseconds).                     | `10000`                                      |
| `FRONTEND_PORT`    | Port the frontend server listens on.                                       | `80`                                         |

---

# Zabbix API Environment Variables

| Variable                 | Description                                                           | Default / Example Value                     |
|--------------------------|------------------------------------------------------------------------|----------------------------------------------|
| `POLL_INTERVAL`          | How often to query Zabbix for alerts (in milliseconds).               | `10000`                                      |
| `ZABBIX_URL`             | Full URL to the Zabbix API endpoint.                                  | `http://cratis-ubuntu-lab:7080/api_jsonrpc.php` |
| `ZABBIX_TOKEN`           | API token used to authenticate with Zabbix.                           | `9e2260f1f6...` *(example)*                  |
| `ZABBIX_MODE`            | Authentication mode: `old` (token as param) or `new` (bearer token).  | `new`                                        |
| `ZABBIX_LOOKBACK_SECONDS`| Time window for fetching alerts from Zabbix (in seconds).             | `604800`                                     |
| `ZABBIX_SEVERITIES`      | Comma-separated severity levels to monitor (e.g., 2=Average, 5=Disaster). | `2,3,4,5`                                |
| `API_PORT`               | Port the Zabbix API service listens on.                               | `3000`                                       |

---

# Alertmanager API Environment Variables

| Variable           | Description                                                                 | Default / Example Value                     |
|--------------------|-----------------------------------------------------------------------------|----------------------------------------------|
| `POLL_INTERVAL`    | How often to check Alertmanager for active alerts (in milliseconds).       | `10000`                                      |
| `ALERTMANAGER_URL` | Full URL to the Alertmanager instance.                                     | `http://tocka-alertmanager:9093`            |
| `API_PORT`         | Port the Alertmanager API service listens on.                              | `3000`                                       |

---

# Zabbix Api Setup:

![2025-05-08 23_39_58-Zabbix docker_ Configuration of user groups and 1 more page - Personal - Microso](https://github.com/user-attachments/assets/76ec0c26-fb2f-44da-ba4b-f391565113bd)

![2025-05-08 23_41_43-Zabbix docker_ Configuration of user groups and 3 more pages - Personal - Micros](https://github.com/user-attachments/assets/5b9e21c0-7864-40fa-88b1-bf684045606f)

![2025-05-08 23_42_14-Zabbix docker_ Configuration of users and 3 more pages - Personal - Microsoft​ E](https://github.com/user-attachments/assets/0c530c96-1f2e-460c-8836-345a1a5381a0)

---

# Zabbix Api Authentication methods:

## NEW zabbix
```
curl --request POST \
  --url 'ZABBIX_URL' \
  --header 'Content-Type: application/json-rpc' \
  --header 'Authorization: Bearer ZABBIX_TOKEN' \
  --data '{
    "jsonrpc": "2.0",
    "method": "problem.get",
    "params": {
      "severities": [4, 5],
      "sortfield": "eventid",
      "sortorder": "DESC"
    },
    "id": 1
 }'
```

## OLD Zabbix
``` 
curl -H "Content-Type: application/json-rpc" -X POST ZABBIX_URL -d '{
    "jsonrpc": "2.0",
    "method": "problem.get",
    "params": {
      "severities": [4, 5],
      "sortfield": "eventid",
      "sortorder": "DESC"
    },
    "auth": "ZABBIX_TOKEN",
    "id": 1
 }'
```

---

## How the Frontend Works

The frontend is a lightweight Node.js and Express-based web server that serves a static dashboard and continuously monitors the backend agents' health and alert status.

It performs the following:

1. **Static UI Hosting**  
   Serves HTML/CSS/JS from the `/tocka` directory using `express.static`.

2. **Polling Backend APIs**  
   At regular intervals (defined by `POLL_INTERVAL`), it polls one or more API endpoints provided via the `API_URL` environment variable.

3. **Custom Labels**  
   Supports optional labeling of each API using `API_CUSTOM_NAME`. Labels are displayed conditionally based on the `SHOW_API_LABEL` setting.

4. **Alert Status Aggregation**  
   Gathers and consolidates alert status and internal error flags from all backend APIs:
   - `/internal`: Checks for backend-specific errors
   - `/alerts`: Checks for presence of active alerts

5. **In-Memory State**  
   Maintains alert and internal error status in memory for real-time UI updates.

6. **Health Endpoint**  
   Exposes `/health` endpoint for container or uptime monitoring.

### Example API Poll Flow

1. Reads all URLs from `API_URL`
2. Maps them with `API_CUSTOM_NAME`
3. Loops through each:
   - Calls `/health`, `/internal`, `/alerts`
   - Updates internal state accordingly
4. UI reflects results via simple JSON API

---

## How the API Agents Work

The system is composed of lightweight API agents that serve as bridges between monitoring platforms and the frontend interface. These agents periodically check for alerts and expose their findings via a simple API.

There are two primary agents:

- **Zabbix API Agent**
- **Alertmanager API Agent**

Each agent performs the following:

### API Agent Responsibilities

| Endpoint     | Description                                                               |
|--------------|---------------------------------------------------------------------------|
| `/health`    | Confirms the agent is alive and responsive. Returns HTTP 200 if OK.       |
| `/internal`  | Indicates if there was a source-related internal error during fetch.      |
| `/alerts`    | Shows whether there are currently active alerts.                          |

The agents also update an **in-memory state** to allow fast polling by the frontend and are optimized for health-check integrations in container environments.

---

## Flexible Deployment Options

This system is designed for **modular deployment** and supports two modes of operation:

### 1. Monolithic (All-in-One Docker Compose)

Ideal for testing, prototyping, or small internal use.

- One `docker-compose.yml` includes:
  - Frontend
  - One or both API agents
  - Monitoring tools (Zabbix / Alertmanager / Prometheus)
- Benefits: Easy to spin up, unified config, local development-friendly.

### 2. Distributed (Multi-Server Deployment)

Recommended for production or scalable infrastructure setups.

- Agents can be deployed on different hosts or Kubernetes pods.
- Frontend queries agents over the network (requires CORS enabled).
- Each agent only needs:
  - Environment variables
  - Access to its monitoring backend (e.g., Zabbix or Alertmanager)

**Important:** Since the agents are stateless, they can easily be load-balanced or restarted without data loss.

---
