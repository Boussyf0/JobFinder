# speech_processor.py
import os
import pyaudio
import numpy as np
import librosa
import torch
from typing import Tuple, Optional
import logging
from models.speech_rnn import SpeechRNN

from config import EMOTION_LABELS, AUDIO_PARAMS

logger = logging.getLogger(__name__)

class SpeechProcessor:
    def __init__(self, audio_params: dict, model_path: str, max_length=300):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Modèle vocal non trouvé : {model_path}")
        self.audio_params = audio_params
        self.max_length = max_length  # Match training max length
        self.model = SpeechRNN(input_size=13, hidden_size=128, num_layers=2, num_classes=7)
        self.model.load_state_dict(torch.load(model_path))
        self.model.eval()
        logger.info("Modèle vocal chargé avec succès.")
        self.p = None
        self.stream = None
        self.current_emotion = "Listening..."
        self.current_confidence = 0.0
        self.audio_buffer = []

    def initialize_audio(self):
        try:
            self.p = pyaudio.PyAudio()
            self.stream = self.p.open(
                format=self.audio_params['format'],
                channels=self.audio_params['channels'],
                rate=self.audio_params['rate'],
                input=True,
                frames_per_buffer=self.audio_params['chunk']
            )
            logger.info("Flux audio initialisé avec succès.")
        except Exception as e:
            logger.error(f"Erreur d'initialisation audio: {e}")
            raise

    def capture_audio(self) -> Optional[bytes]:
        if self.stream is None:
            return None
        audio_data = self.stream.read(self.audio_params['chunk'], exception_on_overflow=False)
        self.audio_buffer.append(audio_data)
        if len(self.audio_buffer) * self.audio_params['chunk'] >= self.audio_params['rate'] * self.audio_params['record_seconds']:
            audio_chunk = b''.join(self.audio_buffer)
            self.audio_buffer = []
            return audio_chunk
        return None

    def analyze_audio(self, audio_data: bytes) -> Tuple[Optional[str], float]:
        if audio_data is None:
            return "Listening...", 0.0  # Fallback emotion

        try:
            audio = np.frombuffer(audio_data, dtype=np.float32)
            if len(audio) == 0:
                logger.warning("No audio data received.")
                return "Listening...", 0.0

            # Preprocessing
            audio = librosa.effects.preemphasis(audio)
            n_fft = min(2048, len(audio))
            mfcc = librosa.feature.mfcc(y=audio, sr=self.audio_params['rate'], n_mfcc=13, n_fft=n_fft)
            mfcc = mfcc.T  # [time_steps, 13]

            # Padding or truncation
            if mfcc.shape[0] < self.max_length:
                mfcc = np.pad(mfcc, ((0, self.max_length - mfcc.shape[0]), (0, 0)), mode='constant')
            else:
                mfcc = mfcc[:self.max_length, :]

            mfcc_tensor = torch.tensor(mfcc).float().unsqueeze(0)  # [1, max_length, 13]
            with torch.no_grad():
                speech_pred = self.model(mfcc_tensor)
                speech_prob = torch.softmax(speech_pred, dim=1)
                speech_emotion_idx = torch.argmax(speech_pred).item()
                confidence = torch.max(speech_prob).item()
                self.current_emotion = EMOTION_LABELS[speech_emotion_idx]
                self.current_confidence = confidence
                return self.current_emotion, self.current_confidence
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse audio: {e}", exc_info=True)
            return "Listening...", 0.0  # Fallback

    def release(self):
        if self.stream is not None:
            self.stream.stop_stream()
            self.stream.close()
        if self.p is not None:
            self.p.terminate()