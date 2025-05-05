#!/usr/bin/env python3
"""
Salary Predictor Module

This module provides salary prediction functionality based on job parameters
using a machine learning model trained on job data.

Usage:
    from salary_predictor import predict_job_salary
    
    # Predict a salary
    predicted_salary = predict_job_salary(
        title="Software Engineer",
        dept_category="IT & Technology", 
        experience_years=3,
        is_remote=1,
        is_hybrid=0,
        job_type="full_time",
        skills_count=5
    )
"""

import os
import joblib
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, Tuple, Union, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Path to the model file
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                         "adzuna_data/models/salary_predictor.pkl")

# Department categories mapping for standardization
DEPARTMENT_CATEGORIES = {
    "it": "IT & Technology",
    "technology": "IT & Technology",
    "software": "IT & Technology",
    "développement": "IT & Technology",
    "engineering": "Engineering",
    "ingénierie": "Engineering",
    "data": "Data Science",
    "science": "Data Science",
    "marketing": "Marketing",
    "sales": "Sales & Business Development",
    "business": "Sales & Business Development",
    "finance": "Finance & Accounting",
    "accounting": "Finance & Accounting",
    "électrique": "Electrical Engineering",
    "electrical": "Electrical Engineering",
    "civil": "Civil Engineering",
    "construction": "Civil Engineering",
    "btp": "Civil Engineering",
}

# Top cities with adjustments
LOCATION_ADJUSTMENTS = {
    "casablanca": 1.15,
    "rabat": 1.08,
    "tanger": 1.02,
    "marrakech": 1.0,
    "agadir": 0.98,
    "fes": 0.95,
    "meknes": 0.95,
    "tetouan": 0.95,
    "oujda": 0.93,
}

# Department default
DEFAULT_DEPARTMENT = "General"

def load_model():
    """Load the salary prediction model"""
    try:
        return joblib.load(MODEL_PATH)
    except Exception as e:
        logger.error(f"Error loading salary prediction model: {e}")
        return None

# Load the model at module import time
_model = load_model()

def standardize_department(department_text: str) -> str:
    """Convert department text to standard category"""
    if not department_text:
        return DEFAULT_DEPARTMENT
        
    department_text = department_text.lower()
    
    # Try direct match first
    for key, category in DEPARTMENT_CATEGORIES.items():
        if key in department_text:
            return category
    
    # Default category if no match
    return DEFAULT_DEPARTMENT

