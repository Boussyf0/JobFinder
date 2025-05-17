#!/usr/bin/env python3
"""
Validate Salary Prediction Model

This script visualizes and validates the performance of the salary prediction model
by generating predictions for various job profiles and comparing them with actual data.

Usage:
    python validate_salary_model.py [--output-dir=path/to/output] [--samples=100]

Options:
    --output-dir    Directory to save visualizations (default: adzuna_data/models)
    --samples       Number of random samples to use (default: 100)
"""

import os
import sys
import argparse
import logging
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

# Import our model update module for data preparation
from update_salary_model import (
    load_and_process_data, standardize_department, is_senior, is_junior,
    is_manager, extract_experience_years, extract_skills_count, is_remote,
    DEPARTMENT_CATEGORIES
)

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
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "adzuna_data")
MODELS_DIR = os.path.join(DATA_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "salary_predictor.pkl")

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Validate salary prediction model')
    parser.add_argument('--output-dir', type=str, default=MODELS_DIR,
                        help='Directory to save visualizations')
    parser.add_argument('--samples', type=int, default=100,
                        help='Number of random samples to use')
    return parser.parse_args()

def load_model():
    """Load the trained salary prediction model."""
    try:
        if not os.path.exists(MODEL_PATH):
            logger.error(f"Model file not found: {MODEL_PATH}")
            return None
            
        logger.info(f"Loading model from {MODEL_PATH}")
        model = joblib.load(MODEL_PATH)
        return model
    
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return None

def create_evaluation_sample(data, n_samples=100):
    """Create a random sample for model evaluation."""
    if len(data) <= n_samples:
        return data
    
    # Randomly sample rows
    return data.sample(n=n_samples, random_state=42)

def create_sample_jobs():
    """Create sample job profiles to test model predictions."""
    job_profiles = [
        {
            'title': 'Junior Software Developer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 1,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 3,
            'is_senior': 0,
            'is_junior': 1,
            'is_manager': 0
        },
        {
            'title': 'Mid-level Software Engineer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 3,
            'is_remote': 0,
            'is_hybrid': 1,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Senior Software Engineer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 7,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 8,
            'is_senior': 1,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Senior Software Engineer (Remote)',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 7,
            'is_remote': 1,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 8,
            'is_senior': 1,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Data Scientist',
            'dept_category': 'Data Science',
            'job_type': 'full_time',
            'experience_years': 3,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Senior Data Scientist',
            'dept_category': 'Data Science',
            'job_type': 'full_time',
            'experience_years': 6,
            'is_remote': 1,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 8,
            'is_senior': 1,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'DevOps Engineer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 4,
            'is_remote': 1,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 7,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Frontend Developer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 2,
            'is_remote': 0,
            'is_hybrid': 1,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 4,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Engineering Manager',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 8,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 6,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 1
        },
        {
            'title': 'Chief Technology Officer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 12,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 10,
            'is_senior': 1,
            'is_junior': 0,
            'is_manager': 1
        },
        {
            'title': 'Marketing Specialist',
            'dept_category': 'Marketing',
            'job_type': 'full_time',
            'experience_years': 3,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 4,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Electrical Engineer',
            'dept_category': 'Electrical Engineering',
            'job_type': 'full_time',
            'experience_years': 5,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Civil Engineer',
            'dept_category': 'Civil Engineering',
            'job_type': 'full_time',
            'experience_years': 4,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 4,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Finance Analyst',
            'dept_category': 'Finance & Accounting',
            'job_type': 'full_time',
            'experience_years': 3,
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 3,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Freelance Web Developer',
            'dept_category': 'IT & Technology',
            'job_type': 'freelance',
            'experience_years': 3,
            'is_remote': 1,
            'is_hybrid': 0,
            'is_fulltime': 0,
            'is_contract': 1,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        }
    ]
    
    return pd.DataFrame(job_profiles)

