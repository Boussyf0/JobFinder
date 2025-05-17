#!/usr/bin/env python3
"""
Job Recommendation Engine

Uses the processed job data to recommend jobs based on:
- User skills
- Preferences for remote/location
- Desired salary range
"""

import os
import argparse
from adzuna_vector_store import JobVectorStore

def setup_argparse():
    parser = argparse.ArgumentParser(description="Job recommendation based on skills and preferences")
    parser.add_argument("--skills", type=str, required=True, help="Comma-separated list of skills")
    parser.add_argument("--remote", action="store_true", help="Prefer remote jobs")
    parser.add_argument("--location", type=str, help="Preferred location")
    parser.add_argument("--min_salary", type=float, help="Minimum salary")
    parser.add_argument("--limit", type=int, default=10, help="Number of recommendations to show")
    return parser

def recommend_jobs(skills, remote_preference=False, location=None, min_salary=None, limit=10):
    """Recommend jobs based on user preferences"""
    # Initialize vector store
    data_dir = "adzuna_data"
    vector_dir = "vector_store"
    vector_store = JobVectorStore(data_dir=data_dir, vector_dir=vector_dir)
    
    if not vector_store.load():
        print("Error: Could not load vector store")
        return []
    
    # Convert skills string to list
    skills_list = [s.strip().lower() for s in skills.split(",")]
    
    # Search for jobs with matching skills
    matching_jobs = vector_store.search_by_skills(skills_list, top_k=limit*3)
    
    # Filter by preferences
    filtered_jobs = []
    for job in matching_jobs:
        # Apply filters
        if remote_preference and not job.get("remote_friendly", False):
            continue
            
        if location and location.lower() not in job.get("location", "").lower():
            continue
            
        if min_salary and job.get("salary_min") and job.get("salary_min") < min_salary:
            continue
            
        filtered_jobs.append(job)
        if len(filtered_jobs) >= limit:
            break
    
    return filtered_jobs

def display_recommendation(job):
    """Format and display a job recommendation"""
    print(f"\n{'='*80}")
    print(f"Title: {job.get('title')}")
    print(f"Company: {job.get('company')}")
    print(f"Location: {job.get('location')} | {'🏠 Remote' if job.get('remote_friendly') else '🏢 On-site'}")
    
    if job.get("salary_min") and job.get("salary_max"):
        print(f"Salary: {job.get('salary_min')} - {job.get('salary_max')}")
    
    if job.get("skills"):
        print(f"Skills: {', '.join(job.get('skills'))}")
        
    if job.get("description"):
        desc = job.get("description")
        # Truncate long descriptions
        if len(desc) > 200:
            desc = desc[:197] + "..."
        print(f"\nDescription: {desc}")
    
    print(f"\nJob Type: {job.get('job_type', 'Not specified')}")
    if job.get("url"):
        print(f"Apply at: {job.get('url')}")
    print(f"{'='*80}")

def main():
    parser = setup_argparse()
    args = parser.parse_args()
    
    print(f"Finding jobs matching skills: {args.skills}")
    if args.remote:
        print("Prioritizing remote positions")
    if args.location:
        print(f"Filtering for location: {args.location}")
    if args.min_salary:
        print(f"Minimum salary: {args.min_salary}")
    
    recommended_jobs = recommend_jobs(
        args.skills, 
        remote_preference=args.remote, 
        location=args.location,
        min_salary=args.min_salary,
        limit=args.limit
    )
    
    if not recommended_jobs:
        print("No matching jobs found with your criteria.")
        return
    
    print(f"\nFound {len(recommended_jobs)} job recommendations:")
    for job in recommended_jobs:
        display_recommendation(job)
    
    print(f"\nTotal recommendations: {len(recommended_jobs)}")

if __name__ == "__main__":
    main() 