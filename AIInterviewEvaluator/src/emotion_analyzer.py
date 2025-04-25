
from models.emotion_cnn import EmotionCNN


# emotion_analyzer.py
import cv2
import numpy as np
import torch
import torchvision.transforms as transforms
import dlib
import mediapipe as mp
import logging
import time
import os
from typing import Optional, Tuple

logger = logging.getLogger(__name__)  # Ajout du logger

class EmotionAnalyzer:
    def __init__(self, model_paths: dict, emotion_labels: list, thresholds: dict):
        for path in model_paths.values():
            if not os.path.exists(path):
                raise FileNotFoundError(f"Modèle non trouvé : {path}")
        self.detector = dlib.get_frontal_face_detector()
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            static_image_mode=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.face_model = EmotionCNN()
        self.face_model.load_state_dict(torch.load(model_paths['face']))
        self.face_model.eval()
        logger.info("Modèle facial chargé avec succès.")
        self.emotion_labels = emotion_labels
        self.face_confidence_threshold = thresholds['face_confidence']
        self.angry_count = 0
        self.angry_threshold = thresholds['angry_threshold']
        self.cap = None
        self.current_emotion = "No face detected"
        self.current_confidence = 0.0
        self.face_transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Grayscale(num_output_channels=1),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])

    def initialize_camera(self):
        """Initialise la caméra avec une tentative de reprise."""
        max_retries = 3
        for attempt in range(max_retries):
            self.cap = cv2.VideoCapture(0)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            if self.cap.isOpened():
                logger.info("Caméra initialisée avec succès.")
                return
            logger.warning(f"Tentative {attempt + 1}/{max_retries} d'initialisation de la caméra échouée. Attente de 2 secondes...")
            time.sleep(2)
        raise RuntimeError("Impossible d'ouvrir la caméra après plusieurs tentatives.")

    def get_frame(self) -> Optional[np.ndarray]:
        """Récupère un frame de la caméra."""
        if self.cap is None or not self.cap.isOpened():
            return None
        ret, frame = self.cap.read()
        if not ret:
            return None
        return frame

    def process_frame(self) -> Optional[np.ndarray]:
        """Traite un frame pour détecter les émotions faciales."""
        frame = self.get_frame()
        if frame is None:
            return None

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.detector(gray)

        self.current_emotion = "No face detected"
        self.current_confidence = 0.0
        for face in faces:
            x, y, w, h = face.left(), face.top(), face.width(), face.height()
            face_region = frame[y:y+h, x:x+w]
            face_input = self.face_transform(face_region).unsqueeze(0)
            with torch.no_grad():
                face_pred = self.face_model(face_input)
                face_prob = torch.softmax(face_pred, dim=1)
                max_prob = torch.max(face_prob).item()
                logger.debug(f"Face probabilities: {face_prob}")
                if max_prob > self.face_confidence_threshold:
                    face_emotion_idx = torch.argmax(face_pred).item()
                    self.current_emotion = self.emotion_labels[face_emotion_idx]
                    self.current_confidence = max_prob
                    if self.current_emotion == 'angry':
                        self.angry_count += 1
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(frame, f"Face: {self.current_emotion}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        # Traitement des landmarks faciaux
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        height, width = frame.shape[:2]
        results = self.face_mesh.process(rgb_frame)
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                for landmark in face_landmarks.landmark:
                    x_lm = int(landmark.x * width)
                    y_lm = int(landmark.y * height)
                    cv2.circle(frame, (x_lm, y_lm), 1, (0, 255, 0), -1)

        return frame

    def get_emotion(self) -> Tuple[str, float]:
        """Retourne l'émotion actuelle et sa probabilité."""
        return self.current_emotion, self.current_confidence

    def check_lighting(self, frame: np.ndarray) -> bool:
        """Vérifie les conditions d'éclairage."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        return brightness < 50 or self.angry_count > self.angry_threshold

    def release(self):
        """Libère les ressources de la caméra et de MediaPipe."""
        if self.cap is not None:
            self.cap.release()
        self.face_mesh.close()