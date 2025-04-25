import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="spacy")

import cv2
import dlib
import torch
import torchvision.transforms as transforms
import mediapipe as mp
from models.emotion_cnn import EmotionCNN
from models.speech_rnn import SpeechRNN
import numpy as np
import librosa
import pyaudio
import os
import time
import logging
import pytesseract
from pdf2image import convert_from_path
import spacy
import json

# Suppress MediaPipe logs
logging.getLogger('mediapipe').setLevel(logging.ERROR)

# Ensure NLTK data path
import nltk
nltk.data.path.append('/Users/abderrahim_boussyf/nltk_data')

# Load the French spaCy model
try:
    nlp = spacy.load("fr_core_news_sm")
    print("French spaCy model loaded successfully.")
except OSError as e:
    print(f"Error loading spaCy model: {e}")
    print("Please ensure 'fr_core_news_sm' is installed. Run: python -m spacy download fr_core_news_sm")
    exit(1)

# Function to parse CV using OCR and spaCy (French)
def parse_cv(cv_path):
    try:
        images = convert_from_path(cv_path, dpi=300)
        text = ""
        for img in images:
            img = img.convert("L")  # Convert to grayscale
            img = img.point(lambda x: 0 if x < 128 else 255)  # Binarize
            text += pytesseract.image_to_string(img, lang="fra")
        print("Extracted text from CV:")
        print(text[:500])
    except Exception as e:
        print(f"Error during OCR: {e}")
        return None

    try:
        doc = nlp(text)
        skills = []
        experience = []
        education = []
        name = None

        # Heuristic: First proper noun at the start of the text is the name
        lines = text.split('\n')
        for line in lines[:3]:  # Check first 3 lines (reduced to be stricter)
            line = line.strip()
            if not line:
                continue
            # Use spaCy to check for a person entity
            line_doc = nlp(line)
            for ent in line_doc.ents:
                if ent.label_ == "PER" and '@' not in ent.text and 'Dakhla' not in ent.text:
                    name = ent.text
                    break
            # Fallback: If no PER entity, take the first line as the name
            if name is None and line and not any(char in line for char in ['@', '{', '&']):
                name = line
            if name:
                break

        # Extract named entities
        for ent in doc.ents:
            if ent.label_ == "PER" and name is None and '@' not in ent.text and 'Dakhla' not in ent.text:
                name = ent.text
            elif ent.label_ == "ORG" and "INGÉNIEUR" not in ent.text.upper() and "TRAITEMENT" not in ent.text.upper():
                experience.append(ent.text)
            elif ent.label_ == "LOC" and len(ent.text) > 3 and "Dakhla" not in ent.text and "MAROC" not in ent.text:
                education.append(ent.text)

        # Extract skills under "Compétences" section
        skill_section = False
        skill_keywords = ["python", "java", "sql", "gestion", "développement", "analyse", "logiciel", "données", "ingénierie"]
        for line in text.lower().split('\n'):
            if "compétences" in line:
                skill_section = True
                continue
            if skill_section:
                if any(keyword in line for keyword in skill_keywords):
                    line_doc = nlp(line)
                    for token in line_doc:
                        if token.lower_ in skill_keywords:
                            skills.append(token.text)
                if line.strip() == "" or any(section in line for section in ["expérience", "formation"]):
                    skill_section = False

        # Fallback: Extract skills from entire document
        if not skills:
            for token in doc:
                if token.lower_ in skill_keywords and not token.text.isdigit() and '/' not in token.text:
                    skills.append(token.text)

        # Clean up lists
        skills = list(set(skills))[:2]
        experience = list(set(experience))[:1]
        education = list(set(education))[:1]

        data = {
            "name": name if name else "Candidat",
            "skills": skills,
            "experience": experience,
            "education": education
        }
        print("Parsed CV Data:", data)
        return data
    except Exception as e:
        print(f"Error processing text with spaCy: {e}")
        return None

