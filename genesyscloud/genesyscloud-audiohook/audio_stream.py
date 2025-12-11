# Copyright 2024 Google LLC
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

"""Referenced implementation from
https://github.com/GoogleCloudPlatform/python-docs-samples/blob/main/dialogflow/streaming_transcription.py
"""
import logging
import queue

import google.cloud.dialogflow_v2beta1 as dialogflow

from audiohook_config import config


class Stream:
    """Opens a stream as a generator yielding the audio chunks.
    The generator method returns an iterator that contains subsequent audio
    bytes received from audio source to the StreamingAnalyzeContentRequest
    Reference: https://cloud.google.com/python/docs/reference/dialogflow/latest/google.cloud.dialogflow_v2.services.participants.ParticipantsAsyncClient"""

    def __init__(self, rate, chunk_size):
        self._rate = rate
        self.chunk_size = chunk_size
        self._num_channels = 1
        self._buff = queue.Queue()
        self.is_final = False
        self.closed = False
        self.terminate = False
        # Count the number of times the stream analyze content restarts.
        self.restart_counter = 0
        self.last_start_time = 0
        self.terminate = False
        self.total_input_audio_time = 0
        # Time end of the last is_final in millisecond since last_start_time.
        self.is_final_offset = 0
        # Time end of the interim result speech end offset in second
        self.speech_end_offset = 0
        # Save the audio chunks generated from the start of the audio stream for
        # replay after restart.
        self.audio_input_chunks = []
        self.new_stream = True
        # Only MULAW audio encodings are currently supported in Audiohook
        # Monitor
        self.audio_encoding = dialogflow.AudioEncoding.AUDIO_ENCODING_MULAW

    def fill_buffer(self, in_data, *args, **kwargs):
        self._buff.put(in_data)

    def define_audio_config(
            self,
            conversation_profile: dialogflow.ConversationProfile):
        """The Audiohook client will currently only offer PCMU.
        Reference:
        https://cloud.google.com/agent-assist/docs/extended-streaming
        https://developer.genesys.cloud/devapps/audiohook/session-walkthrough#audio-streaming
        """

        language_code = conversation_profile.language_code or "en-US"
        stt_model = conversation_profile.stt_config.model or "phone_call"
        audio_input_config = dialogflow.InputAudioConfig(
            audio_encoding=self.audio_encoding,
            sample_rate_hertz=self._rate,
            language_code=language_code,
            model=stt_model,
            model_variant="USE_ENHANCED",
            enable_automatic_punctuation=True)
        logging.debug("Input audio config %s ", audio_input_config)
        return audio_input_config

    def generator(self):
        """Stream Audio from Genesys Audiohook Monitor to API and to local buffer"""
        # Handle restart.
        logging.debug("Restart generator")
        self.restart_counter += 1
        # After the restart of the streaming, set is_final to False
        # to resume populating audio data
        self.is_final = False
        total_processed_time = self.last_start_time + self.is_final_offset
        # ApproximatesBytes = Rate(Sample per Second) * Duration(Seconds) *  BitRate(Bits per Sample) / 8
        # MULAW audio format is 8bit depth, 8000HZ then convert bits to bytes by
        # dividing 8
        # reference https://en.wikipedia.org/wiki/G.711
        processed_bytes_length = (
            int(total_processed_time * self._rate * 8 / 8) / 1000
        )
        logging.debug(
            "last start time is %s, is final offset: %s, total processed time %s",
            self.last_start_time,
            self.is_final_offset,
            total_processed_time)
        self.last_start_time = total_processed_time
        # Send out bytes stored in self.audio_input_chunks that is after the
        # processed_bytes_length.
        if processed_bytes_length != 0:
            audio_bytes = b"".join(self.audio_input_chunks)
            # Lookback for unprocessed audio data.
            # ApproximatesBytes = Rate(Sample per Second) * Duration(Seconds) *  BitRate(Bits per Sample) / 8
            # reference https://en.wikipedia.org/wiki/G.711
            need_to_process_length = min(
                int(len(audio_bytes) - processed_bytes_length),
                int(config.max_lookback * self._rate * 8 / 8),
            )
            # Note that you need to explicitly use `int` type for
            # substring.
            need_to_process_bytes = audio_bytes[(-1)
                                                * need_to_process_length:]
            logging.debug(
                "Sending need to process bytes length %s, total audio byte length %s, processed byte length %s ",
                len(need_to_process_bytes),
                len(audio_bytes),
                processed_bytes_length)
            try:
                yield need_to_process_bytes
            except GeneratorExit as e:
                logging.debug(
                    "Generator exit from the need to process step %s", e)
                return
        try:
            while not self.closed and not self.is_final:
                if self.speech_end_offset > 110000:
                    # because Genesys is streaming non-stop the audio,
                    # put a hard stop when approaching 120 second limit and produce a
                    # force half close
                    self.is_final = True
                    break
                data = []
                # Use a blocking get() to ensure there's at least one chunk of
                # data, and stop iteration if the chunk is None, indicating the
                # end of the audio stream.
                try:
                    chunk = self._buff.get(block=True, timeout=0.5)
                except queue.Empty:
                    logging.debug(
                        "queue is empty break the loop and stop generator")
                    break
                if chunk is None:
                    logging.debug(
                        "chunk is none half close the stream by stopping generates requests")
                    return
                data.append(chunk)
                # Now try to the rest of chunks if there are any left in the
                # _buff.
                while True:
                    try:
                        chunk = self._buff.get(block=False)
                        if chunk is None:
                            logging.debug(
                                "Remaining chunk is none half close the stream")
                            return
                        data.append(chunk)
                    except queue.Empty:
                        # queue is empty quitting the loop
                        break
                self.audio_input_chunks.extend(data)

                if data:
                    yield b"".join(data)
        except GeneratorExit as e:
            logging.debug("Generator exit after is_final set to true %s", e)
            return
        logging.debug("Stop generator")
