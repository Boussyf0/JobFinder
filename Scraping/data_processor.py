#!/usr/bin/env python3
"""
Data Processor for Job Listings

This script processes job data by:
1. Cleaning and standardizing data
2. Removing duplicates
3. Extracting features (skills, job types, etc.)
4. Enriching the data
5. Storing it in the vector database
"""

import os
import re
import sys
import pandas as pd
import numpy as np
import faiss
from datetime import datetime
from collections import Counter
import spacy
from typing import Dict, List, Any, Set
from tqdm import tqdm
import nltk
from nltk.corpus import stopwords
from sklearn.feature_extraction.text import TfidfVectorizer

# Local imports
from adzuna_vector_store import JobVectorStore

# Download required NLTK resources
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Try to load spaCy model, download if not available
try:
    nlp = spacy.load("fr_core_news_sm")
    print("Loaded French spaCy model")
except OSError:
    print("French spaCy model not found. Installing...")
    import subprocess
    subprocess.call([sys.executable, "-m", "spacy", "download", "fr_core_news_sm"])
    nlp = spacy.load("fr_core_news_sm")

# Constants
COMMON_SKILLS = {
    'python', 'javascript', 'java', 'c++', 'sql', 'nosql', 'django', 'flask', 'node.js', 
    'react', 'angular', 'vue', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'git', 'agile', 'scrum', 'kanban', 'ci/cd', 'jenkins', 'devops', 'machine learning',
    'deep learning', 'tensorflow', 'pytorch', 'nlp', 'data science', 'data analysis',
    'php', 'c#', 'css', 'html', 'ux', 'ui', 'design', 'figma', 'sketch', 'adobe',
    'excel', 'tableau', 'power bi', 'sap', 'oracle', 'salesforce', 'crm', 'erp',
    'comptabilité', 'finance', 'audit', 'marketing', 'seo', 'sem', 'content',
    'project management', 'gestion de projet', 'électronique', 'electronique', 'mécanique',
    'mecanique', 'automatisme', 'robotique', 'iot', 'réseaux', 'networks', 'sécurité',
    'security', 'administration système', 'system administration', 'mongodb', 'mysql',
    'postgresql', 'mariadb', 'jira', 'confluence', 'bitbucket', 'gitlab', 'github',
    'office', 'word', 'excel', 'powerpoint', 'français', 'french', 'anglais', 'english',
    'espagnol', 'spanish', 'allemand', 'german', 'arabe', 'arabic', 'gestion', 'management'
}

# Degree patterns for extraction
DEGREE_PATTERNS = [
    r'\b(bac\s*\+\s*\d)\b',
    r'\bmaster\b',
    r'\blicence\b',
    r'\bdoctora(t|l)\b',
    r'\bphd\b',
    r'\bing[ée]nieur\b',
    r'\bengineering\b',
    r'\bmba\b',
    r'\bdiplôme\b',
    r'\bdiplome\b',
    r'\bdut\b',
    r'\bbts\b',
    r'\bdoc\b'
]

# Job type patterns
JOB_TYPE_PATTERNS = {
    'full_time': [r'\bfull[ -]time\b', r'\btemps[ -]plein\b', r'\bcdi\b', r'\bpermanent\b'],
    'part_time': [r'\bpart[ -]time\b', r'\btemps[ -]partiel\b'],
    'contract': [r'\bcontract\b', r'\bcdd\b', r'\bcontrat\b', r'\bcontractual\b'],
    'internship': [r'\bstagiaire\b', r'\bstage\b', r'\bintern(ship)?\b', r'\bpfe\b'],
    'temporary': [r'\btemp\b', r'\btemporary\b', r'\btemporaire\b', r'\binterim\b', r'\bintérim\b'],
}

# Location standardization
MOROCCO_CITIES = {
    'casablanca': 'Casablanca',
    'casa': 'Casablanca',
    'rabat': 'Rabat',
    'tanger': 'Tangier',
    'tangier': 'Tangier',
    'marrakech': 'Marrakech',
    'marrakesh': 'Marrakech',
    'agadir': 'Agadir',
    'fes': 'Fez',
    'fez': 'Fez',
    'meknes': 'Meknes',
    'meknès': 'Meknes',
    'tetouan': 'Tetouan',
    'tétouan': 'Tetouan',
    'oujda': 'Oujda',
    'kenitra': 'Kenitra',
    'kénitra': 'Kenitra',
    'mohammedia': 'Mohammedia',
    'el jadida': 'El Jadida',
    'nador': 'Nador',
    'beni mellal': 'Beni Mellal',
    'béni mellal': 'Beni Mellal',
    'temara': 'Temara',
    'témara': 'Temara',
    'safi': 'Safi',
    'berrechid': 'Berrechid',
    'taza': 'Taza',
    'settat': 'Settat',
}