def plot_prediction_vs_actual(y_true, y_pred, output_dir):
    """Create a scatter plot of predicted vs actual salaries."""
    plt.figure(figsize=(10, 8))
    plt.scatter(y_true, y_pred, alpha=0.5)
    
    # Add perfect prediction line
    min_val = min(min(y_true), min(y_pred))
    max_val = max(max(y_true), max(y_pred))
    plt.plot([min_val, max_val], [min_val, max_val], 'r--')
    
    plt.xlabel('Actual Salary')
    plt.ylabel('Predicted Salary')
    plt.title('Predicted vs Actual Salary')
    
    # Add metrics to plot
    mae = mean_absolute_error(y_true, y_pred)
    rmse = mean_squared_error(y_true, y_pred, squared=False)
    r2 = r2_score(y_true, y_pred)
    
    metrics_text = f'MAE: {mae:.2f}\nRMSE: {rmse:.2f}\nR²: {r2:.2f}'
    plt.annotate(metrics_text, xy=(0.05, 0.95), xycoords='axes fraction', 
                 bbox=dict(boxstyle="round,pad=0.5", facecolor="white", alpha=0.8))
    
    # Save plot
    output_path = os.path.join(output_dir, 'salary_prediction_scatter.png')
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    
    logger.info(f"Scatter plot saved to {output_path}")

def plot_error_distribution(y_true, y_pred, output_dir):
    """Create a histogram of prediction errors."""
    errors = y_pred - y_true
    
    plt.figure(figsize=(10, 6))
    sns.histplot(errors, kde=True)
    plt.axvline(x=0, color='r', linestyle='--')
    
    plt.xlabel('Prediction Error')
    plt.ylabel('Frequency')
    plt.title('Distribution of Prediction Errors')
    
    # Add summary statistics
    mean_error = np.mean(errors)
    std_error = np.std(errors)
    stats_text = f'Mean Error: {mean_error:.2f}\nStd Deviation: {std_error:.2f}'
    
    plt.annotate(stats_text, xy=(0.05, 0.95), xycoords='axes fraction',
                 bbox=dict(boxstyle="round,pad=0.5", facecolor="white", alpha=0.8))
    
    # Save plot
    output_path = os.path.join(output_dir, 'error_distribution.png')
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    
    logger.info(f"Error distribution plot saved to {output_path}")

def plot_feature_importance(model, feature_names, output_dir):
    """Create a bar chart of feature importances."""
    # Get feature importances if available (for tree-based models)
    if hasattr(model, 'named_steps') and hasattr(model.named_steps.get('regressor', None), 'feature_importances_'):
        # For pipeline with feature preprocessor, we need to map the importances back to original features
        # This is a simplified approach and might not work for all pipelines
        importances = model.named_steps['regressor'].feature_importances_
        
        plt.figure(figsize=(12, 8))
        
        # Sort importances and feature names together
        indices = np.argsort(importances)[::-1]
        sorted_importances = importances[indices]
        sorted_features = np.array(feature_names)[indices]
        
        # Plot top 15 features or all if less
        top_n = min(15, len(sorted_features))
        plt.barh(range(top_n), sorted_importances[:top_n], align='center')
        plt.yticks(range(top_n), sorted_features[:top_n])
        
        plt.xlabel('Feature Importance')
        plt.title('Feature Importance (Top 15)')
        
        # Save plot
        output_path = os.path.join(output_dir, 'feature_importance.png')
        plt.tight_layout()
        plt.savefig(output_path)
        plt.close()
        
        logger.info(f"Feature importance plot saved to {output_path}")
    else:
        logger.warning("Model does not have feature_importances_ attribute, skipping importance plot")

