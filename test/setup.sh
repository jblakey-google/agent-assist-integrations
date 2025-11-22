#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- JavaScript Dependencies ---

echo "--- Installing JavaScript dependencies ---"
(cd salesforce/aa-lwc && npm install)
(cd genesyscloud/frontend && npm install)
(cd liveperson/frontend && npm install)

# --- Python Dependencies ---

echo "--- Installing Python dependencies ---"
pip install -r aa-integration-backend/ui-connector/requirements.txt
pip install -r aa-integration-backend/cloud-pubsub-interceptor/requirements.txt

echo "--- All dependencies installed successfully! ---"
