# interview_evaluator.py
import warnings

warnings.filterwarnings("ignore", category=UserWarning, module="spacy")

import cv2
import numpy as np
import logging
import time
import json
import threading
import queue
import os
from typing import List, Dict, Optional, Tuple

# Configuration centrale
from config import (
    MODEL_PATHS,
    AUDIO_PARAMS,
    CV_PARSING_CONFIG,
    EMOTION_LABELS,
    EMOTION_THRESHOLDS,
    VISUAL_CONFIG
)

# Modules personnalisés
from cv_parser import CVParser
from emotion_analyzer import EmotionAnalyzer
from speech_processor import SpeechProcessor

# Initialisation du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("interview_evaluator.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class InterviewEvaluator:
    """Classe principale pour l'évaluation d'entretien."""

    def __init__(self):
        self.cv_parser = CVParser(**CV_PARSING_CONFIG)
        self.emotion_analyzer = EmotionAnalyzer(
            model_paths=MODEL_PATHS,
            emotion_labels=EMOTION_LABELS,
            thresholds=EMOTION_THRESHOLDS
        )
        self.speech_processor = SpeechProcessor(
            audio_params=AUDIO_PARAMS,
            model_path=MODEL_PATHS['speech']
        )

        self.cv_data = None
        self.questions = []
        self.emotion_history = {
            'face': [],
            'speech': [],
            'combined': []
        }
        self.face_prob_history = []
        self.speech_prob_history = []
        self.video_writer = None
        self.start_time = time.time()

    def load_cv(self, cv_path: str) -> bool:
        """Charge et analyse le CV."""
        try:
            self.cv_data = self.cv_parser.parse(cv_path)
            self.questions = self.cv_parser.generate_questions(self.cv_data)
            logger.info(f"CV chargé avec {len(self.questions)} questions générées")
            return True
        except Exception as e:
            logger.error(f"Erreur lors du chargement du CV: {e}")
            return False

    def run_interview(self, cv_path: str) -> None:
        try:
            if not self.load_cv(cv_path):
                return
            self._setup_interview()
            self._process_questions()
        except Exception as e:
            logger.error(f"Exception globale capturée: {e}", exc_info=True)
            raise
        finally:
            self._cleanup()
            self._generate_reports()

    def _setup_interview(self) -> None:
        """Initialise les périphériques et l'interface."""
        try:
            self.emotion_analyzer.initialize_camera()
            self.speech_processor.initialize_audio()
            frame = self.emotion_analyzer.get_frame()
            if frame is not None:
                height, width = frame.shape[:2]
                self.video_writer = cv2.VideoWriter(
                    'interview_recording.avi',
                    cv2.VideoWriter_fourcc(*'XVID'),
                    20.0,
                    (width, height)
                )
                logger.info("Enregistrement vidéo initialisé.")
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation: {e}")
            raise

    def _process_questions(self) -> None:
        """Traite chaque question de l'entretien avec optimisation."""
        for question_idx, question in enumerate(self.questions):
            logger.info(f"Traitement question {question_idx + 1}/{len(self.questions)}")
            self._display_question(question, question_idx)

            start_time = time.time()
            frame_count = 0
            while time.time() - start_time < VISUAL_CONFIG['question_timeout']:
                if frame_count % 2 == 0:  # Traiter un frame sur deux
                    self._process_frame(question)
                self._process_audio()
                frame_count += 1
                time.sleep(0.01)  # Ajouter un léger délai pour réduire la charge
                if self._check_user_interaction():
                    break

    def _display_question(self, question: str, idx: int) -> None:
        """Affiche la question à l'écran."""
        frame = self.emotion_analyzer.get_frame()
        if frame is not None:
            cv2.putText(
                frame, f"Question {idx + 1}: {question}",
                VISUAL_CONFIG['question_position'],
                cv2.FONT_HERSHEY_SIMPLEX,
                VISUAL_CONFIG['question_font_scale'],
                VISUAL_CONFIG['question_color'],
                VISUAL_CONFIG['question_thickness']
            )
            cv2.imshow(VISUAL_CONFIG['window_name'], frame)
            if self.video_writer:
                self.video_writer.write(frame)

    def _process_frame(self, question: str) -> None:
        """Traite un frame vidéo."""
        start_frame_time = time.time()
        try:
            frame = self.emotion_analyzer.process_frame()
            if frame is not None:
                self._update_emotion_display(frame, question)
                if self.video_writer:
                    self.video_writer.write(frame)
            logger.debug(f"Temps de traitement du frame: {time.time() - start_frame_time:.3f} secondes")
        except Exception as e:
            logger.error(f"Erreur de traitement vidéo: {e}")

    def _process_audio(self) -> None:
        """Traite l'audio en temps réel."""
        start_audio_time = time.time()
        try:
            audio_data = self.speech_processor.capture_audio()
            if audio_data:
                emotion, confidence = self.speech_processor.analyze_audio(audio_data)
                if emotion and confidence > EMOTION_THRESHOLDS['speech_confidence']:
                    self._update_emotion_history('speech', emotion)
                    self.speech_prob_history.append(confidence)
            logger.debug(f"Temps de traitement audio: {time.time() - start_audio_time:.3f} secondes")
        except Exception as e:
            logger.error(f"Erreur de traitement audio: {e}")

    def _update_emotion_display(self, frame: np.ndarray, question: str) -> None:
        """Met à jour l'affichage des émotions."""
        face_emotion, face_confidence = self.emotion_analyzer.get_emotion()
        speech_emotion = self.speech_processor.current_emotion
        combined_emotion = self._calculate_combined_emotion(face_emotion, speech_emotion)

        self._draw_emotion_text(
            frame,
            ("Face", face_emotion),
            ("Speech", speech_emotion),
            ("Combined", combined_emotion)
        )

        if face_confidence > EMOTION_THRESHOLDS['face_confidence']:
            self._update_emotion_history('face', face_emotion)
            self.face_prob_history.append(face_confidence)
            self._check_lighting_conditions(frame)

        cv2.imshow(VISUAL_CONFIG['window_name'], frame)

        def _audio_processing_thread(self):
            """Thread pour capturer et analyser l'audio."""
            while self.audio_thread_running:
                try:
                    audio_data = self.speech_processor.capture_audio()
                    if audio_data:
                        logger.info(f"Captured audio chunk of length {len(audio_data)} bytes")
                        emotion, confidence = self.speech_processor.analyze_audio(audio_data)
                        if emotion and confidence > EMOTION_THRESHOLDS['speech_confidence']:
                            self.audio_queue.put((emotion, confidence))
                            logger.info(f"Audio emotion detected: {emotion} with confidence {confidence}")
                except Exception as e:
                    logger.error(f"Erreur dans le thread audio: {e}")
                time.sleep(0.01)

    def _draw_emotion_text(self, frame: np.ndarray, *emotions: Tuple[str, str]) -> None:
        """Affiche les émotions sur le frame."""
        y_pos = VISUAL_CONFIG['emotion_text_position'][1]
        for i, (label, emotion), color in zip(range(len(emotions)), emotions, VISUAL_CONFIG['emotion_colors']):
            position = (VISUAL_CONFIG['emotion_text_position'][0], y_pos + i * 40)
            cv2.putText(
                frame, f"{label}: {emotion}",
                position,
                cv2.FONT_HERSHEY_SIMPLEX,
                VISUAL_CONFIG['emotion_font_scale'],
                color,
                VISUAL_CONFIG['emotion_thickness']
            )

    def _check_lighting_conditions(self, frame: np.ndarray) -> None:
        """Vérifie les conditions d'éclairage."""
        if self.emotion_analyzer.check_lighting(frame):
            cv2.putText(
                frame, "Conditions d'éclairage sous-optimales détectées",
                VISUAL_CONFIG['warning_position'],
                cv2.FONT_HERSHEY_SIMPLEX,
                VISUAL_CONFIG['warning_font_scale'],
                VISUAL_CONFIG['warning_color'],
                VISUAL_CONFIG['warning_thickness']
            )

    def _calculate_combined_emotion(self, face_emotion: str, speech_emotion: str) -> str:
        """Combine les émotions faciales et vocales avec une pondération."""
        if face_emotion == "No face detected":
            return speech_emotion if speech_emotion != "Listening..." else "Unknown"
        if speech_emotion == "Listening...":
            return face_emotion
        # Combinaison simplifiée pour l'instant
        return face_emotion  # À améliorer avec pondération si nécessaire

    def _update_emotion_history(self, modality: str, emotion: str) -> None:
        """Met à jour l'historique des émotions."""
        self.emotion_history[modality].append(emotion)
        self.emotion_history['combined'].append(
            self._calculate_combined_emotion(
                self.emotion_analyzer.current_emotion,
                self.speech_processor.current_emotion
            )
        )
        logger.debug(f"Mise à jour émotion {modality}: {emotion}")

    def _check_user_interaction(self) -> bool:
        """Vérifie les interactions utilisateur."""
        key = cv2.waitKey(10) & 0xFF
        if key == ord('q'):
            raise KeyboardInterrupt
        return key == ord('n')  # Passer à la question suivante

    def _cleanup(self) -> None:
        """Nettoyage des ressources."""
        self.emotion_analyzer.release()
        self.speech_processor.release()
        if self.video_writer:
            self.video_writer.release()
        cv2.destroyAllWindows()
        logger.info("Ressources libérées avec succès")

    def _generate_reports(self) -> None:
        """Génère les rapports finaux."""
        with open("emotion_history.json", "w") as f:
            json.dump(self.emotion_history, f, indent=4)

        report = self._generate_recommendations()
        with open("interview_report.md", "w") as f:
            f.write(report)

        total_time = time.time() - self.start_time
        logger.info(f"Durée totale de l'entretien: {total_time:.2f} secondes")
        logger.info(f"Nombre moyen de frames traités par seconde: {len(self.emotion_history['face']) / total_time:.2f}")
        logger.info("Rapports générés avec succès")

    def _process_frame(self, question: str) -> None:
        """Traite un frame vidéo."""
        start_frame_time = time.time()
        try:
            frame = self.emotion_analyzer.process_frame()
            if frame is not None:
                self._update_emotion_display(frame, question)
                if self.video_writer:
                    self.video_writer.write(frame)
                    logger.debug("Frame écrit dans la vidéo.")
            logger.debug(f"Temps de traitement du frame: {time.time() - start_frame_time:.3f} secondes")
        except Exception as e:
            logger.error(f"Erreur de traitement vidéo: {e}")

    def _generate_recommendations(self) -> str:
        """Génère des recommandations basées sur l'analyse."""
        report = "# Rapport d'Évaluation d'Entretien\n\n"
        report += "## Résumé des Émotions\n\n"
        report += f"- **Émotions faciales** : {self.emotion_history['face']}\n"
        report += f"- **Émotions vocales** : {self.emotion_history['speech']}\n"
        report += f"- **Émotions combinées** : {self.emotion_history['combined']}\n\n"

        def get_dominant_emotion(emotion_list: List[str]) -> str:
            if not emotion_list:
                return "Inconnu"
            emotion_counts = {emo: emotion_list.count(emo) for emo in set(emotion_list)}
            return max(emotion_counts, key=emotion_counts.get)

        dominant_face = get_dominant_emotion(self.emotion_history['face'])
        dominant_speech = get_dominant_emotion(self.emotion_history['speech'])
        dominant_combined = get_dominant_emotion(self.emotion_history['combined'])

        report += "## Émotions Dominantes\n\n"
        report += f"- **Émotion faciale dominante** : {dominant_face}\n"
        report += f"- **Émotion vocale dominante** : {dominant_speech}\n"
        report += f"- **Émotion combinée dominante** : {dominant_combined}\n\n"

        recommendations = []
        negative_emotions = ['angry', 'disgust', 'fear', 'sad']

        # Analyse de la chronologie
        if len(self.emotion_history['combined']) > 10:
            first_half = self.emotion_history['combined'][:len(self.emotion_history['combined']) // 2]
            second_half = self.emotion_history['combined'][len(self.emotion_history['combined']) // 2:]
            dominant_first = get_dominant_emotion(first_half)
            dominant_second = get_dominant_emotion(second_half)
            if dominant_first in negative_emotions and dominant_second not in negative_emotions:
                recommendations.append(
                    "Vous avez commencé l’entretien avec des émotions négatives, mais vous êtes devenu plus positif vers la fin. Essayez de commencer avec plus de confiance en prenant une profonde inspiration avant de répondre.")

        if dominant_combined in negative_emotions:
            recommendations.append(
                "Vous avez semblé ressentir des émotions négatives pendant l’entretien. Envisagez de pratiquer des techniques de relaxation, comme la respiration profonde, pour gérer le stress ou l’anxiété.")
            if dominant_combined == 'sad':
                recommendations.append(
                    "Vous avez semblé triste par moments. Réfléchissez à ce qui pourrait en être la cause — peut-être que parler de votre passion pour le poste ou d’expériences positives pourrait transmettre plus d’enthousiasme.")
            elif dominant_combined == 'fear':
                recommendations.append(
                    "Vous avez montré des signes de peur ou de nervosité. Essayez de vous préparer plus soigneusement aux questions courantes et de vous entraîner devant un miroir ou avec un ami pour gagner en confiance.")
            elif dominant_combined in ['angry', 'disgust']:
                recommendations.append(
                    "Vous avez affiché de la colère ou du dégoût, ce qui pourrait sembler peu professionnel. Concentrez-vous sur le maintien d’un ton et d’un langage corporel positifs, même lorsque vous abordez des sujets difficiles.")
                if dominant_face == 'angry':
                    recommendations.append(
                        "L’émotion ‘angry’ a été détectée fréquemment sur votre visage, ce qui pourrait être dû à un problème d’éclairage ou à une détection incorrecte. Assurez-vous que votre visage est bien éclairé et essayez de sourire davantage.")
        elif dominant_combined == 'happy':
            recommendations.append(
                "Excellent travail ! Vous avez affiché de la joie tout au long de l’entretien, ce qui a probablement laissé une impression positive. Continuez à montrer votre enthousiasme et votre positivisme dans vos futurs entretiens.")
        elif dominant_combined == 'surprise':
            recommendations.append(
                "Vous avez semblé surpris par moments, ce qui pourrait indiquer un manque de préparation à certaines questions. Passez en revue la description de poste et préparez-vous à une plus large gamme de questions pour vous sentir plus à l’aise.")
        elif dominant_combined == 'neutral':
            recommendations.append(
                "Vous avez maintenu une attitude neutre, ce qui peut être professionnel mais pourrait manquer d’enthousiasme. Essayez de montrer plus de passion pour le poste en souriant et en utilisant un ton engageant.")

        if dominant_face != dominant_speech and dominant_speech != "Inconnu":
            recommendations.append(
                "Il y avait une différence entre vos expressions faciales et vos émotions vocales. Assurez-vous que votre langage corporel correspond à votre ton verbal pour transmettre un message cohérent.")
        elif dominant_speech == "Inconnu":
            recommendations.append(
                "Aucune émotion vocale n’a été détectée. Assurez-vous de parler clairement pendant l’entretien pour une analyse plus complète.")

        report += "## Recommandations\n\n"
        for i, rec in enumerate(recommendations, 1):
            report += f"{i}. {rec}\n"

        return report


if __name__ == "__main__":
    evaluator = InterviewEvaluator()
    evaluator.run_interview(
        "/Users/abderrahim_boussyf/AIInterviewEvaluator/src/data/CV_2024-12-20_Abderrahim_Boussyf.pdf")