def plot_salary_by_experience(model, output_dir):
    """Create a line plot of predicted salary vs experience for different roles."""
    # Create experience range
    experience_range = np.arange(0, 16, 1)
    
    # Create sample job profiles
    profiles = [
        {
            'title': 'Software Engineer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Data Scientist',
            'dept_category': 'Data Science',
            'job_type': 'full_time',
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Electrical Engineer',
            'dept_category': 'Electrical Engineering',
            'job_type': 'full_time',
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Marketing Specialist',
            'dept_category': 'Marketing',
            'job_type': 'full_time',
            'is_remote': 0,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 4,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        }
    ]
    
    plt.figure(figsize=(12, 8))
    
    for profile in profiles:
        predictions = []
        
        for exp in experience_range:
            # Create a copy of profile with current experience
            job = profile.copy()
            job['experience_years'] = exp
            
            # Convert to DataFrame for prediction
            job_df = pd.DataFrame([job])
            
            # Make prediction
            try:
                pred = model.predict(job_df)[0]
                predictions.append(pred)
            except Exception as e:
                logger.error(f"Error predicting for {profile['title']} with {exp} years: {e}")
                predictions.append(np.nan)
        
        # Plot predictions
        plt.plot(experience_range, predictions, marker='o', label=f"{profile['title']}")
    
    plt.xlabel('Years of Experience')
    plt.ylabel('Predicted Salary (MAD)')
    plt.title('Predicted Salary vs Experience by Role')
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.legend()
    
    # Save plot
    output_path = os.path.join(output_dir, 'salary_by_experience.png')
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    
    logger.info(f"Salary by experience plot saved to {output_path}")

def plot_salary_by_department(model, output_dir):
    """Create a bar chart of predicted salaries by department."""
    # Create sample profiles with same experience level across departments
    departments = list(set([v for v in DEPARTMENT_CATEGORIES.values()]))
    
    # Base profile
    base_profile = {
        'experience_years': 5,
        'job_type': 'full_time',
        'is_remote': 0,
        'is_hybrid': 0,
        'is_fulltime': 1,
        'is_contract': 0,
        'skills_count': 5,
        'is_senior': 0,
        'is_junior': 0,
        'is_manager': 0
    }
    
    predictions = []
    
    for dept in departments:
        profile = base_profile.copy()
        profile['dept_category'] = dept
        profile['title'] = f"{dept} Professional"
        
        # Convert to DataFrame for prediction
        job_df = pd.DataFrame([profile])
        
        # Make prediction
        try:
            pred = model.predict(job_df)[0]
            predictions.append((dept, pred))
        except Exception as e:
            logger.error(f"Error predicting for {dept}: {e}")
    
    # Sort by prediction
    predictions.sort(key=lambda x: x[1], reverse=True)
    
    # Create plot
    plt.figure(figsize=(12, 8))
    
    depts = [p[0] for p in predictions]
    salaries = [p[1] for p in predictions]
    
    plt.barh(depts, salaries)
    plt.xlabel('Predicted Salary (MAD)')
    plt.title('Predicted Salary by Department (5 Years Experience)')
    
    # Format salary labels
    for i, salary in enumerate(salaries):
        plt.text(salary + 1000, i, f"{salary:,.0f}", va='center')
    
    # Save plot
    output_path = os.path.join(output_dir, 'salary_by_department.png')
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    
    logger.info(f"Salary by department plot saved to {output_path}")

