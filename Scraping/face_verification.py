"""
Face Verification Module

This module provides functionality to verify a user's face during an interview,
tracking facial landmarks to detect presence, attention, and potential cheating behaviors.
"""

import base64
import io
import json
import numpy as np
import cv2
from typing import Dict, List, Any, Optional, Tuple
import time

# Global variable declarations
DLIB_AVAILABLE = False
face_detector = None
landmark_detector = None

# Try to import the deep learning based face detection library
try:
    import dlib
    DLIB_AVAILABLE = True
    print("dlib successfully imported for face detection")
except ImportError:
    print("Warning: dlib not available, falling back to OpenCV's face detection")

def init_detectors():
    """Initialize face and landmark detectors."""
    global face_detector, landmark_detector, DLIB_AVAILABLE
    
    if DLIB_AVAILABLE:
        # Initialize dlib's face detector and facial landmark predictor
        try:
            face_detector = dlib.get_frontal_face_detector()
            # This path needs to be adjusted to where the shape predictor file is located
            # The 68 point model can be downloaded from:
            # http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
            model_path = "shape_predictor_68_face_landmarks.dat"
            try:
                landmark_detector = dlib.shape_predictor(model_path)
                print("Loaded dlib face and landmark detectors")
            except Exception as e:
                print(f"Error loading landmark model: {str(e)}")
                print("Face detection will work but facial landmarks will not be available")
        except Exception as e:
            print(f"Error loading dlib models: {str(e)}")
            DLIB_AVAILABLE = False
    
    if not DLIB_AVAILABLE:
        # Fall back to OpenCV's Haar cascade classifier
        try:
            face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            print("Loaded OpenCV face detector as fallback")
        except Exception as e:
            print(f"Error loading OpenCV face detector: {str(e)}")
            face_detector = None

