# Copyright 2022 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import logging

# The id of the GCP project where Cloud Run services are deployed on.
GCP_PROJECT_ID = os.environ['GCP_PROJECT_ID']

# Set up the connection with Redis database
REDIS_HOST = os.environ.get('REDISHOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDISPORT', 6379))

# Cloud run could recognize logging files under '/var/log/' folder
logging.basicConfig(filename=os.environ.get(
    'LOGGING_FILE', '/var/log/test.log'), level=logging.INFO)
# Comment this line for local test
# logging.basicConfig(level=logging.DEBUG)

# The path to a jwt secret key file. It is specified when mounting the secret key
# stored in SecretManager to Cloud Run service as a volume.
# Reference: https://cloud.google.com/run/docs/configuring/secrets#mounting-secrets.
JWT_SECRET_KEY_PATH = '/secret/jwt_secret_key'

# TODO replace '*' with a list of allowed origins to limit the access to your server.
# Origin or list of origins that are allowed to connect to this server.
CORS_ALLOWED_ORIGINS = '*'

# Lifetime for generated JWT
JWT_TOKEN_LIFETIME = 60  # minutes

# The option of authenticating users when registering JWT. By default it's empty and
# no users are allowed to register JWT via UI Connector service.
# Supported values:
#   1. 'SalesforceLWC': verify creds with the OAuth Client Credentials Flow. Required environment variables: SALESFORCE_DOMAIN, SALESFORCE_ORGANIZATION_ID.
#   2. 'Salesforce': verify the auth token using Salesforce OpenID Connect. Required environment variable: SALESFORCE_ORGANIZATION_ID.
#   3. 'GenesysCloud': verify the auth token using Genesys SDK UsersAPI.
#   4. 'Twilio': verify the auth token for Twilio. Required environment variable: TWILIO_FLEX_ENVIRONMENT.
#   5. 'Skip': skip auth token verification, should not be used in production.
AUTH_OPTION = os.environ.get('AUTH_OPTION', '')

# The option of authenticating apps when registering JWT. By default it's empty and
# no apps are allowed to register JWT via UI Connector service.
# Supported values:
#   1. 'Twilio': Get Twilio API Account resource, using accountSid and authToken.
#      See https://www.twilio.com/docs/iam/api/account#fetch-an-account-resource.
#      Required environment variable: TWILIO_ACCOUNT_SID
APP_AUTH_OPTION = os.environ.get('APP_AUTH_OPTION', '')

# Salesforce configuration
# For sandbox environment, please replace login.salesforce.com with test.salesforce.com.
# For SalesforceLWC auth option, please replace login.salesforce.com with <your-salesforce-org-domain>.<org-type>.lightning.force.com.
SALESFORCE_DOMAIN = os.environ.get('SALESFORCE_DOMAIN', 'login.salesforce.com')
SALESFORCE_ORGANIZATION_ID = os.environ.get('SALESFORCE_ORGANIZATION_ID', 'YOUR_ORGANIZATION_ID')

# Genesys Cloud configuration.
GENESYS_CLOUD_ENVIRONMENT = os.environ.get('GENESYS_CLOUD_ENVIRONMENT', 'mypurecloud.com')

#Twilio configuration.
TWILIO_FLEX_ENVIRONMENT = os.environ.get('TWILIO_FLEX_ENVIRONMENT', 'YOUR_DOMAIN.twil.io')
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', 'YOUR_TWILIO_ACCOUNT_SID')
TWILIO_ACCOUNTS_API_URL = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}.json"
