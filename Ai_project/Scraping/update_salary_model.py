#!/usr/bin/env python3
"""
Update Salary Prediction Model

This script updates the salary prediction model using the latest job data.
It extracts features from the job listings, trains a new model, and saves it to disk.

Usage:
    python update_salary_model.py [--verbose] [--test-ratio=0.2]

Options:
    --verbose       Print detailed information during training
    --test-ratio    Ratio of data to use for testing (default: 0.2)
"""

import os
import sys
import argparse
import logging
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import lightgbm as lgb
import catboost as cb

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Paths
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "adzuna_data")
MODELS_DIR = os.path.join(DATA_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "salary_predictor.pkl")
OLD_MODEL_PATH = os.path.join(MODELS_DIR, "salary_predictor_old.pkl")

# Department categories for standardization
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

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Update salary prediction model')
    parser.add_argument('--verbose', action='store_true', help='Print detailed information')
    parser.add_argument('--test-ratio', type=float, default=0.2, 
                        help='Ratio of data to use for testing (default: 0.2)')
    return parser.parse_args()

def standardize_department(text):
    """Convert department text to standard category."""
    if not text or pd.isna(text):
        return "General"
        
    text = str(text).lower()
    
    # Try matching with department categories
    for key, category in DEPARTMENT_CATEGORIES.items():
        if key in text:
            return category
    
    return "General"

def extract_skills_count(text):
    """Count skills mentioned in text."""
    if not text or pd.isna(text):
        return 0
        
    # Common skills to look for
    skills = [
        'python', 'java', 'javascript', 'react', 'angular', 'vue', 'node', 
        'sql', 'nosql', 'mongodb', 'cassandra', 'aws', 'azure', 'gcp', 
        'docker', 'kubernetes', 'devops', 'ci/cd', 'git', 'machine learning',
        'ai', 'data science', 'agile', 'scrum', 'kanban', 'c++', 'c#', 'php'
    ]
    
    text = str(text).lower()
    count = sum(1 for skill in skills if skill in text)
    
    return min(count, 15)  # Cap at 15 to avoid outliers

def is_senior(title):
    """Check if job title is senior level."""
    if not title or pd.isna(title):
        return 0
        
    title = str(title).lower()
    senior_terms = ['senior', 'lead', 'sr', 'principal', 'head', 'chief']
    
    return 1 if any(term in title for term in senior_terms) else 0

def is_junior(title):
    """Check if job title is junior level."""
    if not title or pd.isna(title):
        return 0
        
    title = str(title).lower()
    junior_terms = ['junior', 'assistant', 'jr', 'entry', 'intern', 'stage']
    
    return 1 if any(term in title for term in junior_terms) else 0

def is_manager(title):
    """Check if job title is management level."""
    if not title or pd.isna(title):
        return 0
        
    title = str(title).lower()
    manager_terms = ['manager', 'director', 'head', 'chief', 'supervisor', 'lead']
    
    return 1 if any(term in title for term in manager_terms) else 0

def is_remote(text):
    """Check if job is remote friendly."""
    if not text or pd.isna(text):
        return 0
        
    text = str(text).lower()
    remote_terms = ['remote', 'télétravail', 'work from home', 'travail à distance']
    
    return 1 if any(term in text for term in remote_terms) else 0