def log(message):
    """Simple logging with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def clean_job_title(title):
    """Clean and standardize job title."""
    if not title:
        return ""
    
    title = str(title).strip()
    # Remove special characters and excessive whitespace
    title = re.sub(r'[^\w\s\(\)\-\+\/]', ' ', title, flags=re.UNICODE)
    title = re.sub(r'\s+', ' ', title).strip()
    
    return title

def clean_company_name(company):
    """Clean and standardize company name."""
    if not company:
        return ""
    
    company = str(company).strip()
    # Remove terms like "Ltd", "LLC", etc.
    company = re.sub(r'\b(Ltd|LLC|Inc|SARL|SA|SAS|GmbH|Corp|Limited|Pvt)\b', '', company)
    company = re.sub(r'[^\w\s\-\.]', ' ', company, flags=re.UNICODE)
    company = re.sub(r'\s+', ' ', company).strip()
    
    return company

def standardize_location(location):
    """Standardize location information."""
    if not location or location == "Non spécifié":
        return "Morocco"
    
    location = str(location).lower().strip()
    
    # Check for Morocco cities
    for city_pattern, standardized in MOROCCO_CITIES.items():
        if re.search(r'\b' + city_pattern + r'\b', location):
            return standardized + ", Morocco"
    
    # If it has "maroc" or "morocco", standardize to "Morocco"
    if 'maroc' in location or 'morocco' in location:
        return "Morocco"
    
    return location.title()

def extract_salary_range(text):
    """Extract salary information from text."""
    if not text or text == "Non spécifié":
        return None, None
    
    text = str(text).lower()
    
    # Direct salary patterns like "10000-15000 DH"
    direct_pattern = r'(\d[\d\s]*(?:\.|,)?\d+)\s*(?:-|to|à)\s*(\d[\d\s]*(?:\.|,)?\d+)'
    direct_match = re.search(direct_pattern, text)
    if direct_match:
        min_salary = direct_match.group(1).replace(' ', '').replace(',', '.')
        max_salary = direct_match.group(2).replace(' ', '').replace(',', '.')
        try:
            return float(min_salary), float(max_salary)
        except ValueError:
            pass
    
    # Single number pattern like "10000 DH"
    single_pattern = r'(\d[\d\s]*(?:\.|,)?\d+)\s*(?:dh|mad|dirhams|euros|eur|€|\$|usd)'
    single_match = re.search(single_pattern, text)
    if single_match:
        salary = single_match.group(1).replace(' ', '').replace(',', '.')
        try:
            salary_value = float(salary)
            return salary_value, salary_value
        except ValueError:
            pass
    
    return None, None

def extract_skills(text):
    """Extract skills from job text."""
    if not text or text == "Non spécifié":
        return []
    
    text = str(text).lower()
    found_skills = set()
    
    # Extract skills from predefined list
    for skill in COMMON_SKILLS:
        if re.search(r'\b' + re.escape(skill) + r'\b', text):
            found_skills.add(skill)
    
    # Extract programming languages and frameworks (simplistic approach)
    prog_pattern = r'\b(java|python|javascript|typescript|c\+\+|c#|ruby|php|swift|kotlin|scala|rust|go|perl|r|matlab|cobol)\b'
    prog_matches = re.findall(prog_pattern, text)
    for match in prog_matches:
        found_skills.add(match)
    
    # Extract frameworks and tools
    frameworks_pattern = r'\b(react|angular|vue|django|flask|spring|laravel|symfony|rails|node\.js|express|pandas|tensorflow|pytorch|keras|scikit-learn)\b'
    framework_matches = re.findall(frameworks_pattern, text)
    for match in framework_matches:
        found_skills.add(match)
    
    return sorted(list(found_skills))

def extract_education(text):
    """Extract education requirements from text."""
    if not text or text == "Non spécifié":
        return []
    
    text = str(text).lower()
    degrees = set()
    
    for pattern in DEGREE_PATTERNS:
        matches = re.findall(pattern, text)
        degrees.update(matches)
    
    return sorted(list(degrees))

def extract_job_type(text):
    """Extract job type from text."""
    if not text or text == "Non spécifié":
        return None
    
    text = str(text).lower()
    
    for job_type, patterns in JOB_TYPE_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text):
                return job_type
    
    return None

def extract_years_experience(text):
    """Extract years of experience requirement from text."""
    if not text or text == "Non spécifié":
        return None
    
    text = str(text).lower()
    
    # Patterns like "2-3 ans d'expérience" or "expérience de 5 ans"
    patterns = [
        r'(\d+)[\s-]+(\d+)\s+ans?\s+d\'?exp[eé]rience',  # 2-3 ans d'expérience
        r'exp[eé]rience\s+de\s+(\d+)[\s-]+(\d+)\s+ans',  # expérience de 2-3 ans
        r'(\d+)\+?\s+ans?\s+d\'?exp[eé]rience',          # 5+ ans d'expérience
        r'exp[eé]rience\s+de\s+(\d+)\+?\s+ans',          # expérience de 5+ ans
        r'minimum\s+(\d+)\s+ans?\s+d\'?exp[eé]rience',    # minimum 3 ans d'expérience
        r'au\s+moins\s+(\d+)\s+ans?\s+d\'?exp[eé]rience'  # au moins 2 ans d'expérience
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            # If pattern has range like "2-3 years", take the minimum
            if len(match.groups()) > 1 and match.group(2):
                try:
                    return int(match.group(1))
                except ValueError:
                    pass
            else:
                try:
                    return int(match.group(1))
                except ValueError:
                    pass
    
    # Simpler experience patterns
    simple_match = re.search(r'(\d+)\s*(?:year|an)s?', text)
    if simple_match:
        try:
            return int(simple_match.group(1))
        except ValueError:
            pass
    
    # Look for junior/senior indicators
    if any(term in text for term in ['junior', 'débutant', 'entry level', 'graduate']):
        return 0
    if any(term in text for term in ['senior', 'experienced', 'expérimenté', 'confirmé']):
        return 5
    
    return None

def detect_remote_status(text):
    """Detect if a job is remote, hybrid, or onsite."""
    if not text or text == "Non spécifié":
        return "onsite"
    
    text = str(text).lower()
    
    remote_patterns = [
        r'\bremote\b', r'\btélétravail\b', r'\bteletravail\b', r'\bdistanc(e|iel)\b', 
        r'\bhome\s+based\b', r'\bwork\s+from\s+home\b', r'\btravail\s+à\s+distance\b'
    ]
    
    hybrid_patterns = [
        r'\bhybri(d|de)\b', r'\bflexi\b', r'\bmixte\b', r'\bpartial\s+remote\b', 
        r'\bremote\s+partial\b', r'\btélétravail\s+partiel\b'
    ]
    
    for pattern in remote_patterns:
        if re.search(pattern, text):
            return "remote"
    
    for pattern in hybrid_patterns:
        if re.search(pattern, text):
            return "hybrid"
    
    return "onsite"

def extract_department(specialty):
    """Extract department/category from specialty."""
    if not specialty:
        return "General"
    
    if isinstance(specialty, str):
        return specialty.strip()
    return "General"

def is_duplicate(job1, job2):
    """Check if two job records are likely duplicates."""
    # Check for exact same job with same company
    if (job1.get('title') == job2.get('title') and 
        job1.get('company') == job2.get('company')):
        return True
    
    # Could add more sophisticated duplicate detection here
    return False

def process_dataframe(df):
    """Process the dataframe to clean and enhance job data."""
    log(f"Processing {len(df)} job records")
    
    # Create a copy to avoid modifying the original
    processed_df = df.copy()
    
    # Clean basic fields
    processed_df['title'] = processed_df['title'].apply(clean_job_title)
    processed_df['company'] = processed_df['company'].apply(clean_company_name)
    processed_df['location'] = processed_df['location'] if 'location' in processed_df.columns else None
    
    if 'location' in processed_df.columns:
        processed_df['location'] = processed_df['location'].apply(standardize_location)
    else:
        processed_df['location'] = "Morocco"
    
    # Extract and enhance with additional information
    tqdm.pandas(desc="Extracting features")
    
    # Add empty columns if they don't exist
    if 'description' not in processed_df.columns:
        processed_df['description'] = "Non spécifié"
    
    # Process text fields to extract information
    processed_df['skills'] = processed_df['description'].progress_apply(extract_skills)
    processed_df['education'] = processed_df['description'].progress_apply(extract_education)
    processed_df['job_type'] = processed_df['description'].progress_apply(extract_job_type)
    processed_df['experience_years'] = processed_df['description'].progress_apply(extract_years_experience)
    processed_df['work_arrangement'] = processed_df['description'].progress_apply(detect_remote_status)
    
    # Mark remote jobs
    processed_df['remote_friendly'] = processed_df['work_arrangement'].apply(lambda x: x in ['remote', 'hybrid'])
    
    # Set international flag based on various criteria
    processed_df['international'] = processed_df.apply(
        lambda row: 'international' in str(row.get('description', '')).lower() or
                   'worldwide' in str(row.get('description', '')).lower() or
                   'global' in str(row.get('description', '')).lower(),
        axis=1
    )
    
    # Extract department from specialty
    if 'speciality' in processed_df.columns:
        processed_df['department'] = processed_df['speciality'].apply(extract_department)
    elif 'specialty' in processed_df.columns:
        processed_df['department'] = processed_df['specialty'].apply(extract_department)
    else:
        processed_df['department'] = "General"
    
    # Extract salary information if available
    if 'salary' in processed_df.columns:
        salary_info = processed_df['salary'].progress_apply(extract_salary_range)
        processed_df['salary_min'] = [x[0] for x in salary_info]
        processed_df['salary_max'] = [x[1] for x in salary_info]
    
    # Add posting date if not available (using current date)
    if 'post_date' not in processed_df.columns:
        processed_df['post_date'] = datetime.now().strftime("%Y-%m-%d")
    
    log(f"Data processing complete. Processed {len(processed_df)} records.")
    return processed_df

def remove_duplicates(df):
    """Remove duplicate job listings."""
    log(f"Checking for duplicates in {len(df)} records")
    
    # First use pandas drop_duplicates for exact matches
    initial_count = len(df)
    df = df.drop_duplicates(subset=['title', 'company'], keep='first')
    exact_duplicates = initial_count - len(df)
    
    log(f"Removed {exact_duplicates} exact duplicates")
    
    # More advanced duplicate detection could be added here
    
    return df

def vectorize_skills(df):
    """Create a skills vector for each job."""
    # Combine skills into a single text string for vectorization
    df['skills_text'] = df['skills'].apply(lambda x: ' '.join(x) if isinstance(x, list) else '')
    
    # Create a TF-IDF vectorizer
    vectorizer = TfidfVectorizer(max_features=100)
    
    # Only vectorize if we have non-empty skills
    if df['skills_text'].str.strip().str.len().sum() > 0:
        try:
            skills_vectors = vectorizer.fit_transform(df['skills_text'])
            log(f"Created skills vectors with {skills_vectors.shape[1]} features")
            return vectorizer.get_feature_names_out(), skills_vectors
        except Exception as e:
            log(f"Error vectorizing skills: {str(e)}")
            return [], None
    else:
        log("No skills found to vectorize")
        return [], None

def main():
    # Configuration
    data_dir = "adzuna_data"
    vector_dir = "vector_store"
    output_dir = os.path.join(data_dir, "processed")
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Load data from vector store first
    log("Initializing vector store...")
    vector_store = JobVectorStore(data_dir=data_dir, vector_dir=vector_dir)
    
    # Try to load existing database
    loaded = vector_store.load()
    if loaded:
        log(f"Loaded existing vector store with {len(vector_store.jobs)} jobs")
        # Convert jobs to DataFrame
        jobs_df = pd.DataFrame(vector_store.jobs)
        log(f"Converted {len(jobs_df)} jobs to DataFrame for processing")
    else:
        log("No existing vector store found. Looking for CSV files...")
        
        # Find all CSV files in the data directory
        csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
        
        if not csv_files:
            log("No CSV files found in data directory")
            sys.exit(1)
        
        # Load and combine all CSV files
        dfs = []
        for csv_file in csv_files:
            file_path = os.path.join(data_dir, csv_file)
            try:
                df = pd.read_csv(file_path)
                log(f"Loaded {len(df)} records from {csv_file}")
                dfs.append(df)
            except Exception as e:
                log(f"Error loading {csv_file}: {str(e)}")
        
        if not dfs:
            log("No data could be loaded from CSV files")
            sys.exit(1)
        
        # Combine all DataFrames
        jobs_df = pd.concat(dfs, ignore_index=True)
        log(f"Combined {len(jobs_df)} total records from {len(dfs)} files")
    
    # Process the data
    processed_df = process_dataframe(jobs_df)
    
    # Remove duplicates
    processed_df = remove_duplicates(processed_df)
    
    # Vectorize skills
    skill_features, skill_vectors = vectorize_skills(processed_df)
    
    # Save processed data to CSV
    output_csv = os.path.join(output_dir, f"processed_jobs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    processed_df.to_csv(output_csv, index=False)
    log(f"Saved processed data to {output_csv}")
    
    # Clear the existing vector store
    vector_store.jobs = []
    vector_store.job_ids_map = {}
    if hasattr(vector_store, 'index') and vector_store.index:
        vector_store.index = None
        # Reinitialize the index
        vector_store.index = faiss.IndexFlatL2(vector_store.vector_dim)
    
    # Add processed jobs to vector store
    log(f"Adding {len(processed_df)} processed jobs to vector store")
    added = vector_store.add_jobs_from_dataframe(processed_df)
    
    if added > 0:
        log(f"Successfully added {added} processed jobs to vector store")
        # Save the vector store
        vector_store.save()
        log("Vector store saved to disk")
        
        # Show basic statistics
        stats = vector_store.get_job_statistics()
        log(f"Total jobs in database: {stats['total_jobs']}")
        log(f"Remote jobs: {stats.get('remote_jobs', 0)}")
        log(f"International jobs: {stats.get('international_jobs', 0)}")
    else:
        log("No jobs were added to the vector store")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc() 