# Function to generate questions in French based on CV
def generate_questions(cv_data):
    questions = []
    if not cv_data:
        return ["Parlez-moi de vous et de votre expérience."]

    skills = cv_data.get('skills', [])
    experience = cv_data.get('experience', [])
    education = cv_data.get('education', [])
    name = cv_data.get('name', 'Candidat')

    if skills:
        questions.append(f"Bonjour {name}, j’ai vu que vous avez des compétences en {skills[0]}. Pouvez-vous décrire un projet où vous avez utilisé {skills[0]} ?")
        if len(skills) > 1:
            questions.append(f"Vous avez également mentionné {skills[1]} comme compétence. Quel est votre niveau de maîtrise, et pouvez-vous donner un exemple ?")
    if experience:
        questions.append(f"Vous avez travaillé chez {experience[0]}. Quel était votre rôle, et quelles étaient vos principales responsabilités ?")
        questions.append(f"Pouvez-vous partager une situation difficile rencontrée chez {experience[0]} et comment vous l’avez gérée ?")
    if education:
        questions.append(f"J’ai vu que vous avez étudié à {education[0]}. Comment cette formation vous a-t-elle préparé pour le poste auquel vous postulez ?")
    if not questions:
        questions.append(f"Parlez-moi de vous, {name}, et pourquoi ce poste vous intéresse.")

    return questions

# Initialize components
detector = dlib.get_frontal_face_detector()
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    static_image_mode=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Load the face model
face_model_path = os.path.join(os.path.dirname(__file__), '/Users/abderrahim_boussyf/AIInterviewEvaluator/src/emotion_model.pth')
if not os.path.exists(face_model_path):
    print(f"Error: Face model file {face_model_path} not found.")
    exit(1)

face_model = EmotionCNN()
face_model.load_state_dict(torch.load(face_model_path))
face_model.eval()
print("Face model loaded successfully.")

# Load the speech model
speech_model_path = os.path.join(os.path.dirname(__file__), '/Users/abderrahim_boussyf/AIInterviewEvaluator/src/speech_model.pth')
if not os.path.exists(speech_model_path):
    print(f"Error: Speech model file {speech_model_path} not found.")
    exit(1)

speech_model = SpeechRNN(input_size=13, hidden_size=128, num_layers=2, num_classes=7)
speech_model.load_state_dict(torch.load(speech_model_path))
speech_model.eval()
print("Speech model loaded successfully.")

# Define emotion labels
emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# Image preprocessing for PyTorch (face)
face_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((48, 48)),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

# Audio parameters
CHUNK = 1024
FORMAT = pyaudio.paFloat32
CHANNELS = 1
RATE = 16000
RECORD_SECONDS = 3

# Function to process audio chunk for speech emotion recognition
def process_audio_chunk(audio_data, fs=16000, n_mfcc=13):
    try:
        audio = np.frombuffer(audio_data, dtype=np.float32)
        print(f"Audio data length: {len(audio)} samples")
        if len(audio) == 0:
            print("Warning: No audio data received.")
            return None
        audio = librosa.effects.preemphasis(audio)
        audio = librosa.decompose.nn_filter(audio, aggregate=np.median, metric='cosine')
        # Adjust n_fft based on signal length
        n_fft = min(2048, len(audio))
        mfcc = librosa.feature.mfcc(y=audio, sr=fs, n_mfcc=n_mfcc, n_fft=n_fft)
        mfcc_mean = np.mean(mfcc, axis=1)
        mfcc_tensor = torch.tensor(mfcc_mean).float()
        mfcc_tensor = mfcc_tensor.unsqueeze(0).unsqueeze(0)
        return mfcc_tensor
    except Exception as e:
        print(f"Error processing audio chunk: {e}")
        return None

# Initialize PyAudio
p = pyaudio.PyAudio()
try:
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)
    print("Microphone stream opened successfully.")
except Exception as e:
    print(f"Error opening microphone stream: {e}")
    p.terminate()
    exit(1)

# Start video capture
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
if not cap.isOpened():
    print("Error: Could not open camera.")
    stream.stop_stream()
    stream.close()
    p.terminate()
    exit(1)

# Parse CV and generate questions
cv_path = "/Users/abderrahim_boussyf/AIInterviewEvaluator/src/data/CV_2024-12-20_Abderrahim_Boussyf.pdf"
cv_data = parse_cv(cv_path)
questions = generate_questions(cv_data)
print("Questions générées :")
for i, q in enumerate(questions, 1):
    print(f"{i}. {q}")

# Variables to store emotion analysis
emotion_history = {'face': [], 'speech': [], 'combined': []}
current_question_idx = 0

