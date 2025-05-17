"""
Resume Matcher - Matches resumes with job listings based on skills and experience.

This module provides functionality to:
1. Parse and extract information from resumes (PDF, DOCX, TXT)
2. Match extracted skills with job listings
3. Score the match between resume and job listings
"""

import re
import string
from typing import List, Dict, Any, Tuple
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download required NLTK resources
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

# Common tech skills to look for in resumes
TECH_SKILLS = [
    # Programming Languages
    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'php', 'golang', 'swift',
    'kotlin', 'rust', 'scala', 'perl', 'r', 'matlab', 'bash', 'shell', 'sql', 'nosql',
    
    # Web Development
    'html', 'css', 'react', 'angular', 'vue', 'jquery', 'node.js', 'express', 'django', 'flask',
    'spring', 'asp.net', 'laravel', 'wordpress', 'bootstrap', 'tailwind', 'sass', 'less',
    
    # Mobile Development
    'android', 'ios', 'react native', 'flutter', 'swift', 'xamarin', 'cordova',
    
    # DevOps & Infrastructure
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible', 'puppet',
    'chef', 'git', 'github', 'gitlab', 'bitbucket', 'ci/cd', 'linux', 'unix', 'nginx', 'apache',
    
    # Databases
    'mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'sql server', 'redis', 'elasticsearch',
    'dynamodb', 'cassandra', 'firebase', 'mariadb',
    
    # Data Science & ML
    'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'scikit-learn', 'tensorflow', 'keras',
    'pytorch', 'opencv', 'nlp', 'machine learning', 'deep learning', 'ai', 'computer vision',
    'data mining', 'data visualization', 'statistics', 'tableau', 'power bi',
    
    # Software & Tools
    'jira', 'confluence', 'slack', 'trello', 'agile', 'scrum', 'kanban', 'photoshop', 'illustrator',
    'figma', 'sketch', 'adobe xd', 'visual studio', 'vs code', 'intellij', 'eclipse',
]

class ResumeParser:
    """Parses and extracts information from a resume."""
    
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english')) if hasattr(stopwords, 'words') else set()
        # Add French stop words if available
        try:
            self.stop_words.update(stopwords.words('french'))
        except:
            pass
    
    def extract_skills(self, text: str) -> List[str]:
        """
        Extract technical skills from resume text.
        
        Args:
            text: The text content of the resume
            
        Returns:
            A list of detected technical skills
        """
        # Clean and normalize text
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Remove punctuation
        text = re.sub(r'\s+', ' ', text).strip()  # Normalize whitespace
        
        # Tokenize
        tokens = word_tokenize(text) if hasattr(nltk, 'word_tokenize') else text.split()
        
        # Lemmatize words
        lemmatized_tokens = [self.lemmatizer.lemmatize(token) for token in tokens]
        
        # Look for skills in the text
        found_skills = set()
        
        # Single word skills
        for skill in TECH_SKILLS:
            if ' ' not in skill and skill in lemmatized_tokens:
                found_skills.add(skill)
        
        # Multi-word skills
        for skill in TECH_SKILLS:
            if ' ' in skill and skill in text:
                found_skills.add(skill)
        
        # Look for skill sections (common patterns in resumes)
        skill_section_matches = re.findall(r'skills.*?:(.*?)(?:\n\n|\Z)', text, re.DOTALL | re.IGNORECASE)
        for match in skill_section_matches:
            # Extract skills from skill sections
            skill_list = re.split(r'[,•\n]', match)
            for skill_item in skill_list:
                skill_item = skill_item.strip().lower()
                if skill_item in TECH_SKILLS:
                    found_skills.add(skill_item)
        
        return sorted(list(found_skills))
    
    def extract_experience(self, text: str) -> int:
        """
        Estimate years of experience from resume.
        
        Args:
            text: The text content of the resume
            
        Returns:
            Estimated years of experience (integer)
        """
        # Look for patterns like "X years of experience" or "X+ years"
        experience_patterns = [
            r'(\d+)\+?\s*(?:years|yrs)(?:\s*of)?\s*experience',
            r'experience\s*(?:of|:)?\s*(\d+)\+?\s*(?:years|yrs)',
            r'(?:work|worked|working).*?(\d+)\+?\s*(?:years|yrs)',
        ]
        
        years = []
        for pattern in experience_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            years.extend([int(y) for y in matches])
        
        if years:
            return max(years)
        
        # If no direct year count found, look for work history dates
        date_pairs = re.findall(r'(\d{4})\s*(?:-|to|–)\s*(\d{4}|present|now|current)', text, re.IGNORECASE)
        if date_pairs:
            total_years = 0
            for start, end in date_pairs:
                start_year = int(start)
                end_year = 2024 if end.lower() in ['present', 'now', 'current'] else int(end)
                total_years += end_year - start_year
            
            return total_years
        
        # Fallback to minimum experience
        return 0
    
    def parse_resume(self, text: str) -> Dict[str, Any]:
        """
        Parse a resume text and extract structured information.
        
        Args:
            text: The text content of the resume
            
        Returns:
            Dictionary containing extracted information
        """
        return {
            'skills': self.extract_skills(text),
            'years_of_experience': self.extract_experience(text),
            'raw_text': text
        }


