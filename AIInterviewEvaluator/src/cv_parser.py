# cv_parser.py
import pytesseract
from pdf2image import convert_from_path
import spacy
from typing import Dict, List, Optional

class CVParser:
    def __init__(self, skill_keywords: List[str], max_lines_for_name: int, excluded_locations: List[str]):
        self.nlp = spacy.load("fr_core_news_sm")
        self.skill_keywords = skill_keywords
        self.max_lines_for_name = max_lines_for_name
        self.excluded_locations = excluded_locations

    def parse(self, cv_path: str) -> Optional[Dict[str, any]]:
        """Analyse le CV et extrait les informations pertinentes."""
        try:
            images = convert_from_path(cv_path, dpi=300)
            text = ""
            for img in images:
                img = img.convert("L")  # Convertir en niveaux de gris
                img = img.point(lambda x: 0 if x < 128 else 255)  # Binariser
                text += pytesseract.image_to_string(img, lang="fra")
            print("Extracted text from CV:")
            print(text[:500])
        except Exception as e:
            print(f"Error during OCR: {e}")
            return None

        try:
            doc = self.nlp(text)
            skills = []
            experience = []
            education = []
            name = None

            # Heuristic: First proper noun at the start of the text is the name
            lines = text.split('\n')
            for line in lines[:self.max_lines_for_name]:
                line = line.strip()
                if not line:
                    continue
                line_doc = self.nlp(line)
                for ent in line_doc.ents:
                    if ent.label_ == "PER" and '@' not in ent.text and 'Dakhla' not in ent.text:
                        name = ent.text
                        break
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
                elif ent.label_ == "LOC" and len(ent.text) > 3 and ent.text not in self.excluded_locations:
                    education.append(ent.text)

            # Extract skills under "Compétences" section
            skill_section = False
            for line in text.lower().split('\n'):
                if "compétences" in line:
                    skill_section = True
                    continue
                if skill_section:
                    if any(keyword in line for keyword in self.skill_keywords):
                        line_doc = self.nlp(line)
                        for token in line_doc:
                            if token.lower_ in self.skill_keywords:
                                skills.append(token.text)
                    if line.strip() == "" or any(section in line for section in ["expérience", "formation"]):
                        skill_section = False

            # Fallback: Extract skills from entire document
            if not skills:
                for token in doc:
                    if token.lower_ in self.skill_keywords and not token.text.isdigit() and '/' not in token.text:
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

    def generate_questions(self, cv_data: Dict[str, any]) -> List[str]:
        """Génère des questions basées sur les données du CV."""
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