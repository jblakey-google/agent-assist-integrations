#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Cleanup ---
cleanup() {
    echo "--- Stopping Redis server ---"
    if [ -n "$REDIS_PID" ]; then
        kill $REDIS_PID
    fi
}

trap cleanup EXIT

# --- JavaScript Tests ---

# salesforce/aa-lwc
echo "--- Running tests for salesforce/aa-lwc ---"
(cd salesforce/aa-lwc && npm test)

# genesyscloud/frontend
echo "--- Running tests for genesyscloud/frontend ---"
(cd genesyscloud/frontend && npm test)

# liveperson/frontend
echo "--- Running tests for liveperson/frontend ---"
(cd liveperson/frontend && npm test)

# --- Python Tests ---

# Start Redis server
echo "--- Starting Redis server ---"
redis-server --port 6380 &
REDIS_PID=$!

# Wait for Redis to start
while ! redis-cli -p 6380 ping > /dev/null 2>&1; do
    sleep 0.1
done

# aa-integration-backend/ui-connector
echo "--- Running tests for aa-integration-backend/ui-connector ---"
mkdir -p ./secret
echo "test-secret" > ./secret/jwt_secret_key
GCP_PROJECT_ID=test-project LOGGING_FILE=./test.log JWT_SECRET_KEY_PATH=./secret/jwt_secret_key REDIS_PORT=6380 python aa-integration-backend/ui-connector/unit_test.py

# aa-integration-backend/cloud-pubsub-interceptor
echo "--- Running tests for aa-integration-backend/cloud-pubsub-interceptor ---"
REDIS_PORT=6380 python aa-integration-backend/cloud-pubsub-interceptor/unit_test.py

echo "--- All tests passed! ---"
