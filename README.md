kai-interface (frontend) – A static NGINX-hosted UI.

api (backend) – Node.js Express app polling the Alertmanager and updating a shared alerts.json file.

prometheus – Collects metrics (scrapes from node-exporter) and triggers alerts.

alertmanager – Handles alerts and sends them for processing.

node-exporter – Provides host-level metrics to Prometheus