class ResumeMatcher:
    """Matches resumes with job listings."""
    
    def __init__(self, jobs_data: List[Dict[str, Any]]):
        """
        Initialize the matcher with available jobs data.
        
        Args:
            jobs_data: List of job listings
        """
        self.jobs = jobs_data
        self.parser = ResumeParser()
        
    def match_resume_to_jobs(self, resume_text: str, limit: int = 10) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Match a resume to jobs and return ranked results.
        
        Args:
            resume_text: The text content of the resume
            limit: Maximum number of job matches to return
            
        Returns:
            Tuple containing (matched_jobs, extracted_resume_data)
        """
        # Parse the resume
        resume_data = self.parser.parse_resume(resume_text)
        resume_skills = set(resume_data['skills'])
        
        # Match with jobs
        job_matches = []
        for job in self.jobs:
            # Extract job skills from description and title
            job_description = job.get('description', '').lower()
            job_title = job.get('title', '').lower()
            job_skills = set()
            
            # Extract skills from job posting
            for skill in TECH_SKILLS:
                if skill in job_description or skill in job_title:
                    job_skills.add(skill)
            
            # Calculate match score (if no skills found, score is 0)
            if not resume_skills or not job_skills:
                match_score = 0
            else:
                # Calculate Jaccard similarity for skills
                skill_overlap = resume_skills.intersection(job_skills)
                skill_union = resume_skills.union(job_skills)
                skill_score = len(skill_overlap) / len(skill_union) if skill_union else 0
                
                # Adjust based on number of matching skills
                matching_skills_count = len(skill_overlap)
                count_score = min(matching_skills_count / 5, 1.0)  # Cap at 1.0 (5+ matching skills is perfect)
                
                # Combined score (weighted average)
                match_score = (skill_score * 0.7) + (count_score * 0.3)
                
            # Only include jobs with decent match scores
            if match_score > 0:
                job_matches.append({
                    'job': job,
                    'score': match_score,
                    'matching_skills': list(resume_skills.intersection(job_skills))
                })
        
        # Sort by match score (descending)
        job_matches.sort(key=lambda x: x['score'], reverse=True)
        
        # Format the results
        result_jobs = []
        for match in job_matches[:limit]:
            job_copy = match['job'].copy()
            job_copy['match_score'] = round(match['score'] * 100)  # Convert to percentage
            job_copy['matching_skills'] = match['matching_skills']
            result_jobs.append(job_copy)
        
        return result_jobs, resume_data


# Utility function to parse different resume file types
def extract_text_from_resume(file_contents: bytes, file_type: str) -> str:
    """
    Extract text from resume file.
    
    Args:
        file_contents: Binary file contents
        file_type: MIME type of the file
        
    Returns:
        Extracted text from the resume
    """
    if file_type == 'text/plain':
        return file_contents.decode('utf-8', errors='ignore')
    
    if file_type == 'application/pdf':
        try:
            from PyPDF2 import PdfReader
            import io
            pdf_stream = io.BytesIO(file_contents)
            reader = PdfReader(pdf_stream)
            text = ''
            for page in reader.pages:
                text += page.extract_text() or ''
            return text.strip()
        except Exception as e:
            print(f"PDF parsing error: {e}")
            return ''
    
    if file_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
        try:
            import io
            from docx import Document
            doc_stream = io.BytesIO(file_contents)
            doc = Document(doc_stream)
            text = '\n'.join([para.text for para in doc.paragraphs])
            return text.strip()
        except Exception as e:
            print(f"DOCX parsing error: {e}")
            return ''
    
    # Fallback for unsupported types
    return '' 