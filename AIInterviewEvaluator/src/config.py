# config.py
import pyaudio  # Added import for pyaudio
from typing import Dict, Tuple

MODEL_PATHS = {
    'face': '/Users/abderrahim_boussyf/AIInterviewEvaluator/src/emotion_model.pth',
    'speech': '/Users/abderrahim_boussyf/AIInterviewEvaluator/src/speech_model.pth'
}


EMOTION_LABELS = ["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"]

AUDIO_PARAMS = {
    'chunk': 1024,
    'format': pyaudio.paFloat32,
    'channels': 1,
    'rate': 16000,
    'record_seconds': 3
}

CV_PARSING_CONFIG = {
    'skill_keywords': ["python", "java", "sql", "gestion", "développement", "analyse", "logiciel", "données", "ingénierie"],
    'max_lines_for_name': 3,
    'excluded_locations': ["Dakhla", "MAROC"]
}

EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

EMOTION_THRESHOLDS = {
    'face_confidence': 0.5,  # Abaissé pour plus de variété
    'speech_confidence': 0.5,
    'angry_threshold': 5  # Seuil pour déclencher un avertissement d'éclairage
}

VISUAL_CONFIG = {
    'window_name': 'Emotion Detection & Facial Mesh',
    'question_timeout': 30,  # Temps par question (secondes)
    'question_position': (10, 90),
    'question_font_scale': 0.7,
    'question_color': (255, 255, 255),
    'question_thickness': 2,
    'emotion_text_position': (10, 30),
    'emotion_font_scale': 1.0,
    'emotion_colors': [(0, 255, 0), (0, 0, 255), (255, 0, 0)],  # Face, Speech, Combined
    'emotion_thickness': 2,
    'warning_position': (10, 150),
    'warning_font_scale': 0.7,
    'warning_color': (0, 255, 255),
    'warning_thickness': 2
}