speech_emotion = "Listening..."
speech_prob = None
last_speech_update = time.time()
audio_buffer = []

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame.")
            break

        if current_question_idx < len(questions):
            current_question = questions[current_question_idx]
            cv2.putText(frame, f"Question: {current_question}", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)

        face_emotion = "No face detected"
        face_prob = None
        for face in faces:
            x, y, w, h = face.left(), face.top(), face.width(), face.height()
            face_region = frame[y:y+h, x:x+w]
            face_input = face_transform(face_region).unsqueeze(0)
            with torch.no_grad():
                face_pred = face_model(face_input)
                face_prob = torch.softmax(face_pred, dim=1)
                max_prob = torch.max(face_prob).item()
                print(f"Face probabilities: {face_prob}")  # Log all probabilities for analysis
                if max_prob > 0.5:  # Lowered threshold to see more variety
                    face_emotion_idx = torch.argmax(face_pred).item()
                    face_emotion = emotion_labels[face_emotion_idx]
                else:
                    face_emotion = "Uncertain"
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            cv2.putText(frame, f"Face: {face_emotion}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            if face_emotion != "Uncertain":
                emotion_history['face'].append(face_emotion)
            # Add lighting recommendation if "angry" is frequent
            if emotion_history['face'].count('angry') > 5:
                cv2.putText(frame, "Possible lighting issue: Ensure face is well-lit.", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        current_time = time.time()
        audio_data = stream.read(CHUNK, exception_on_overflow=False)
        audio_buffer.append(audio_data)

        if current_time - last_speech_update >= RECORD_SECONDS:
            audio_chunk = b''.join(audio_buffer)
            audio_buffer = []
            last_speech_update = current_time

            speech_input = process_audio_chunk(audio_chunk)
            if speech_input is not None:
                with torch.no_grad():
                    speech_pred = speech_model(speech_input)
                    speech_prob = torch.softmax(speech_pred, dim=1)
                    print(f"Speech probabilities for question {current_question_idx + 1}: {speech_prob}")
                    speech_emotion_idx = torch.argmax(speech_pred).item()
                    speech_emotion = emotion_labels[speech_emotion_idx]
                print(f"Speech emotion for question {current_question_idx + 1}: {speech_emotion}")
                emotion_history['speech'].append(speech_emotion)

                if speech_emotion in ['angry', 'disgust', 'fear', 'sad']:
                    feedback = "Vous semblez un peu nerveux. Respirez profondément et souriez !"
                    cv2.putText(frame, feedback, (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

                current_question_idx += 1

        combined_emotion = "Unknown"
        if face_prob is not None:
            if speech_prob is not None:
                # Use weighted average: 70% face, 30% speech
                combined_prob = 0.7 * face_prob + 0.3 * speech_prob
                combined_emotion_idx = torch.argmax(combined_prob).item()
                combined_emotion = emotion_labels[combined_emotion_idx]
            else:
                combined_emotion = face_emotion
            emotion_history['combined'].append(combined_emotion)
        elif speech_prob is not None:
            combined_emotion = speech_emotion
            emotion_history['combined'].append(combined_emotion)

        cv2.putText(frame, f"Speech: {speech_emotion}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.putText(frame, f"Combined: {combined_emotion}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                for landmark in face_landmarks.landmark:
                    x_lm = int(landmark.x * frame.shape[1])
                    y_lm = int(landmark.y * frame.shape[0])
                    cv2.circle(frame, (x_lm, y_lm), 1, (0, 255, 0), -1)

        cv2.imshow('Emotion Detection & Facial Mesh', frame)
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

except KeyboardInterrupt:
    print("Script interrupted by user. Cleaning up...")
finally:
    # Process any remaining audio on interruption
    if audio_buffer:
        audio_chunk = b''.join(audio_buffer)
        speech_input = process_audio_chunk(audio_chunk)
        if speech_input is not None:
            with torch.no_grad():
                speech_pred = speech_model(speech_input)
                speech_prob = torch.softmax(speech_pred, dim=1)
                print(f"Speech probabilities for final chunk: {speech_prob}")
                speech_emotion_idx = torch.argmax(speech_pred).item()
                speech_emotion = emotion_labels[speech_emotion_idx]
            print(f"Speech emotion for final chunk: {speech_emotion}")
            emotion_history['speech'].append(speech_emotion)

    # Save emotion history to a file
    with open("emotion_history.json", "w") as f:
        json.dump(emotion_history, f, indent=4)
    print("Emotion history saved to emotion_history.json")

    stream.stop_stream()
    stream.close()
    p.terminate()
    cap.release()
    cv2.destroyAllWindows()
    print("Cleanup completed.")

# Generate recommendations (in French)
def generate_recommendations(emotion_history):
    print("\nRésumé de l’analyse des émotions :")
    print(f"Émotions faciales : {emotion_history['face']}")
    print(f"Émotions vocales : {emotion_history['speech']}")
    print(f"Émotions combinées : {emotion_history['combined']}")

    def get_dominant_emotion(emotion_list):
        if not emotion_list:
            return "Inconnu"
        emotion_counts = {emo: emotion_list.count(emo) for emo in set(emotion_list)}
        return max(emotion_counts, key=emotion_counts.get)

    dominant_face = get_dominant_emotion(emotion_history['face'])
    dominant_speech = get_dominant_emotion(emotion_history['speech'])
    dominant_combined = get_dominant_emotion(emotion_history['combined'])

    print(f"\nÉmotions dominantes :")
    print(f"Émotion faciale dominante : {dominant_face}")
    print(f"Émotion vocale dominante : {dominant_speech}")
    print(f"Émotion combinée dominante : {dominant_combined}")

    recommendations = []
    negative_emotions = ['angry', 'disgust', 'fear', 'sad']

    # Analyze emotion timeline
    if len(emotion_history['combined']) > 10:
        first_half = emotion_history['combined'][:len(emotion_history['combined'])//2]
        second_half = emotion_history['combined'][len(emotion_history['combined'])//2:]
        dominant_first = get_dominant_emotion(first_half)
        dominant_second = get_dominant_emotion(second_half)
        if dominant_first in negative_emotions and dominant_second not in negative_emotions:
            recommendations.append("Vous avez commencé l’entretien avec des émotions négatives, mais vous êtes devenu plus positif vers la fin. Essayez de commencer avec plus de confiance en prenant une profonde inspiration avant de répondre.")

    if dominant_combined in negative_emotions:
        recommendations.append("Vous avez semblé ressentir des émotions négatives pendant l’entretien. Envisagez de pratiquer des techniques de relaxation, comme la respiration profonde, pour gérer le stress ou l’anxiété.")
        if dominant_combined == 'sad':
            recommendations.append("Vous avez semblé triste par moments. Réfléchissez à ce qui pourrait en être la cause — peut-être que parler de votre passion pour le poste ou d’expériences positives pourrait transmettre plus d’enthousiasme.")
        elif dominant_combined == 'fear':
            recommendations.append("Vous avez montré des signes de peur ou de nervosité. Essayez de vous préparer plus soigneusement aux questions courantes et de vous entraîner devant un miroir ou avec un ami pour gagner en confiance.")
        elif dominant_combined in ['angry', 'disgust']:
            recommendations.append("Vous avez affiché de la colère ou du dégoût, ce qui pourrait sembler peu professionnel. Concentrez-vous sur le maintien d’un ton et d’un langage corporel positifs, même lorsque vous abordez des sujets difficiles.")
            if dominant_face == 'angry':
                recommendations.append("L’émotion ‘angry’ a été détectée fréquemment sur votre visage, ce qui pourrait être dû à un problème d’éclairage ou à une détection incorrecte. Assurez-vous que votre visage est bien éclairé et essayez de sourire davantage.")
    elif dominant_combined == 'happy':
        recommendations.append("Excellent travail ! Vous avez affiché de la joie tout au long de l’entretien, ce qui a probablement laissé une impression positive. Continuez à montrer votre enthousiasme et votre positivisme dans vos futurs entretiens.")
    elif dominant_combined == 'surprise':
        recommendations.append("Vous avez semblé surpris par moments, ce qui pourrait indiquer un manque de préparation à certaines questions. Passez en revue la description de poste et préparez-vous à une plus large gamme de questions pour vous sentir plus à l’aise.")
    elif dominant_combined == 'neutral':
        recommendations.append("Vous avez maintenu une attitude neutre, ce qui peut être professionnel mais pourrait manquer d’enthousiasme. Essayez de montrer plus de passion pour le poste en souriant et en utilisant un ton engageant.")

    if dominant_face != dominant_speech and dominant_speech != "Inconnu":
        recommendations.append("Il y avait une différence entre vos expressions faciales et vos émotions vocales. Assurez-vous que votre langage corporel correspond à votre ton verbal pour transmettre un message cohérent.")
    elif dominant_speech == "Inconnu":
        recommendations.append("Aucune émotion vocale n’a été détectée. Assurez-vous de parler clairement pendant l’entretien pour une analyse plus complète.")

    return recommendations

recommendations = generate_recommendations(emotion_history)
print("\nRecommandations pour le candidat :")
for i, rec in enumerate(recommendations, 1):
    print(f"{i}. {rec}")