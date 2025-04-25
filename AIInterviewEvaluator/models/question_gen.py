import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="spacy")

import pytesseract
from pdf2image import convert_from_path
import os
import spacy

try:
    # Load the French spaCy model
    nlp = spacy.load("fr_core_news_sm")
    print("French spaCy model loaded successfully.")
except OSError as e:
    print(f"Error loading spaCy model: {e}")
    print("Please ensure 'fr_core_news_sm' is installed. Run: python -m spacy download fr_core_news_sm")
    exit(1)

cv_path = "/Users/abderrahim_boussyf/AIInterviewEvaluator/src/data/CV_2024-12-20_Abderrahim_Boussyf.pdf"

# Convert PDF to text using OCR
try:
    images = convert_from_path(cv_path, dpi=300)  # Increase DPI for better OCR
    text = ""
    for img in images:
        text += pytesseract.image_to_string(img, lang="fra")  # Use French for OCR
    print("Extracted text from CV:")
    print(text[:500])  # Print first 500 characters for debugging
except Exception as e:
    print(f"Error during OCR: {e}")
    text = ""
    exit(1)

# Save the extracted text to a temporary file
temp_file = "temp_cv.txt"
with open(temp_file, "w", encoding="utf-8") as f:
    f.write(text)

# Process the text with spaCy (French model)
try:
    doc = nlp(text)
    skills = []
    experience = []
    education = []
    name = None

    # Extract named entities
    for ent in doc.ents:
        if ent.label_ == "PER" and name is None:
            name = ent.text
        elif ent.label_ == "ORG":
            experience.append(ent.text)
        elif ent.label_ == "LOC":
            education.append(ent.text)

    # Extract skills (simplified keyword matching)
    skill_keywords = ["compétence", "expérience", "savoir-faire", "technologie", "logiciel", "python", "java", "sql", "management"]
    for token in doc:
        if token.lower_ in skill_keywords or token.pos_ == "NOUN":
            skills.append(token.text)

    # Clean up lists
    skills = list(set(skills))[:2]  # Take up to 2 skills
    experience = list(set(experience))[:1]  # Take up to 1 experience
    education = list(set(education))[:1]  # Take up to 1 education location

    data = {
        "name": name if name else "Candidat",
        "skills": skills,
        "experience": experience,
        "education": education
    }
except Exception as e:
    print(f"Error processing text with spaCy: {e}")
    data = None
finally:
    if os.path.exists(temp_file):
        os.remove(temp_file)

print("Parsed CV Data:")
print(data)

# Generate questions in French
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

questions = generate_questions(data)
print("Questions générées :")
for i, q in enumerate(questions, 1):
    print(f"{i}. {q}")