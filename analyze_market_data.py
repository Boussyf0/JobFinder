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

def generate_salary_insights():
    """Generate salary insights by role"""
    log("Generating salary insights...")
    
    # Artificial salary data
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

def generate_job_distribution():
    """Generate job distribution by category"""
    log("Generating job distribution by category...")
    
    # Fixed simulated data
    return [
        {"name": "IT & Technology", "value": 45},
        {"name": "Electrical Engineering", "value": 15},
        {"name": "Industrial Engineering", "value": 12},
        {"name": "Civil Engineering", "value": 10},
        {"name": "Mechanical Engineering", "value": 8},
        {"name": "Other", "value": 10},
    ]

def generate_skills_demand():
    """Generate skills demand analysis"""
    log("Analyzing skills demand...")
    
    # Simulated skill demand data
    return [
        {"name": "Python", "value": 45},
        {"name": "JavaScript", "value": 42},
        {"name": "SQL", "value": 38},
        {"name": "Java", "value": 35},
        {"name": "React", "value": 32},
        {"name": "AWS", "value": 30},
        {"name": "Node.js", "value": 28},
        {"name": "Docker", "value": 25},
        {"name": "Git", "value": 22},
        {"name": "Linux", "value": 20},
        {"name": "Kubernetes", "value": 18},
        {"name": "TypeScript", "value": 15}
    ]

def generate_location_distribution():
    """Generate location-based job distribution"""
    log("Analyzing job distribution by location...")
    
    # Fixed data
    return [
        {"name": "Casablanca", "jobs": 450},
        {"name": "Rabat", "jobs": 320},
        {"name": "Marrakech", "jobs": 180},
        {"name": "Tangier", "jobs": 150},
        {"name": "Agadir", "jobs": 90},
        {"name": "Fez", "jobs": 85},
        {"name": "Oujda", "jobs": 70},
        {"name": "Kenitra", "jobs": 65}
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

def calculate_remote_percentage():
    """Calculate percentage of remote jobs"""
    log("Calculating remote job percentage...")
    
    return 35  # Fixed fallback

def generate_model_metrics():
    """Generate metrics about the prediction model - simulated data"""
    log("Generating model performance metrics...")
    
    return {
        "modelType": "LightGBM",
        "r2Score": 0.2429,
        "mae": 26704.01,
        "percentError": 40.03,
        "accuracy": 0.85,
        "importantFeatures": [
            {"name": "Experience Years", "importance": 0.35},
            {"name": "Industry", "importance": 0.25},
            {"name": "Location", "importance": 0.20},
            {"name": "Education Level", "importance": 0.15},
            {"name": "Company Size", "importance": 0.05}
        ]
    }

def generate_market_summary(salaries, locations, remote_percentage):
    """Generate market summary statistics"""
    log("Generating market summary...")
    
    # Simulated data
    total_jobs = 15000
    
    # Calculate average salary from salary data
    avg_salary = int(np.mean([item["salary"] for item in salaries]))
    
    # Get the top location
    top_location = locations[0]["name"] if locations else "Casablanca"
    
    # IT market share - assume IT & Tech category
    it_market_share = 45  # Fixed value
    
    return {
        "totalJobs": total_jobs,
        "avgSalary": avg_salary,
        "itMarketShare": it_market_share,
        "topLocation": top_location,
        "remotePercentage": remote_percentage
    }

def generate_market_insights_data():
    """Generate all market insights data"""
    log("Starting market insights data generation...")
    
    # Generate insights using simulated data
    salary_insights = generate_salary_insights()
    job_distribution = generate_job_distribution()
    job_trends = generate_job_trends()
    skill_demand = generate_skills_demand()
    location_distribution = generate_location_distribution()
    remote_percentage = calculate_remote_percentage()
    model_metrics = generate_model_metrics()
    
    # Generate summary
    summary = generate_market_summary(salary_insights, location_distribution, remote_percentage)
    
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
        "dataSource": "simulated_data"
    }
    
    log("Market insights data generation complete")
    return market_insights

if __name__ == "__main__":
    # Generate insights
    insights = generate_market_insights_data()
    
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