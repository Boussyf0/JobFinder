#!/usr/bin/env python3
"""
Market Insights Data Generator

This script analyzes job market data and generates comprehensive insights 
for the market insights dashboard, including:
- Salary trends by role/industry
- Job distribution by industry/category
- Skills demand analysis
- Location-based job distribution
- Remote vs. on-site job trends
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from collections import Counter
from typing import Dict, List, Any
import re
from datetime import datetime

# Constants for analysis
ENGINEERING_FIELDS = {
    "Ingénierie Informatique et Réseaux": "IT & Technology",
    "Génie Électrique et Systèmes Intelligents": "Electrical Engineering",
    "Génie Industriel": "Industrial Engineering",
    "Génie Civil et BTP": "Civil Engineering",
    "Génie Mécanique": "Mechanical Engineering"
}

SKILLS_CATEGORIES = {
    "programming": ["python", "java", "javascript", "c++", "c#", "php", "ruby", "go", "typescript", 
                   "swift", "kotlin", "rust", "scala", "perl", "r"],
    "web_dev": ["react", "angular", "vue", "html", "css", "jquery", "node.js", "express", "django", 
               "flask", "laravel", "wordpress", "frontend", "backend", "fullstack"],
    "data": ["sql", "nosql", "postgresql", "mysql", "mongodb", "elasticsearch", "database", 
            "data analysis", "data science", "machine learning", "ai", "big data", "etl", "hadoop", 
            "spark", "tableau", "power bi"],
    "devops": ["aws", "azure", "gcp", "cloud", "docker", "kubernetes", "jenkins", "ci/cd", "terraform", 
              "ansible", "chef", "puppet", "linux", "unix", "bash"],
    "tools": ["git", "github", "gitlab", "svn", "jira", "confluence", "slack", "scrum", "agile", 
             "kanban", "waterfall"],
    "networking": ["réseau", "network", "cisco", "routing", "switching", "firewall", "vpn", "security"]
}

def log(message):
    """Log messages with timestamps"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")

def load_job_data(csv_path):
    """Load job data from CSV file"""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"File not found: {csv_path}")
    
    log(f"Loading job data from {csv_path}")
    df = pd.read_csv(csv_path)
    log(f"Loaded {len(df)} job records")
    return df

def clean_and_transform_data(df):
    """Clean and transform data for analysis"""
    log("Cleaning and transforming data...")
    
    # Make a copy to avoid modifying the original
    clean_df = df.copy()
    
    # Standardize columns
    if 'speciality' in clean_df.columns:
        clean_df['category'] = clean_df['speciality'].map(
            lambda x: ENGINEERING_FIELDS.get(x, "Other"))
    
    # Extract skills from description and title
    clean_df['extracted_skills'] = clean_df.apply(
        lambda row: extract_skills(row['title'] + " " + 
                                  (row['description'] if pd.notna(row['description']) else "")), 
        axis=1)
    
    # Extract locations
    clean_df['location_clean'] = clean_df.apply(
        lambda row: extract_location(row['summary'] if pd.notna(row['summary']) else ""), 
        axis=1)
    
    # Determine job type (remote, on-site)
    clean_df['is_remote'] = clean_df.apply(
        lambda row: detect_remote(row['title'] + " " + 
                                 (row['description'] if pd.notna(row['description']) else "")), 
        axis=1)
    
    log("Data cleaning and transformation complete")
    return clean_df

def extract_skills(text):
    """Extract skills from job text"""
    if not isinstance(text, str):
        return []
    
    text = text.lower()
    skills = []
    
    # Extract skills from all categories
    for category, skill_list in SKILLS_CATEGORIES.items():
        for skill in skill_list:
            if re.search(r'\b' + re.escape(skill) + r'\b', text):
                skills.append(skill)
    
    return list(set(skills))  # Remove duplicates

def extract_location(text):
    """Extract location from job text"""
    if not isinstance(text, str):
        return "Unknown"
    
    text = text.lower()
    
    # Common Morocco cities
    cities = ["casablanca", "rabat", "marrakech", "tanger", "tangier", "fes", "fez", 
              "meknes", "agadir", "oujda", "kenitra", "tetouan"]
    
    for city in cities:
        if city in text:
            return city.title()
    
    # If no city found, check if Morocco is mentioned
    if "maroc" in text or "morocco" in text:
        return "Morocco"
    
    return "Unknown"

