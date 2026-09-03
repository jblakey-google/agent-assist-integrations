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

"""Authentication and RFC 9421 HTTP Message Signature verification for Genesys Cloud AudioHook.
"""

import base64
import binascii
import hashlib
import hmac
import logging
import re
import time
from typing import List, Mapping, Optional, Tuple

logger = logging.getLogger(__name__)

# Regular expressions for parsing RFC 9421 Signature-Input and Signature headers
SIGNATURE_INPUT_PATTERN = re.compile(
    r'(?:(?P<label>[a-zA-Z0-9_-]+)=)?\((?P<components>[^\)]*)\)(?P<params>;.*)?$'
)
SIGNATURE_PATTERN = re.compile(
    r'(?:(?P<label>[a-zA-Z0-9_-]+)=)?(?::(?P<sig_colons>[^:]+):|(?P<sig_raw>[A-Za-z0-9+/=]+))'
)
PARAM_CREATED_PATTERN = re.compile(r';created=(\d+)')


def decode_secret(secret: str) -> bytes:
    """Decodes a client secret string to bytes, handling Base64 encoding.

    Args:
        secret: Client secret string (Base64-encoded or raw UTF-8).

    Returns:
        Decoded bytes of the client secret.
    """
    if not secret:
        return b''
    try:
        return base64.b64decode(secret, validate=True)
    except (binascii.Error, ValueError):
        return secret.encode('utf-8')


def parse_signature_input(
    signature_input: str
) -> Tuple[Optional[str], List[str], str, Optional[int]]:
    """Parses RFC 9421 Signature-Input header.

    Args:
        signature_input: The raw Signature-Input header value.
            e.g. 'sig1=("@request-target" "x-api-key");created=1672531199;keyid="xxx"'

    Returns:
        Tuple containing:
            - label (Optional[str]): e.g. 'sig1'
            - covered_components (List[str]): List of component identifiers.
            - params_string (str): The parameter string (e.g. '("...");created=1672531199;keyid="xxx"').
            - created_timestamp (Optional[int]): Unix timestamp from created param if present.
    """
    cleaned = signature_input.strip()
    match = SIGNATURE_INPUT_PATTERN.match(cleaned)
    if not match:
        return None, [], '', None

    label = match.group('label')
    components_raw = match.group('components')
    params_suffix = match.group('params') or ''

    # Reconstruct the parameters definition string used in @signature-params
    params_string = f'({components_raw}){params_suffix}'

    # Extract component strings inside quotes
    components = re.findall(r'"([^"]+)"', components_raw)

    created_timestamp = None
    created_match = PARAM_CREATED_PATTERN.search(params_suffix)
    if created_match:
        try:
            created_timestamp = int(created_match.group(1))
        except ValueError:
            created_timestamp = None

    return label, components, params_string, created_timestamp


def parse_signature(signature_header: str) -> Optional[str]:
    """Extracts the Base64-encoded signature from the Signature header.

    Args:
        signature_header: The raw Signature header value.
            e.g. 'sig1=:dGVzdHNpZw==:' or ':dGVzdHNpZw==:' or 'dGVzdHNpZw=='

    Returns:
        Base64-encoded signature string, or None if malformed.
    """
    cleaned = signature_header.strip()
    match = SIGNATURE_PATTERN.match(cleaned)
    if not match:
        return None
    sig = match.group('sig_colons') or match.group('sig_raw')
    return sig.strip() if sig else None


def build_signature_base(
    components: List[str],
    params_string: str,
    headers: Mapping[str, str],
    method: str = 'GET',
    path: str = '/connect',
    authority: Optional[str] = None
) -> Tuple[Optional[str], Optional[str]]:
    """Constructs the canonical signature base string per RFC 9421.

    Args:
        components: List of component names.
        params_string: Signature parameters string for @signature-params.
        headers: Normalized (case-insensitive or lowercase) mapping of request headers.
        method: HTTP request method (e.g. 'GET').
        path: HTTP request target path (e.g. '/connect').
        authority: Host / authority value.

    Returns:
        Tuple of (signature_base_string, error_message). If error, base string is None.
    """
    normalized_headers = {k.lower(): v for k, v in headers.items()}
    lines: List[str] = []

    for comp in components:
        comp_lower = comp.lower()
        if comp_lower == '@request-target':
            value = f'{method.lower()} {path}'
        elif comp_lower == '@path':
            value = path
        elif comp_lower == '@method':
            value = method.upper()
        elif comp_lower == '@authority':
            value = authority or normalized_headers.get('host', '')
        else:
            if comp_lower not in normalized_headers:
                return None, f'Missing required signed header component: {comp}'
            value = normalized_headers[comp_lower]
        lines.append(f'"{comp_lower}": {value}')

    lines.append(f'"@signature-params": {params_string}')
    return '\n'.join(lines), None


