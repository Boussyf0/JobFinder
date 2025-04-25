import cv2
import dlib
import torch
import torchvision.transforms as transforms
import mediapipe as mp
from models.emotion_cnn import EmotionCNN
import numpy as np
import os

# Initialize components
detector = dlib.get_frontal_face_detector()
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=True)

# Load the PyTorch model
model_path = os.path.join(os.path.dirname(__file__), 'emotion_model.pth')
if not os.path.exists(model_path):
    print(f"Error: Model file {model_path} not found. Please train or download the model.")
    exit(1)

model = EmotionCNN()
model.load_state_dict(torch.load(model_path))
model.eval()

# Define emotion labels
emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# Image preprocessing for PyTorch
transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((48, 48)),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

# Start video capture
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)

    for face in faces:
        # Extract face coordinates
        x, y, w, h = face.left(), face.top(), face.width(), face.height()
        face_region = frame[y:y+h, x:x+w]

        # Preprocess face for emotion recognition
        face_input = transform(face_region).unsqueeze(0)  # Add batch dimension

        # Predict emotion with PyTorch
        with torch.no_grad():
            emotion_pred = model(face_input)
            emotion_idx = torch.argmax(emotion_pred).item()
            emotion_label = emotion_labels[emotion_idx]

        # Draw bounding box and emotion label
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, emotion_label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        # Facial mesh detection with MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)
        if results.multi_face_landmarks:
            print("Facial mesh detected.")
            for face_landmarks in results.multi_face_landmarks:
                for landmark in face_landmarks.landmark:
                    x_lm = int(landmark.x * frame.shape[1])
                    y_lm = int(landmark.y * frame.shape[0])
                    cv2.circle(frame, (x_lm, y_lm), 1, (0, 255, 0), -1)

    # Display the result
    cv2.imshow('Emotion Detection & Facial Mesh', frame)

    # Exit on 'q' key press
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()