def detect_remote(text):
    """Detect if a job is remote"""
    if not isinstance(text, str):
        return False
    
    text = text.lower()
    remote_indicators = ["remote", "télétravail", "work from home", "wfh", "à distance", "virtuel"]
    
    for indicator in remote_indicators:
        if indicator in text:
            return True
    
    return False

def generate_salary_insights(df):
    """Generate salary insights by role"""
    log("Generating salary insights...")
    
    # Extract job roles from titles
    roles = {
        "developer": ["développeur", "developer", "développement", "development", "software engineer", "ingénieur logiciel"],
        "data_scientist": ["data scientist", "data analyst", "analyste de données", "machine learning"],
        "devops": ["devops", "sre", "reliability", "infrastructure"],
        "network_engineer": ["réseaux", "network", "réseau", "networking"],
        "security": ["sécurité", "security", "cybersecurity", "cybersécurité"],
        "project_manager": ["chef de projet", "project manager", "product manager", "gestion de projet"],
        "designer": ["designer", "ux", "ui", "user experience", "design"],
        "qa": ["quality", "qualité", "test", "qa", "assurance qualité"],
    }
    
    # Artificial salary data - would be replaced with real data if available
    salary_data = [
        {"name": "Junior Dev", "salary": 53213},
        {"name": "Mid-level Dev", "salary": 78189},
        {"name": "Senior Dev", "salary": 96273},
        {"name": "DevOps", "salary": 72840},
        {"name": "Data Scientist", "salary": 90450},
        {"name": "Network Engineer", "salary": 65780},
        {"name": "Project Manager", "salary": 86585},
        {"name": "UX/UI Designer", "salary": 68940},
        {"name": "QA Engineer", "salary": 60120},
        {"name": "Security Engineer", "salary": 88930},
        {"name": "Engineering Manager", "salary": 107000},
        {"name": "CTO", "salary": 121879},
    ]
    
    return salary_data

def generate_job_distribution(df):
    """Generate job distribution by category"""
    log("Generating job distribution by category...")
    
    if 'category' in df.columns:
        category_counts = df['category'].value_counts()
        total = category_counts.sum()
        
        # Convert to percentage and format for the chart
        distribution = []
        for category, count in category_counts.items():
            if pd.notna(category):
                distribution.append({
                    "name": category,
                    "value": round((count / total) * 100)
                })
        
        return sorted(distribution, key=lambda x: x["value"], reverse=True)
    
    # If no category column, use fixed data
    return [
        {"name": "IT & Technology", "value": 45},
        {"name": "Electrical Engineering", "value": 15},
        {"name": "Industrial Engineering", "value": 12},
        {"name": "Civil Engineering", "value": 10},
        {"name": "Mechanical Engineering", "value": 8},
        {"name": "Other", "value": 10},
    ]

def generate_skills_demand(df):
    """Generate skills demand analysis"""
    log("Analyzing skills demand...")
    
    # Flatten the skills lists from all jobs
    all_skills = []
    for skills_list in df['extracted_skills'].dropna():
        all_skills.extend(skills_list)
    
    # Count occurrence of each skill
    skill_counts = Counter(all_skills)
    
    # Get the top skills
    top_skills = []
    for skill, count in skill_counts.most_common(12):
        top_skills.append({
            "name": skill,
            "value": count
        })
    
    return top_skills

def generate_location_distribution(df):
    """Generate location-based job distribution"""
    log("Analyzing job distribution by location...")
    
    if 'location_clean' in df.columns:
        location_counts = df['location_clean'].value_counts()
        
        # Get the top locations
        top_locations = []
        
        # Convert to list to make it sliceable
        for i, (location, count) in enumerate(location_counts.items()):
            if i >= 8:  # Only take the top 8
                break
                
            if pd.notna(location) and location != "Unknown":
                top_locations.append({
                    "name": location,
                    "jobs": int(count)
                })
        
        return top_locations
    
    # Fixed data fallback
    return [
        {"name": "Casablanca", "jobs": 450},
        {"name": "Rabat", "jobs": 320},
        {"name": "Marrakech", "jobs": 180},
        {"name": "Tangier", "jobs": 150},
        {"name": "Agadir", "jobs": 90},
    ]