def extract_experience_years(text):
    """Extract years of experience from text."""
    import re
    
    if not text or pd.isna(text):
        return 0
        
    text = str(text).lower()
    
    # Look for patterns like "X years experience" or "X+ years" or "X-Y years"
    patterns = [
        r'(\d+)(?:\s*-\s*\d+)?\s*(?:ans|years|year|an)(?:\s+experience|\s+d\'expérience)?',
        r'experience(?:\s+of|\s+d[e\']\s+|\:\s+)?(\d+)(?:\s*-\s*\d+)?\s*(?:ans|years|year|an)',
        r'expérience(?:\s+de|\s+d[e\']\s+|\:\s+)?(\d+)(?:\s*-\s*\d+)?\s*(?:ans|years|year|an)',
        r'(\d+)(?:\s*\+\s*)(?:ans|years|year|an)(?:\s+experience|\s+d\'expérience)?',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                pass
    
    # Default values based on job level
    if is_senior(text):
        return 5.0
    elif is_manager(text):
        return 7.0
    elif is_junior(text):
        return 1.0
    
    return 3.0  # Default middle experience

def load_and_process_data(verbose=False):
    """Load job data from CSV files and prepare for model training."""
    # Ensure models directory exists
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    # Get all CSV files in data directory
    csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
    
    if verbose:
        logger.info(f"Found {len(csv_files)} CSV files in {DATA_DIR}")
    
    if not csv_files:
        logger.error(f"No CSV files found in {DATA_DIR}")
        return None
    
    # Load and concatenate all CSV files
    dataframes = []
    for file in csv_files:
        try:
            file_path = os.path.join(DATA_DIR, file)
            df = pd.read_csv(file_path)
            
            if verbose:
                logger.info(f"Loaded {len(df)} rows from {file}")
                
            dataframes.append(df)
        except Exception as e:
            logger.warning(f"Error loading {file}: {e}")
    
    if not dataframes:
        logger.error("No data could be loaded from CSV files")
        return None
    
    # Combine all dataframes
    jobs_df = pd.concat(dataframes, ignore_index=True)
    
    # Remove duplicates
    original_count = len(jobs_df)
    jobs_df = jobs_df.drop_duplicates(subset=['title', 'company', 'location'], keep='first')
    
    if verbose:
        logger.info(f"Removed {original_count - len(jobs_df)} duplicate entries")
        logger.info(f"Total jobs for analysis: {len(jobs_df)}")
    
    # Extract salary information
    salary_data = []
    for _, job in jobs_df.iterrows():
        # Get salary information
        salary_min = job.get('salary_min')
        salary_max = job.get('salary_max')
        
        # Skip jobs without salary information
        if pd.isna(salary_min) and pd.isna(salary_max):
            continue
            
        # Use average if both min and max are available
        if not pd.isna(salary_min) and not pd.isna(salary_max):
            salary = (salary_min + salary_max) / 2
        elif not pd.isna(salary_min):
            salary = salary_min
        else:
            salary = salary_max
            
        # Skip unrealistic salaries
        if salary < 10000 or salary > 200000:
            continue
            
        # Get or derive job features
        title = job.get('title', '')
        description = job.get('description', '')
        department = job.get('specialty', job.get('category', ''))
        location = job.get('location', '')
        
        # Determine department
        dept_category = standardize_department(department)
        
        # Determine job type
        job_type = job.get('job_type', job.get('contract_type', ''))
        if pd.isna(job_type) or not job_type:
            job_type = 'full_time'  # Default
        job_type = str(job_type).lower()
        
        # Extract experience
        experience_years = extract_experience_years(description)
        
        # Remote status
        remote_friendly = 1 if job.get('remote_friendly', False) else is_remote(description)
        
        # Is hybrid
        is_hybrid = 0
        if 'hybrid' in str(description).lower() or 'hybride' in str(description).lower():
            is_hybrid = 1
            
        # Common job types
        is_fulltime = 1 if 'full' in job_type or 'cdi' in job_type else 0
        is_contract = 1 if 'contract' in job_type or 'cdd' in job_type or 'freelance' in job_type else 0
        
        # Skills count
        skills_count = extract_skills_count(description)
        
        # Job level
        is_senior_role = is_senior(title)
        is_junior_role = is_junior(title)
        is_manager_role = is_manager(title)
        
        # Add to salary data
        salary_data.append({
            'salary': salary,
            'dept_category': dept_category,
            'job_type': job_type,
            'experience_years': experience_years,
            'is_remote': remote_friendly,
            'is_hybrid': is_hybrid,
            'is_fulltime': is_fulltime,
            'is_contract': is_contract,
            'skills_count': skills_count,
            'is_senior': is_senior_role,
            'is_junior': is_junior_role,
            'is_manager': is_manager_role
        })
    
    # Create dataframe
    salary_df = pd.DataFrame(salary_data)
    
    if verbose:
        logger.info(f"Extracted {len(salary_df)} records with salary information")
        logger.info(f"Average salary: {salary_df['salary'].mean():.2f}")
        logger.info(f"Salary range: {salary_df['salary'].min():.2f} - {salary_df['salary'].max():.2f}")
        logger.info(f"Department categories: {salary_df['dept_category'].unique()}")
    
    return salary_df

def train_model(data, test_ratio=0.2, verbose=False):
    """Train a salary prediction model using the provided data."""
    if data is None or len(data) == 0:
        logger.error("No data provided for training")
        return None
    
    # Split features and target
    X = data.drop('salary', axis=1)
    y = data['salary']
    
    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_ratio, random_state=42
    )
    
    if verbose:
        logger.info(f"Training set size: {len(X_train)}")
        logger.info(f"Testing set size: {len(X_test)}")
    
    # Define categorical and numerical features
    categorical_features = ['dept_category', 'job_type']
    numerical_features = ['experience_years', 'is_remote', 'is_hybrid', 'is_fulltime', 
                          'is_contract', 'skills_count', 'is_senior', 'is_junior', 'is_manager']
    
    # Create preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ]
    )
    
    # Create model pipelines
    rf_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(random_state=42))
    ])
    
    # Gradient Boosting pipeline
    gbm_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', GradientBoostingRegressor(random_state=42))
    ])
    
    # Ridge Regression pipeline
    ridge_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', Ridge(random_state=42))
    ])
    
    # XGBoost pipeline
    xgb_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', xgb.XGBRegressor(random_state=42))
    ])
    
    # LightGBM pipeline
    lgb_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', lgb.LGBMRegressor(random_state=42))
    ])
    
    # CatBoost pipeline
    cat_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', cb.CatBoostRegressor(random_state=42, verbose=False))
    ])
    
    # Define parameter grids for tuning
    rf_param_grid = {
        'regressor__n_estimators': [50, 100],
        'regressor__max_depth': [10, 20, None],
    }
    
    gbm_param_grid = {
        'regressor__n_estimators': [100, 200],
        'regressor__learning_rate': [0.05, 0.1],
        'regressor__max_depth': [3, 5]
    }
    
    ridge_param_grid = {
        'regressor__alpha': [0.1, 1.0, 10.0],
    }
    
    xgb_param_grid = {
        'regressor__n_estimators': [100, 200],
        'regressor__learning_rate': [0.05, 0.1],
        'regressor__max_depth': [3, 5]
    }
    
    lgb_param_grid = {
        'regressor__n_estimators': [100, 200],
        'regressor__learning_rate': [0.05, 0.1],
        'regressor__num_leaves': [31, 63]
    }
    
    cat_param_grid = {
        'regressor__iterations': [100, 200],
        'regressor__learning_rate': [0.05, 0.1],
        'regressor__depth': [4, 6]
    }
    
    # Find best model with cross-validation
    if verbose:
        logger.info("Training Random Forest model...")
        
    rf_search = GridSearchCV(rf_pipeline, rf_param_grid, cv=3, scoring='neg_mean_absolute_error')
    rf_search.fit(X_train, y_train)
    
    if verbose:
        logger.info("Training Gradient Boosting model...")
    
    gbm_search = GridSearchCV(gbm_pipeline, gbm_param_grid, cv=3, scoring='neg_mean_absolute_error')
    gbm_search.fit(X_train, y_train)
    
    if verbose:
        logger.info("Training Ridge Regression model...")
        
    ridge_search = GridSearchCV(ridge_pipeline, ridge_param_grid, cv=3, scoring='neg_mean_absolute_error')
    ridge_search.fit(X_train, y_train)
    
    if verbose:
        logger.info("Training XGBoost model...")
    
    xgb_search = GridSearchCV(xgb_pipeline, xgb_param_grid, cv=3, scoring='neg_mean_absolute_error')
    xgb_search.fit(X_train, y_train)
    
    if verbose:
        logger.info("Training LightGBM model...")
    
    lgb_search = GridSearchCV(lgb_pipeline, lgb_param_grid, cv=3, scoring='neg_mean_absolute_error')
    lgb_search.fit(X_train, y_train)
    
    if verbose:
        logger.info("Training CatBoost model...")
    
    cat_search = GridSearchCV(cat_pipeline, cat_param_grid, cv=3, scoring='neg_mean_absolute_error')
    cat_search.fit(X_train, y_train)
    
    # Select best model
    rf_score = -rf_search.best_score_
    gbm_score = -gbm_search.best_score_
    ridge_score = -ridge_search.best_score_
    xgb_score = -xgb_search.best_score_
    lgb_score = -lgb_search.best_score_
    cat_score = -cat_search.best_score_
    
    if verbose:
        logger.info(f"Random Forest MAE: {rf_score:.2f}")
        logger.info(f"Gradient Boosting MAE: {gbm_score:.2f}")
        logger.info(f"Ridge Regression MAE: {ridge_score:.2f}")
        logger.info(f"XGBoost MAE: {xgb_score:.2f}")
        logger.info(f"LightGBM MAE: {lgb_score:.2f}")
        logger.info(f"CatBoost MAE: {cat_score:.2f}")
    
    # Find the model with the lowest MAE
    scores = [rf_score, gbm_score, ridge_score, xgb_score, lgb_score, cat_score]
    models = [rf_search.best_estimator_, gbm_search.best_estimator_, ridge_search.best_estimator_, 
              xgb_search.best_estimator_, lgb_search.best_estimator_, cat_search.best_estimator_]
    model_names = ["Random Forest", "Gradient Boosting", "Ridge Regression", 
                   "XGBoost", "LightGBM", "CatBoost"]
    
    best_index = scores.index(min(scores))
    best_model = models[best_index]
    model_type = model_names[best_index]
    
    # Evaluate on test set
    y_pred = best_model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = mean_squared_error(y_test, y_pred, squared=False)
    r2 = r2_score(y_test, y_pred)
    
    logger.info(f"Selected model: {model_type}")
    logger.info(f"Test MAE: {mae:.2f}")
    logger.info(f"Test RMSE: {rmse:.2f}")
    logger.info(f"Test R² Score: {r2:.4f}")
    
    # Calculate percentage error
    pct_error = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    logger.info(f"Average percentage error: {pct_error:.2f}%")
    
    return best_model

