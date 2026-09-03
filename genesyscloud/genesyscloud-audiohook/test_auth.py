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

"""Unit tests for RFC 9421 HMAC signature verification and authentication in auth.py.
"""

import base64
import hashlib
import hmac
import unittest

from auth import (build_signature_base, decode_secret, parse_signature,
                  parse_signature_input, verify_signature)


class TestAuth(unittest.TestCase):
    """Test suite for AudioHook authentication and signature verification."""

    def setUp(self):
        self.raw_secret = b'super-secret-key-32-bytes-length!'
        self.b64_secret = base64.b64encode(self.raw_secret).decode('utf-8')
        self.api_key = 'test-genesys-api-key-12345'
        self.fixed_time = 1700000000.0

    def _generate_valid_signature_headers(
        self,
        method: str = 'GET',
        path: str = '/connect',
        api_key: str = 'test-genesys-api-key-12345',
        secret_bytes: bytes = None,
        created_time: int = 1700000000,
        include_extra_headers: bool = True
    ):
        if secret_bytes is None:
            secret_bytes = self.raw_secret

        headers = {
            'Host': 'audiohook.example.com',
            'X-API-KEY': api_key,
        }
        if include_extra_headers:
            headers['audiohook-organization-id'] = 'org-uuid-111'
            headers['audiohook-session-id'] = 'session-uuid-222'
            headers['audiohook-correlation-id'] = 'correlation-uuid-333'

        components = ['"@request-target"', '"x-api-key"']
        if include_extra_headers:
            components.extend([
                '"audiohook-organization-id"',
                '"audiohook-session-id"',
                '"audiohook-correlation-id"'
            ])

        components_joined = ' '.join(components)
        params_string = f'({components_joined});created={created_time};keyid="my-key-id"'
        sig_input_header = f'sig1={params_string}'

        clean_components = [c.replace('"', '') for c in components]
        sig_base, err = build_signature_base(
            components=clean_components,
            params_string=params_string,
            headers=headers,
            method=method,
            path=path,
            authority='audiohook.example.com'
        )
        self.assertIsNone(err)

        digest = hmac.new(secret_bytes, sig_base.encode('utf-8'), hashlib.sha256).digest()
        sig_b64 = base64.b64encode(digest).decode('utf-8')
        sig_header = f'sig1=:{sig_b64}:'

        headers['Signature-Input'] = sig_input_header
        headers['Signature'] = sig_header
        return headers

    def test_progressive_enhancement_unauthenticated_mode(self):
        """Tests that when neither API_KEY nor CLIENT_SECRET is set, auth succeeds without headers."""
        is_valid, err = verify_signature(
            headers={},
            method='GET',
            path='/connect',
            client_secret=None,
            expected_api_key=None
        )
        self.assertTrue(is_valid)
        self.assertIsNone(err)

    def test_decode_secret_base64_and_raw(self):
        """Tests decoding Base64 encoded and raw string secrets."""
        decoded = decode_secret(self.b64_secret)
        self.assertEqual(decoded, self.raw_secret)

        raw_str = "simple_raw_secret_not_base64"
        decoded_raw = decode_secret(raw_str)
        self.assertEqual(decoded_raw, raw_str.encode('utf-8'))

        self.assertEqual(decode_secret(''), b'')

    def test_parse_signature_input(self):
        """Tests parsing RFC 9421 Signature-Input header."""
        header_val = 'sig1=("@request-target" "x-api-key" "audiohook-session-id");created=1700000000;keyid="cred-1"'
        label, components, params_str, created = parse_signature_input(header_val)

        self.assertEqual(label, 'sig1')
        self.assertEqual(components, ['@request-target', 'x-api-key', 'audiohook-session-id'])
        self.assertEqual(created, 1700000000)
        self.assertIn('created=1700000000', params_str)

    def test_parse_signature(self):
        """Tests extracting Base64 signature from various Signature header styles."""
        self.assertEqual(parse_signature('sig1=:YWJjZGVmZ2hpams=:'), 'YWJjZGVmZ2hpams=')
        self.assertEqual(parse_signature(':YWJjZGVmZ2hpams=:'), 'YWJjZGVmZ2hpams=')
        self.assertEqual(parse_signature('YWJjZGVmZ2hpams='), 'YWJjZGVmZ2hpams=')
        self.assertIsNone(parse_signature(''))

    def test_build_signature_base(self):
        """Tests canonical signature base string reconstruction."""
        headers = {
            'host': 'example.com',
            'x-api-key': 'secret-api-key',
            'audiohook-session-id': 'session-123'
        }
        components = ['@request-target', 'x-api-key', 'audiohook-session-id', '@authority']
        params_str = '("@request-target" "x-api-key" "audiohook-session-id" "@authority");created=1700000000'

        base, err = build_signature_base(
            components=components,
            params_string=params_str,
            headers=headers,
            method='GET',
            path='/connect',
            authority='example.com'
        )
        self.assertIsNone(err)
        expected_lines = [
            '"@request-target": get /connect',
            '"x-api-key": secret-api-key',
            '"audiohook-session-id": session-123',
            '"@authority": example.com',
            f'"@signature-params": {params_str}'
        ]
        self.assertEqual(base, '\n'.join(expected_lines))

    def test_verify_signature_success(self):
        """Tests successful signature verification with valid credentials and headers."""
        headers = self._generate_valid_signature_headers(
            method='GET', path='/connect', api_key=self.api_key, secret_bytes=self.raw_secret
        )
        is_valid, err = verify_signature(
            headers=headers,
            method='GET',
            path='/connect',
            client_secret=self.b64_secret,
            expected_api_key=self.api_key,
            current_time=self.fixed_time
        )
        self.assertTrue(is_valid)
        self.assertIsNone(err)

    def test_verify_signature_missing_or_invalid_api_key(self):
        """Tests rejection when API key is missing or wrong."""
        headers = self._generate_valid_signature_headers(
            method='GET', path='/connect', api_key=self.api_key, secret_bytes=self.raw_secret
        )

        headers_missing_key = dict(headers)
        del headers_missing_key['X-API-KEY']
        is_valid, err = verify_signature(
            headers=headers_missing_key,
            method='GET',
            path='/connect',
            client_secret=self.b64_secret,
            expected_api_key=self.api_key,
            current_time=self.fixed_time
        )
        self.assertFalse(is_valid)
        self.assertIn('Missing X-API-KEY', err)

        headers_wrong_key = dict(headers)
        headers_wrong_key['X-API-KEY'] = 'wrong-key'
        is_valid, err = verify_signature(
            headers=headers_wrong_key,
            method='GET',
            path='/connect',
            client_secret=self.b64_secret,
            expected_api_key=self.api_key,
            current_time=self.fixed_time
        )
        self.assertFalse(is_valid)
        self.assertIn('Invalid X-API-KEY', err)

    def test_verify_signature_invalid_secret_or_tampered_header(self):
        """Tests rejection when client secret is wrong or signed headers were tampered with."""
        headers = self._generate_valid_signature_headers(
            method='GET', path='/connect', api_key=self.api_key, secret_bytes=self.raw_secret
        )

        wrong_secret = base64.b64encode(b'wrong-secret-key-32-bytes-length!').decode('utf-8')
        is_valid, err = verify_signature(
            headers=headers,
            method='GET',
            path='/connect',
            client_secret=wrong_secret,
            expected_api_key=self.api_key,
            current_time=self.fixed_time
        )
        self.assertFalse(is_valid)
        self.assertIn('HMAC signature verification failed', err)

        tampered_headers = dict(headers)
        tampered_headers['audiohook-session-id'] = 'tampered-session-id'
        is_valid, err = verify_signature(
            headers=tampered_headers,
            method='GET',
            path='/connect',
            client_secret=self.b64_secret,
            expected_api_key=self.api_key,
            current_time=self.fixed_time
        )
        self.assertFalse(is_valid)
        self.assertIn('HMAC signature verification failed', err)

    def test_verify_signature_timestamp_expiration(self):
        """Tests rejection when signature timestamp exceeds maximum clock skew."""
        old_time = int(self.fixed_time - 600)
        headers = self._generate_valid_signature_headers(
            method='GET',
            path='/connect',
            api_key=self.api_key,
            secret_bytes=self.raw_secret,
            created_time=old_time
        )

        is_valid, err = verify_signature(
            headers=headers,
            method='GET',
            path='/connect',
            client_secret=self.b64_secret,
            expected_api_key=self.api_key,
            max_clock_skew_seconds=300,
            current_time=self.fixed_time
        )
        self.assertFalse(is_valid)
        self.assertIn('Signature timestamp expired', err)


if __name__ == '__main__':
    unittest.main()