def plot_remote_impact(model, output_dir):
    """Create a bar chart showing impact of remote work on salary."""
    # Create profiles with and without remote
    profiles = [
        {
            'title': 'Software Engineer',
            'dept_category': 'IT & Technology',
            'job_type': 'full_time',
            'experience_years': 5,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Data Scientist',
            'dept_category': 'Data Science',
            'job_type': 'full_time',
            'experience_years': 5,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 5,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        },
        {
            'title': 'Marketing Specialist',
            'dept_category': 'Marketing',
            'job_type': 'full_time',
            'experience_years': 5,
            'is_hybrid': 0,
            'is_fulltime': 1,
            'is_contract': 0,
            'skills_count': 4,
            'is_senior': 0,
            'is_junior': 0,
            'is_manager': 0
        }
    ]
    
    results = []
    
    for profile in profiles:
        # Create onsite profile
        onsite_profile = profile.copy()
        onsite_profile['is_remote'] = 0
        
        # Create remote profile
        remote_profile = profile.copy()
        remote_profile['is_remote'] = 1
        
        # Convert to DataFrame for prediction
        onsite_df = pd.DataFrame([onsite_profile])
        remote_df = pd.DataFrame([remote_profile])
        
        # Make predictions
        try:
            onsite_pred = model.predict(onsite_df)[0]
            remote_pred = model.predict(remote_df)[0]
            
            results.append({
                'title': profile['title'],
                'onsite_salary': onsite_pred,
                'remote_salary': remote_pred,
                'difference': remote_pred - onsite_pred,
                'percent_change': (remote_pred - onsite_pred) / onsite_pred * 100
            })
        except Exception as e:
            logger.error(f"Error predicting for {profile['title']}: {e}")
    
    # Create plot
    plt.figure(figsize=(12, 8))
    
    titles = [r['title'] for r in results]
    onsite = [r['onsite_salary'] for r in results]
    remote = [r['remote_salary'] for r in results]
    
    x = np.arange(len(titles))
    width = 0.35
    
    plt.bar(x - width/2, onsite, width, label='Onsite')
    plt.bar(x + width/2, remote, width, label='Remote')
    
    plt.axhline(y=0, color='k', linestyle='-', alpha=0.3)
    plt.xlabel('Job Title')
    plt.ylabel('Predicted Salary (MAD)')
    plt.title('Impact of Remote Work on Salary')
    plt.xticks(x, titles)
    plt.legend()
    
    # Add percent change labels
    for i, r in enumerate(results):
        plt.text(i, max(r['onsite_salary'], r['remote_salary']) + 2000, 
                 f"{r['percent_change']:.1f}%", ha='center')
    
    # Save plot
    output_path = os.path.join(output_dir, 'remote_impact.png')
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    
    logger.info(f"Remote impact plot saved to {output_path}")

def validate_model(model, output_dir):
    """Validate model with various visualizations."""
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Load and process data
    logger.info("Loading data for validation")
    data = load_and_process_data()
    
    if data is None or len(data) == 0:
        logger.error("No data available for validation")
        return False
    
    # Create sample for evaluation
    eval_sample = create_evaluation_sample(data)
    
    # Prepare features and target
    X = eval_sample.drop('salary', axis=1)
    y = eval_sample['salary']
    
    # Get predictions
    logger.info("Generating predictions for validation sample")
    try:
        y_pred = model.predict(X)
        
        # Create scatter plot
        logger.info("Creating prediction vs actual scatter plot")
        plot_prediction_vs_actual(y, y_pred, output_dir)
        
        # Create error distribution
        logger.info("Creating error distribution plot")
        plot_error_distribution(y, y_pred, output_dir)
        
        # Feature importance plot
        logger.info("Creating feature importance plot")
        feature_names = list(X.columns)
        plot_feature_importance(model, feature_names, output_dir)
    except Exception as e:
        logger.error(f"Error during validation plots: {e}")
    
    # Create salary by experience plot
    logger.info("Creating salary by experience plot")
    plot_salary_by_experience(model, output_dir)
    
    # Create salary by department plot
    logger.info("Creating salary by department plot")
    plot_salary_by_department(model, output_dir)
    
    # Create remote impact plot
    logger.info("Creating remote work impact plot")
    plot_remote_impact(model, output_dir)
    
    # Create sample job profiles table
    logger.info("Creating sample predictions for common job profiles")
    sample_jobs = create_sample_jobs()
    
    try:
        # Make predictions
        sample_jobs['predicted_salary'] = model.predict(sample_jobs)
        
        # Save to CSV
        output_path = os.path.join(output_dir, 'sample_predictions.csv')
        sample_jobs.to_csv(output_path, index=False)
        logger.info(f"Sample predictions saved to {output_path}")
        
        # Print sample predictions
        for _, job in sample_jobs.iterrows():
            logger.info(f"{job['title']}: {job['predicted_salary']:,.2f} MAD")
    
    except Exception as e:
        logger.error(f"Error predicting for sample jobs: {e}")
    
    return True

def main():
    """Main function."""
    args = parse_args()
    output_dir = args.output_dir
    
    logger.info("=" * 60)
    logger.info(f"Starting salary model validation at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Load model
    model = load_model()
    if model is None:
        return 1
    
    # Validate model
    success = validate_model(model, output_dir)
    
    if success:
        logger.info("Model validation completed successfully")
    else:
        logger.error("Model validation failed")
        return 1
    
    logger.info("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main()) 