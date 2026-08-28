# Copyright 2026 Google LLC
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
import datetime
import jwt
import requests

from flask import request, jsonify
from functools import wraps

import config, auth_options

jwt_secret_key = ''  # To be loaded from config.JWT_SECRET_KEY_PATH


def load_jwt_secret_key():
    global jwt_secret_key
    if os.path.exists(config.JWT_SECRET_KEY_PATH):
        with open(config.JWT_SECRET_KEY_PATH, 'r') as key_file:
            jwt_secret_key = key_file.read()


def check_auth(token):
    if (config.AUTH_OPTION == 'SalesforceLWC'):
        return auth_options.check_salesforce_lwc_token(token)
    elif (config.AUTH_OPTION == 'Salesforce'):
        return auth_options.check_salesforce_token(token)
    elif (config.AUTH_OPTION == 'GenesysCloud'):
        return auth_options.check_genesyscloud_token(token)
    elif (config.AUTH_OPTION == 'Twilio'):
        return auth_options.check_twilio_token(token)
    elif (config.AUTH_OPTION == 'Five9'):
        return auth_options.check_five9_token(token)
    elif (config.AUTH_OPTION == 'Skip'):
        return True
    # Customize your authentication method here.
    # elif (config.AUTH_OPTION == 'Your Auth Option'):
    #     return auth_options.check_my_token(token)
    return False


def check_jwt(token):
    try:
        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1]
            
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            
            # Attempt to verify the token as a Google IAM OIDC (OpenID Connect) identity token.
            # This allows other Cloud Run services (e.g., audiohook backends) in the same GCP 
            # project to authenticate with this UI Connector securely and natively.
            unverified_claims = jwt.decode(token, options={"verify_signature": False})
            aud = unverified_claims.get("aud")
            
            # Verify the OIDC token
            req = google_requests.Request()
            id_info = id_token.verify_oauth2_token(token, req, audience=aud)
            
            if id_info.get('iss') in ['https://accounts.google.com', 'accounts.google.com']:
                email = id_info.get('email', '')
                # Ensure the calling service account belongs to our exact GCP project.
                # This guarantees that only our own internal services can authorize this way.
                if email.endswith(f"@{config.GCP_PROJECT_ID}.iam.gserviceaccount.com"):
                    return True, 'Your Google ID token is valid.'
        except Exception as e:
            pass # Fall back to the standard UI connector JWT logic

        # Decode the payload to fetch the stored details.
        data = jwt.decode(token, jwt_secret_key, algorithms=['HS256'])
        if 'gcp_agent_assist_project' not in data:
            return False, 'The target project in your token is missing.'
        if data['gcp_agent_assist_project'] != config.GCP_PROJECT_ID:
            return False, 'The target project in your token is invalid.'
        if 'exp' not in data:
            return False, 'The expiration time in your token is missing.'
        if data['exp'] < datetime.datetime.now().timestamp():
            return False, 'Your token has expired.'
        return True, 'Your token is valid.'
    except Exception:
        return False, 'Failed to parse your token.'


def generate_jwt(user_info=None):
    gcp_agent_assist_user = ''
    if user_info:
        gcp_agent_assist_user = user_info.get('gcp_agent_assist_user')
    return jwt.encode(
        {
            'exp': datetime.datetime.now(datetime.timezone.utc) +
                   datetime.timedelta(minutes=config.JWT_TOKEN_LIFETIME),
            'gcp_agent_assist_project': config.GCP_PROJECT_ID,
            'gcp_agent_assist_user': gcp_agent_assist_user
        },
        jwt_secret_key,
        'HS256'
    )


def check_app_auth(auth):
    if config.APP_AUTH_OPTION == 'Twilio':
        response = requests.get(
            config.TWILIO_ACCOUNTS_API_URL, auth=(auth.get('accountSid'), auth.get('authToken')))
        if response.status_code == 200:
            data = response.json()
            if data.get('sid') == config.TWILIO_ACCOUNT_SID:
                return True
    return False


def token_required(f):
    """Verifies JWT as a function decorator."""
    @wraps(f)
    def decorator(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing.'}), 401
        result, message = check_jwt(token)
        if result:
            return f(*args, **kwargs)
        else:
            return jsonify({'message': message}), 401
    return decorator