def detect_face(image_data: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces in an image.
    
    Args:
        image_data: Image as a numpy array
        
    Returns:
        List of face rectangles (x, y, width, height)
    """
    global face_detector
    
    if face_detector is None:
        init_detectors()
    
    if DLIB_AVAILABLE and face_detector is not None:
        # Use dlib for face detection
        gray = cv2.cvtColor(image_data, cv2.COLOR_BGR2GRAY)
        faces = face_detector(gray, 1)
        return [(face.left(), face.top(), face.width(), face.height()) for face in faces]
    elif face_detector is not None:
        # Fall back to OpenCV's Haar cascade
        gray = cv2.cvtColor(image_data, cv2.COLOR_BGR2GRAY)
        faces = face_detector.detectMultiScale(gray, 1.1, 5)
        return [(x, y, w, h) for (x, y, w, h) in faces]
    else:
        return []

def get_face_landmarks(image_data: np.ndarray, face: Tuple[int, int, int, int]) -> Optional[List[Tuple[int, int]]]:
    """
    Get facial landmarks for a detected face.
    
    Args:
        image_data: Image as a numpy array
        face: Face rectangle (x, y, width, height)
        
    Returns:
        List of landmark points (x, y) or None if landmarks couldn't be detected
    """
    global landmark_detector
    
    if not DLIB_AVAILABLE or landmark_detector is None:
        return None
    
    x, y, w, h = face
    rect = dlib.rectangle(x, y, x + w, y + h)
    
    gray = cv2.cvtColor(image_data, cv2.COLOR_BGR2GRAY)
    shape = landmark_detector(gray, rect)
    
    # Convert landmark points to list of (x, y) coordinates
    landmarks = [(shape.part(i).x, shape.part(i).y) for i in range(68)]
    return landmarks

def analyze_face_position(landmarks: List[Tuple[int, int]], image_size: Tuple[int, int]) -> Dict[str, Any]:
    """
    Analyze face position and gaze direction.
    
    Args:
        landmarks: List of facial landmark points
        image_size: Size of the image (width, height)
        
    Returns:
        Dictionary with analysis results
    """
    if not landmarks:
        return {
            "face_centered": False,
            "looking_away": True,
            "face_too_close": False
        }
    
    img_height, img_width = image_size
    
    # Calculate face center
    face_points = landmarks
    face_center_x = sum(x for x, y in face_points) / len(face_points)
    face_center_y = sum(y for x, y in face_points) / len(face_points)
    
    # Check if face is centered
    image_center_x = img_width / 2
    image_center_y = img_height / 2
    
    # Calculate distance from center as a percentage of image dimensions
    x_distance_pct = abs(face_center_x - image_center_x) / (img_width / 2)
    y_distance_pct = abs(face_center_y - image_center_y) / (img_height / 2)
    
    # Face is centered if within 30% of center
    face_centered = x_distance_pct < 0.3 and y_distance_pct < 0.3
    
    # Check if looking away
    # For a simple detection, we can use the relative positions of eyes, nose, and mouth
    # If dlib landmarks are available:
    if len(landmarks) >= 68:  # full set of dlib landmarks
        # Get eye landmarks
        left_eye = landmarks[36:42]
        right_eye = landmarks[42:48]
        
        # Get nose tip and base landmarks
        nose_tip = landmarks[30]
        nose_base = landmarks[33]
        
        # Calculate eye centers
        left_eye_center = (sum(x for x, y in left_eye) / len(left_eye), 
                          sum(y for x, y in left_eye) / len(left_eye))
        right_eye_center = (sum(x for x, y in right_eye) / len(right_eye), 
                           sum(y for x, y in right_eye) / len(right_eye))
        
        # Check horizontal and vertical symmetry for gaze estimation
        eye_x_diff = abs(right_eye_center[0] - left_eye_center[0])
        eye_y_diff = abs(right_eye_center[1] - left_eye_center[1])
        
        nose_x_off_center = abs(nose_tip[0] - (left_eye_center[0] + right_eye_center[0]) / 2)
        
        # If eyes are not on roughly same level or nose is off-center, may be looking away
        looking_away = eye_y_diff > 10 or nose_x_off_center > 20
    else:
        # Simplified check if we don't have detailed landmarks
        looking_away = not face_centered
    
    # Check if face is too close to the camera
    # If the face width is more than 50% of the image width, it's too close
    if len(landmarks) >= 68:
        face_width = max(x for x, y in landmarks) - min(x for x, y in landmarks)
        face_too_close = face_width > img_width * 0.5
    else:
        face_too_close = False
    
    return {
        "face_centered": face_centered,
        "looking_away": looking_away,
        "face_too_close": face_too_close
    }

def detect_movement(current_landmarks: List[Tuple[int, int]], 
                  previous_landmarks: List[Tuple[int, int]]) -> Dict[str, Any]:
    """
    Detect movement between two sets of landmarks.
    
    Args:
        current_landmarks: Current facial landmarks
        previous_landmarks: Previous facial landmarks
        
    Returns:
        Dictionary with movement analysis
    """
    if not current_landmarks or not previous_landmarks:
        return {
            "movement_detected": False,
            "rapid_movement": False,
            "movement_score": 0
        }
    
    # Calculate distance moved for each landmark
    distances = []
    for i in range(min(len(current_landmarks), len(previous_landmarks))):
        curr_x, curr_y = current_landmarks[i]
        prev_x, prev_y = previous_landmarks[i]
        
        # Euclidean distance
        distance = ((curr_x - prev_x) ** 2 + (curr_y - prev_y) ** 2) ** 0.5
        distances.append(distance)
    
    # Average movement distance
    avg_distance = sum(distances) / len(distances) if distances else 0
    
    # Detect if movement occurred
    movement_detected = avg_distance > 5  # Threshold for movement
    
    # Detect rapid movement
    rapid_movement = avg_distance > 20  # Threshold for rapid movement
    
    return {
        "movement_detected": movement_detected,
        "rapid_movement": rapid_movement,
        "movement_score": avg_distance
    }

def process_video_frame(frame_base64: str, 
                        previous_landmarks: Optional[List[Tuple[int, int]]] = None) -> Dict[str, Any]:
    """
    Process a single video frame for face verification.
    
    Args:
        frame_base64: Base64 encoded video frame
        previous_landmarks: Previous frame's facial landmarks for movement detection
        
    Returns:
        Dictionary with face verification results
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(frame_base64)
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {
                "success": False,
                "error": "Failed to decode image",
                "face_detected": False
            }
        
        # Get image dimensions
        img_height, img_width = img.shape[:2]
        
        # Detect faces
        faces = detect_face(img)
        
        if not faces:
            return {
                "success": True,
                "face_detected": False,
                "message": "No face detected"
            }
        
        # Use the largest face if multiple are detected
        largest_face = max(faces, key=lambda face: face[2] * face[3])
        
        # Get facial landmarks
        landmarks = get_face_landmarks(img, largest_face)
        
        # Analyze face position
        position_analysis = analyze_face_position(landmarks or [], (img_height, img_width))
        
        # Detect movement if we have previous landmarks
        movement_analysis = {}
        if previous_landmarks and landmarks:
            movement_analysis = detect_movement(landmarks, previous_landmarks)
        
        # Prepare response
        result = {
            "success": True,
            "face_detected": True,
            "position_analysis": position_analysis,
            "movement_analysis": movement_analysis if movement_analysis else None,
            "landmarks": landmarks if landmarks else None
        }
        
        return result
    
    except Exception as e:
        print(f"Error processing video frame: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "face_detected": False
        }

def analyze_candidate_behavior(frames_analysis: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze candidate behavior from a series of frame analyses.
    
    Args:
        frames_analysis: List of analysis results from multiple frames
        
    Returns:
        Dictionary with overall behavior assessment
    """
    total_frames = len(frames_analysis)
    if total_frames == 0:
        return {
            "attention_score": 0,
            "suspicious_activity": False,
            "present_percentage": 0,
            "looking_away_percentage": 100,
            "message": "No data available for analysis"
        }
    
    # Count frames with various conditions
    faces_detected = sum(1 for frame in frames_analysis if frame.get("face_detected", False))
    looking_away = sum(1 for frame in frames_analysis 
                     if frame.get("face_detected", False) and 
                     frame.get("position_analysis", {}).get("looking_away", True))
    face_centered = sum(1 for frame in frames_analysis 
                       if frame.get("face_detected", False) and 
                       frame.get("position_analysis", {}).get("face_centered", False))
    rapid_movements = sum(1 for frame in frames_analysis 
                         if frame.get("face_detected", False) and 
                         frame.get("movement_analysis", {}).get("rapid_movement", False))
    
    # Calculate percentages
    present_percentage = (faces_detected / total_frames) * 100 if total_frames > 0 else 0
    looking_away_percentage = (looking_away / faces_detected) * 100 if faces_detected > 0 else 100
    centered_percentage = (face_centered / faces_detected) * 100 if faces_detected > 0 else 0
    
    # Calculate attention score (0-100)
    attention_score = int(present_percentage * 0.5 + (100 - looking_away_percentage) * 0.5)
    
    # Determine if behavior is suspicious
    suspicious_activity = (present_percentage < 60 or looking_away_percentage > 40 or 
                           rapid_movements > total_frames * 0.3)
    
    # Generate feedback message
    if present_percentage < 60:
        message = "Candidate was frequently absent from the camera view."
    elif looking_away_percentage > 40:
        message = "Candidate was frequently looking away from the camera."
    elif rapid_movements > total_frames * 0.3:
        message = "Candidate showed unusual movement patterns that may indicate cheating behavior."
    else:
        message = "Candidate behavior appears normal during the interview."
    
    return {
        "attention_score": attention_score,
        "suspicious_activity": suspicious_activity,
        "present_percentage": round(present_percentage, 1),
        "looking_away_percentage": round(looking_away_percentage, 1),
        "centered_percentage": round(centered_percentage, 1),
        "rapid_movements_count": rapid_movements,
        "message": message
    }

# Initialize detectors on module load
init_detectors()

# For testing purposes
if __name__ == "__main__":
    # Test with a sample image if available
    try:
        test_image_path = "test_face.jpg"
        img = cv2.imread(test_image_path)
        if img is not None:
            faces = detect_face(img)
            print(f"Detected {len(faces)} faces in test image")
            
            if faces:
                landmarks = get_face_landmarks(img, faces[0])
                if landmarks:
                    print(f"Detected {len(landmarks)} facial landmarks")
                    
                    # Draw landmarks on image for visualization
                    for (x, y) in landmarks:
                        cv2.circle(img, (x, y), 1, (0, 255, 0), -1)
                    
                    cv2.imwrite("test_landmarks.jpg", img)
                    print("Saved visualization to test_landmarks.jpg")
    except Exception as e:
        print(f"Test failed: {str(e)}") 