def verify_signature(
    headers: Mapping[str, str],
    method: str,
    path: str,
    client_secret: Optional[str] = None,
    expected_api_key: Optional[str] = None,
    max_clock_skew_seconds: int = 300,
    current_time: Optional[float] = None
) -> Tuple[bool, Optional[str]]:
    """Verifies Genesys Cloud AudioHook request authentication and RFC 9421 HMAC signature.

    Supports progressive enhancement: if neither client_secret nor expected_api_key
    is configured, authentication is skipped and requests are allowed with a warning.

    Args:
        headers: HTTP request headers dictionary.
        method: HTTP method (e.g. 'GET').
        path: Request path (e.g. '/connect').
        client_secret: Optional shared secret (Base64-encoded or string).
        expected_api_key: Optional expected API key to compare against X-API-KEY header.
        max_clock_skew_seconds: Maximum allowed clock skew for created timestamp.
        current_time: Optional reference epoch time (used for testing).

    Returns:
        Tuple of (is_valid: bool, error_message: Optional[str]).
    """
    # Progressive Enhancement: If no credentials configured, allow unauthenticated access
    if not client_secret and not expected_api_key:
        logger.debug(
            'AudioHook authentication skipped (neither API_KEY nor CLIENT_SECRET configured).'
        )
        return True, None

    normalized_headers = {k.lower(): v for k, v in headers.items()}

    # 1. Verify API Key if configured
    if expected_api_key:
        received_api_key = normalized_headers.get('x-api-key')
        if not received_api_key:
            return False, 'Missing X-API-KEY header'
        if not hmac.compare_digest(expected_api_key, received_api_key):
            return False, 'Invalid X-API-KEY header value'

    # 2. Verify RFC 9421 HMAC-SHA256 Signature if client_secret is configured
    if client_secret:
        sig_input_header = normalized_headers.get('signature-input')
        signature_header = normalized_headers.get('signature')

        if not sig_input_header:
            return False, 'Missing Signature-Input header'
        if not signature_header:
            return False, 'Missing Signature header'

        label, components, params_string, created_timestamp = parse_signature_input(
            sig_input_header
        )
        if not components or not params_string:
            return False, 'Malformed Signature-Input header'

        received_sig_b64 = parse_signature(signature_header)
        if not received_sig_b64:
            return False, 'Malformed Signature header'

        if created_timestamp is not None:
            now = current_time if current_time is not None else time.time()
            if abs(now - created_timestamp) > max_clock_skew_seconds:
                return False, (
                    f'Signature timestamp expired: created={created_timestamp}, '
                    f'now={int(now)}, skew={abs(now - created_timestamp):.1f}s'
                )

        sig_base, err = build_signature_base(
            components=components,
            params_string=params_string,
            headers=normalized_headers,
            method=method,
            path=path,
            authority=normalized_headers.get('host')
        )
        if err or sig_base is None:
            return False, f'Error building signature base: {err}'

        secret_bytes = decode_secret(client_secret)
        if not secret_bytes:
            return False, 'Server client secret is empty'

        computed_digest = hmac.new(
            secret_bytes, sig_base.encode('utf-8'), hashlib.sha256
        ).digest()
        expected_sig_b64 = base64.b64encode(computed_digest).decode('utf-8')

        if not hmac.compare_digest(expected_sig_b64, received_sig_b64):
            logger.warning(
                'HMAC signature mismatch. Reconstructed base:\n%s', sig_base
            )
            return False, 'HMAC signature verification failed'

    return True, None