def save_model(model):
    """Save the trained model to disk."""
    if model is None:
        logger.error("No model to save")
        return False
    
    try:
        # Backup existing model if it exists
        if os.path.exists(MODEL_PATH):
            os.rename(MODEL_PATH, OLD_MODEL_PATH)
            logger.info(f"Backed up existing model to {OLD_MODEL_PATH}")
        
        # Save new model
        joblib.dump(model, MODEL_PATH)
        logger.info(f"Saved new model to {MODEL_PATH}")
        return True
    
    except Exception as e:
        logger.error(f"Error saving model: {e}")
        return False

def main():
    """Main function."""
    args = parse_args()
    verbose = args.verbose
    test_ratio = args.test_ratio
    
    if verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("=" * 60)
    logger.info(f"Starting salary model update at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Load and process data
    logger.info("Loading and processing job data...")
    data = load_and_process_data(verbose)
    
    if data is None or len(data) == 0:
        logger.error("Failed to load or process data. Exiting.")
        return 1
    
    # Train model
    logger.info("Training salary prediction model...")
    model = train_model(data, test_ratio, verbose)
    
    if model is None:
        logger.error("Failed to train model. Exiting.")
        return 1
    
    # Save model
    logger.info("Saving trained model...")
    if not save_model(model):
        logger.error("Failed to save model. Exiting.")
        return 1
    
    logger.info("Salary prediction model updated successfully")
    logger.info("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main()) 