def extract_job_features(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract features from a job dict for prediction"""
    # Get basic data
    title = job_data.get('title', '')
    dept_category = job_data.get('dept_category', '')
    if not dept_category:
        dept_category = standardize_department(job_data.get('department', '') or job_data.get('category', ''))
    
    # Extract job type
    job_type = job_data.get('job_type', 'full_time')
    
    # Convert boolean flags to integer (1/0)
    is_remote = int(job_data.get('is_remote', 0))
    is_hybrid = int(job_data.get('is_hybrid', 0))
    is_fulltime = int(job_data.get('is_fulltime', 1))
    is_contract = int(job_data.get('is_contract', 0))
    
    # Get experience
    experience_years = float(job_data.get('experience_years', 0))
    
    # Check for skills count
    skills_count = int(job_data.get('skills_count', 5))
    
    # Pre-computed flags for title seniority
    is_senior = int(job_data.get('is_senior', 0))
    is_junior = int(job_data.get('is_junior', 0))
    is_manager = int(job_data.get('is_manager', 0))
    
    # If flags not provided, infer from title
    if not any([is_senior, is_junior, is_manager]):
        title_lower = title.lower()
        is_senior = 1 if any(term in title_lower for term in ['senior', 'lead', 'sr', 'principal']) else 0
        is_junior = 1 if any(term in title_lower for term in ['junior', 'assistant', 'jr', 'entry']) else 0
        is_manager = 1 if any(term in title_lower for term in ['manager', 'director', 'head', 'chief']) else 0
    
    # Create feature dict
    features = {
        'dept_category': [dept_category],
        'job_type': [job_type],
        'experience_years': [experience_years],
        'is_remote': [is_remote],
        'is_hybrid': [is_hybrid],
        'is_fulltime': [is_fulltime],
        'is_contract': [is_contract],
        'skills_count': [skills_count],
        'is_senior': [is_senior],
        'is_junior': [is_junior],
        'is_manager': [is_manager]
    }
    
    logger.info(f"Extracted features: {features}")
    return features

def predict_job_salary(**kwargs) -> Dict[str, Any]:
    """
    Predict salary for a job based on its attributes
    
    Args:
        title: Job title
        dept_category: Department category
        experience_years: Years of experience
        is_remote: Whether the job is remote (1 or 0)
        is_hybrid: Whether the job is hybrid (1 or 0)
        is_fulltime: Whether the job is full-time (1 or 0)
        is_contract: Whether the job is contract (1 or 0)
        skills_count: Number of skills
        is_senior: Whether it's a senior position (1 or 0)
        is_junior: Whether it's a junior position (1 or 0)
        is_manager: Whether it's a management position (1 or 0)
        location: Job location
        
    Returns:
        Dictionary with predicted salary range and confidence score
    """
    # Check if model is available
    if _model is None:
        logger.warning("Salary prediction model not available, using fallback")
        return _fallback_prediction(
            kwargs.get('title', ''),
            kwargs.get('experience_years', 0),
            kwargs.get('location', None),
            kwargs.get('is_senior', 0),
            kwargs.get('is_manager', 0)
        )
    
    # Extract features for prediction
    features = extract_job_features(kwargs)
    
    # Make prediction
    try:
        df = pd.DataFrame(features)
        prediction = _model.predict(df)[0]
        
        # Determine range and confidence
        confidence = 0.85
        # For LightGBM model, we have slightly tighter ranges
        min_salary = int(prediction * 0.85)
        max_salary = int(prediction * 1.15)
        
        # Apply location adjustment if available
        location = kwargs.get('location')
        if location:
            location_adjustment = _get_location_adjustment(location)
            min_salary = int(min_salary * location_adjustment)
            max_salary = int(max_salary * location_adjustment)
            prediction = int(prediction * location_adjustment)
        
        return {
            'min': min_salary,
            'max': max_salary,
            'predicted': int(prediction),
            'currency': 'MAD',
            'confidence': confidence
        }
        
    except Exception as e:
        logger.error(f"Error predicting salary: {e}")
        return _fallback_prediction(
            kwargs.get('title', ''),
            kwargs.get('experience_years', 0),
            kwargs.get('location', None),
            kwargs.get('is_senior', 0),
            kwargs.get('is_manager', 0)
        )

def _get_location_adjustment(location: str) -> float:
    """Get salary adjustment factor based on location"""
    if not location:
        return 1.0
        
    location = location.lower()
    
    # Check for exact city matches
    for city, adjustment in LOCATION_ADJUSTMENTS.items():
        if city in location:
            return adjustment
    
    # Default adjustment if no match
    return 1.0

def _fallback_prediction(title: str, experience_years: float, location: str = None, is_senior: int = 0, is_manager: int = 0) -> Dict[str, Any]:
    """Fallback prediction when model is unavailable"""
    # Base salary by experience and title
    base_salary = 0
    title_lower = title.lower()
    
    # Use is_senior and is_manager if provided
    if is_manager == 1 or any(term in title_lower for term in ['manager', 'director', 'chief', 'head']):
        base_salary = 75000
    elif is_senior == 1 or any(term in title_lower for term in ['senior', 'lead']) or experience_years > 5:
        base_salary = 60000
    elif any(term in title_lower for term in ['mid', 'developer', 'engineer']) or experience_years > 2:
        base_salary = 40000
    else:
        base_salary = 30000
    
    # Adjust for data/ML roles
    if any(term in title_lower for term in ['data', 'machine learning', 'ai', 'intelligence']):
        base_salary *= 1.15
    
    # Adjust for location
    location_multiplier = 1.0
    if location:
        location_multiplier = _get_location_adjustment(location)
    
    min_salary = int(base_salary * location_multiplier * 0.9)
    max_salary = int(base_salary * location_multiplier * 1.2)
    
    return {
        'min': min_salary,
        'max': max_salary,
        'predicted': int(base_salary * location_multiplier),
        'currency': 'MAD',
        'confidence': 0.6  # Lower confidence for fallback
    }

def get_department_categories():
    """Return list of standardized department categories"""
    return list(set(DEPARTMENT_CATEGORIES.values()))

if __name__ == "__main__":
    """Command line interface for salary prediction"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Predict job salary")
    parser.add_argument("--title", type=str, required=True, help="Job title")
    parser.add_argument("--dept_category", type=str, help="Department category")
    parser.add_argument("--experience", type=float, default=0, help="Years of experience")
    parser.add_argument("--remote", action="store_true", help="Remote job")
    parser.add_argument("--hybrid", action="store_true", help="Hybrid job")
    parser.add_argument("--contract", action="store_true", help="Contract job")
    parser.add_argument("--location", type=str, help="Job location")
    parser.add_argument("--skills", type=int, default=5, help="Number of skills")
    
    args = parser.parse_args()
    
    result = predict_job_salary(
        title=args.title,
        dept_category=args.dept_category,
        experience_years=args.experience,
        is_remote=1 if args.remote else 0,
        is_hybrid=1 if args.hybrid else 0,
        is_contract=1 if args.contract else 0,
        is_fulltime=0 if args.contract else 1,
        skills_count=args.skills,
        location=args.location
    )
    
    print(f"Predicted salary: {result['predicted']:,} {result['currency']}")
    print(f"Range: {result['min']:,} - {result['max']:,} {result['currency']}")
    print(f"Confidence: {result['confidence'] * 100:.1f}%") 