def generate_job_trends():
    """Generate job posting trends over time - simulated data"""
    log("Generating job posting trends...")
    
    # Simulate a trend with seasonality
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    # Create a seasonally adjusted trend that increases over time
    base = 1200
    growth_rate = 100
    seasonal_factor = [1.0, 1.1, 1.05, 1.2, 1.3, 1.4, 1.35, 1.5, 1.7, 1.8, 1.75, 1.6]
    
    trends = []
    for i, month in enumerate(months):
        jobs = int(base + (i * growth_rate) * seasonal_factor[i])
        trends.append({
            "month": month,
            "jobs": jobs
        })
    
    return trends

def calculate_remote_percentage(df):
    """Calculate percentage of remote jobs"""
    log("Calculating remote job percentage...")
    
    if 'is_remote' in df.columns:
        remote_count = df['is_remote'].sum()
        total_count = len(df)
        return round((remote_count / total_count) * 100)
    
    return 35  # Fixed fallback

def generate_model_metrics():
    """Generate metrics about the prediction model - simulated data"""
    log("Generating model performance metrics...")
    
    return {
        "modelType": "LightGBM",
        "r2Score": 0.2429,
        "mae": 26704.01,
        "percentError": 40.03,
    }

def generate_market_summary(df, salaries, locations, remote_percentage):
    """Generate market summary statistics"""
    log("Generating market summary...")
    
    total_jobs = len(df)
    
    # Calculate average salary from salary data
    avg_salary = int(np.mean([item["salary"] for item in salaries]))
    
    # Get the top location
    top_location = locations[0]["name"] if locations else "Casablanca"
    
    # IT market share - assume IT & Tech category
    it_market_share = 0
    if 'category' in df.columns:
        category_counts = df['category'].value_counts(normalize=True) * 100
        it_market_share = int(category_counts.get("IT & Technology", 45))
    else:
        it_market_share = 45  # Fixed fallback
    
    return {
        "totalJobs": total_jobs,
        "avgSalary": avg_salary,
        "itMarketShare": it_market_share,
        "topLocation": top_location,
        "remotePercentage": remote_percentage
    }

def generate_market_insights_data(csv_path=None):
    """Generate all market insights data"""
    log("Starting market insights data generation...")
    
    if not csv_path:
        csv_path = "adzuna_data/fixed/indeed_jobs_detailed.csv"
    
    # Load and process job data
    try:
        df = load_job_data(csv_path)
        df = clean_and_transform_data(df)
    except Exception as e:
        log(f"Error processing job data: {e}")
        log("Falling back to simulated data")
        # Create empty dataframe with basic columns
        df = pd.DataFrame(columns=['id', 'title', 'company', 'category'])
    
    # Generate insights
    salary_insights = generate_salary_insights(df)
    job_distribution = generate_job_distribution(df)
    job_trends = generate_job_trends()
    skill_demand = generate_skills_demand(df)
    location_distribution = generate_location_distribution(df)
    remote_percentage = calculate_remote_percentage(df)
    model_metrics = generate_model_metrics()
    
    # Generate summary
    summary = generate_market_summary(df, salary_insights, location_distribution, remote_percentage)
    
    # Compile all insights
    market_insights = {
        "summary": summary,
        "salaryByRole": salary_insights,
        "jobsByIndustry": job_distribution,
        "jobTrends": job_trends,
        "skillDemand": skill_demand,
        "topCities": location_distribution,
        "modelMetrics": model_metrics,
        "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "dataSource": os.path.basename(csv_path)
    }
    
    log("Market insights data generation complete")
    return market_insights

if __name__ == "__main__":
    # Path to CSV file - can be provided as command line argument
    csv_path = None
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    
    # Generate insights
    insights = generate_market_insights_data(csv_path)
    
    # Save to JSON file
    output_file = "market_insights.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(insights, f, ensure_ascii=False, indent=2)
    
    log(f"Market insights data saved to {output_file}")
    
    # Print summary
    print("\nMarket Insights Summary:")
    print(f"Total Jobs: {insights['summary']['totalJobs']}")
    print(f"Average Salary: {insights['summary']['avgSalary']} MAD")
    print(f"IT Market Share: {insights['summary']['itMarketShare']}%")
    print(f"Top Location: {insights['summary']['topLocation']}")
    print(f"Remote Jobs: {insights['summary']['remotePercentage']}%")
    print(f"Top Skills: {', '.join([skill['name'] for skill in insights['skillDemand'][:5]])}") 