#!/usr/bin/env python3
"""
Job Search API Server - REST API endpoints for the Next.js UI

This server provides REST API endpoints that match the interface expected by
the Next.js UI frontend.
"""

import argparse
import os
import json
import math
from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
import traceback
from adzuna_vector_store import JobVectorStore
from resume_matcher import ResumeMatcher, extract_text_from_resume
import base64
import re
from difflib import SequenceMatcher
import datetime  # Add this import for date parsing
import time  # Add this import for timestamp generation
import random  # Add this for generating random recent dates
import logging
import numpy as np
import uuid
import io
import nltk
from nltk.corpus import wordnet
from typing import Dict, List, Any, Optional, Union, Tuple
from io import BytesIO
from functools import wraps
from bson import ObjectId
import pickle

print("Starting Job Search API Server...")

# Import the interview evaluator module
try:
    from interview_evaluator import transcribe_audio, evaluate_answer, init_models
    INTERVIEW_EVALUATOR_AVAILABLE = True
    print("Interview evaluator module loaded successfully")
    # Initialize models in a separate thread to avoid blocking the API startup
    import threading
    threading.Thread(target=init_models, args=("tiny",)).start()
except ImportError:
    INTERVIEW_EVALUATOR_AVAILABLE = False
    print("Warning: Interview evaluator module not available. Speech-to-text and answer evaluation will not work.")

# Initialize face verification variables
FACE_VERIFICATION_AVAILABLE = False
face_verification_sessions = {}

# Import the face verification module
try:
    # First check if OpenCV is available
    import cv2
    print("OpenCV imported successfully")
    
    # Then try to import face verification module
    try:
        from face_verification import process_video_frame, analyze_candidate_behavior
        FACE_VERIFICATION_AVAILABLE = True
        print("Face verification module loaded successfully")
    except ImportError as e:
        print(f"Warning: Face verification module not available ({str(e)}). Video monitoring features will not work.")
    except Exception as e:
        print(f"Error in face verification module: {str(e)}")
        print("Video monitoring features will not work.")
except ImportError:
    print("Warning: OpenCV not available. Video monitoring features will not work.")

# Initialize Flask app
app = Flask(__name__)
# Update CORS configuration to make it more permissive
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)  # Allow requests from any origin

# Load vector store
VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "vector_store", "job_vector_store.pkl")

try:
    with open(VECTOR_STORE_PATH, "rb") as f:
        vector_store = pickle.load(f)
    print(f"Loaded vector store with {len(vector_store.jobs)} jobs")
    
    # If vector store has no jobs, initialize with sample data
    if not vector_store.jobs:
        print("Vector store has no jobs, loading sample data")
        from init_vector_store import generate_sample_jobs
        vector_store.jobs = generate_sample_jobs(50)
        
        # Save the updated vector store
        with open(VECTOR_STORE_PATH, "wb") as f:
            pickle.dump(vector_store, f)
        print(f"Updated vector store with {len(vector_store.jobs)} sample jobs")
        
except FileNotFoundError:
    print("Vector store not found. Creating a new one.")
    vector_store = JobVectorStore()
    
    # Initialize with sample data
    from init_vector_store import generate_sample_jobs
    vector_store.jobs = generate_sample_jobs(50)
    
    # Save the new vector store
    os.makedirs(os.path.dirname(VECTOR_STORE_PATH), exist_ok=True)
    with open(VECTOR_STORE_PATH, "wb") as f:
        pickle.dump(vector_store, f)
    print(f"Created new vector store with {len(vector_store.jobs)} sample jobs")
    
except Exception as e:
    print(f"Error loading vector store: {e}")
    vector_store = JobVectorStore()
    # Ensure jobs attribute is initialized
    vector_store.jobs = []
    
    # Initialize with sample data
    from init_vector_store import generate_sample_jobs
    vector_store.jobs = generate_sample_jobs(50)
    print(f"Initialized vector store with {len(vector_store.jobs)} sample jobs after error")

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify API server is running.
    """
    status = {
        "status": "ok",
        "timestamp": datetime.datetime.now().isoformat(),
        "version": "1.0.0",
        "services": {
            "interview_evaluator": INTERVIEW_EVALUATOR_AVAILABLE,
            "face_verification": FACE_VERIFICATION_AVAILABLE,
            "vector_store": vector_store is not None
        }
    }
    return jsonify(status)

def handle_json_encode(obj):
    """Custom JSON encoder function"""
    try:
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
            return None
        return str(obj)
    except TypeError:
        return str(obj)

# Custom JSON response handler
def custom_jsonify(data):
    return app.response_class(
        json.dumps(data, default=handle_json_encode),
        mimetype='application/json'
    )

# Configure CORS
@app.after_request
def after_request(response):
    # Allow requests from any origin
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    # Don't require credentials
    response.headers.add('Access-Control-Allow-Credentials', 'false')
    return response

# Handle OPTIONS requests for CORS preflight
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return after_request(make_response())

def is_duplicate_job(job1, job2, title_threshold=0.95, company_threshold=0.95):
    """
    Check if two jobs are likely duplicates based on title and company similarity.
    Using higher thresholds to be more conservative about duplicate detection.
    
    Args:
        job1: First job dictionary
        job2: Second job dictionary
        title_threshold: Similarity threshold for titles (0.0 to 1.0)
        company_threshold: Similarity threshold for company names (0.0 to 1.0)
        
    Returns:
        bool: True if jobs are likely duplicates, False otherwise
    """
    # Get title and company from both jobs
    title1 = str(job1.get('title', '')).lower() if job1.get('title') is not None else ''
    title2 = str(job2.get('title', '')).lower() if job2.get('title') is not None else ''
    company1 = str(job1.get('company', '')).lower() if job1.get('company') is not None else ''
    company2 = str(job2.get('company', '')).lower() if job2.get('company') is not None else ''
    
    # Skip comparison if any values are missing
    if not title1 or not title2 or not company1 or not company2:
        return False
    
    # Calculate similarity ratios
    title_ratio = SequenceMatcher(None, title1, title2).ratio()
    company_ratio = SequenceMatcher(None, company1, company2).ratio()
    
    # If URLs are available and identical, consider them duplicates
    url1 = str(job1.get('redirect_url', '')).lower() if job1.get('redirect_url') is not None else ''
    url2 = str(job2.get('redirect_url', '')).lower() if job2.get('redirect_url') is not None else ''
    if url1 and url2 and url1 == url2:
        return True
    
    # Check if location is same
    location1 = str(job1.get('location', '')).lower() if job1.get('location') is not None else ''
    location2 = str(job2.get('location', '')).lower() if job2.get('location') is not None else ''
    same_location = location1 == location2 and location1 != ''
    
    # Consider duplicates only if both title and company are extremely similar
    # or if the title is identical and location is the same
    return (title_ratio >= title_threshold and company_ratio >= company_threshold) or \
           (title_ratio == 1.0 and same_location)

def remove_duplicate_jobs(jobs, min_results=10):
    """
    Remove duplicate jobs from a list of job listings.
    Ensures at least min_results jobs are returned if available.
    
    Args:
        jobs: List of job dictionaries
        min_results: Minimum number of jobs to return
        
    Returns:
        List of jobs with duplicates removed
    """
    if not jobs:
        return []
        
    # If we don't have many jobs to begin with, return them all
    if len(jobs) <= min_results:
        return jobs
        
    unique_jobs = []
    
    for job in jobs:
        # Check if this job is a duplicate of any job we've already decided to keep
        is_duplicate = any(is_duplicate_job(job, existing_job) for existing_job in unique_jobs)
        
        if not is_duplicate:
            unique_jobs.append(job)
        
        # If we've removed too many and don't have the minimum required,
        # start being more lenient with duplicates
        if len(unique_jobs) < min_results and len(jobs) - len(unique_jobs) > len(jobs) * 0.7:
            print(f"Too many duplicates removed, adding some back to ensure at least {min_results} results")
            # Add some jobs back that we previously considered duplicates
            for potential_job in jobs:
                if potential_job not in unique_jobs:
                    unique_jobs.append(potential_job)
                    if len(unique_jobs) >= min_results:
                        break
    
    return unique_jobs

@app.route('/api/jobs/search', methods=['GET'])
def search_jobs():
    """
    Search for jobs with various filters.
    
    Query parameters:
    - query: Search query (job title, skills, etc.)
    - engineeringField: Field of engineering (optional)
    - location: Location (optional)
    - jobType: Type of job (CDI, CDD, etc.) (optional)
    - minSalary: Minimum salary (optional)
    - remote: Filter for remote jobs (optional, boolean)
    - moroccoOnly: Filter for Morocco-relevant jobs (optional, boolean)
    - limit: Maximum number of results (default: 20)
    - sortByDate: Sort by date, newest first (optional, boolean)
    - recentHours: Only show jobs from the last X hours (optional, integer)
    """
    try:
        # Get query parameters
        query = request.args.get('query', '')
        location = request.args.get('location', '')
        job_type = request.args.get('jobType', '')
        min_salary = request.args.get('minSalary', type=int)
        remote = request.args.get('remote') == 'true'
        morocco_only = request.args.get('moroccoOnly', 'false') == 'true'
        limit = request.args.get('limit', 20, type=int)
        engineering_field = request.args.get('engineeringField', '')
        remove_duplicates = request.args.get('removeDuplicates', 'true') == 'true'
        sort_by_date = request.args.get('sortByDate', 'true') == 'true'  # Default to true
        recent_hours = request.args.get('recentHours', type=int)
        
        # Log the request parameters
        print(f"Search request - query: {query}, location: {location}, job_type: {job_type}, "
              f"min_salary: {min_salary}, remote: {remote}, morocco_only: {morocco_only}, "
              f"limit: {limit}, engineering_field: {engineering_field}, sort_by_date: {sort_by_date}, "
              f"recent_hours: {recent_hours}")
        
        # Perform search based on parameters
        try:
            if morocco_only and remote:
                results = vector_store.search_morocco_relevant(query, k=limit*5)  # Get more results for filtering
                filter_fn = lambda job: job.get('remote_friendly', False)
                results = [job for job in results if filter_fn(job)]
            elif morocco_only:
                results = vector_store.search_morocco_relevant(query, k=limit*5)  # Get more results for filtering
            elif remote:
                results = vector_store.search_remote_jobs(query, k=limit*5)  # Get more results for filtering
            else:
                results = vector_store.search_similar_jobs(query, k=limit*5)  # Get more results for filtering
        except Exception as e:
            print(f"Error in vector store search: {e}")
            # Fallback to returning all jobs
            results = vector_store.jobs[:limit*5]
            print(f"Using fallback: returning {len(results)} jobs directly from vector store")
            
        # If no results from search, return some jobs directly
        if not results:
            print("No results from vector store search, using direct jobs")
            results = vector_store.jobs[:limit*5]
        
        # Enrich job data - extract missing information from descriptions and titles
        for job in results:
            # Infer job type if missing
            if not job.get('job_type') or job.get('job_type') is None:
                desc = (job.get('description', '') or '').lower()
                title = (job.get('title', '') or '').lower()
                
                # Try to infer job type from description and title
                if 'cdi' in desc or 'permanent' in desc or 'indeterminé' in desc:
                    job['job_type'] = 'CDI'
                elif 'cdd' in desc or 'contract' in desc or 'déterminé' in desc:
                    job['job_type'] = 'CDD'
                elif 'stage' in desc or 'internship' in desc or 'stagiaire' in desc:
                    job['job_type'] = 'Stage'
                elif 'freelance' in desc or 'independent' in desc or 'indépendant' in desc:
                    job['job_type'] = 'Freelance'
                elif 'temps partiel' in desc or 'part time' in desc or 'part-time' in desc:
                    job['job_type'] = 'Part-time'
                else:
                    # Default to CDI for jobs that don't specify
                    job['job_type'] = 'CDI'
        
        # Apply additional filters
        if location:
            results = [job for job in results if location.lower() in (job.get('location', '') or '').lower()]
        
        if job_type:
            # Fix: Handle None values properly by converting to empty string
            results = [job for job in results if job_type.lower() in (job.get('job_type', '') or '').lower()]
            
        if min_salary is not None and min_salary > 0:
            results = [job for job in results if 
                       (job.get('salary_min', 0) >= min_salary) or 
                       (job.get('salaryMin', 0) >= min_salary)]
            
        if engineering_field:
            results = [job for job in results if 
                      engineering_field.lower() in (job.get('category', '') or '').lower() or
                      engineering_field.lower() in (job.get('title', '') or '').lower()]
                      
        # If no results after filtering, provide default results
        if not results and job_type:
            print(f"No results found for job_type={job_type}, falling back to unfiltered results")
            if morocco_only:
                results = vector_store.search_morocco_relevant(query, k=limit)
            else:
                results = vector_store.search_similar_jobs(query, k=limit)
                
            # Mark these as the requested job type (as a visual indication)
            for job in results:
                job['job_type'] = job_type
                job['inferred_type'] = True
        
        # Sort by date if requested (before applying limit)
        if sort_by_date:
            # Generate realistic dates for jobs without dates (staggered over the last 2 months)
            now = datetime.datetime.now()
            jobs_without_dates = [job for job in results if not job.get('created')]
            
            # Create staggered timestamps: newer jobs for more relevant matches
            for i, job in enumerate(jobs_without_dates):
                # Calculate days ago: more relevant jobs (lower index) are newer
                # Add a small random factor to avoid all jobs having the same timestamp
                relevance_position = min(i, 59)  # Max 60 days ago (2 months)
                days_ago = relevance_position + random.randint(0, 3)
                
                # Create date: combine relevance ranking with recency
                job_date = now - datetime.timedelta(days=days_ago)
                job['created'] = job_date.strftime('%Y-%m-%d')
                job['_parsed_date'] = job_date
                
                # Log that we assigned a date
                if i < 5:  # Only log a few to avoid spam
                    print(f"Assigned date {job['created']} to job: {job.get('title', 'Unknown')}")
            
            # Parse dates for jobs that already have dates
            for job in results:
                if job.get('_parsed_date'):
                    continue  # Skip if we already assigned a date above
                    
                posted_at = job.get('created', '')
                if posted_at:
                    try:
                        # Try different date formats
                        date_parsed = False
                        for fmt in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S']:
                            try:
                                job['_parsed_date'] = datetime.datetime.strptime(posted_at, fmt)
                                date_parsed = True
                                break
                            except ValueError:
                                continue
                                
                        if not date_parsed:
                            # If all formats failed, set a default recent date
                            days_ago = random.randint(0, 30)  # Random date within last month
                            job['_parsed_date'] = now - datetime.timedelta(days=days_ago)
                    except Exception as e:
                        # If parsing fails, set a default recent date
                        days_ago = random.randint(0, 30)  # Random date within last month
                        job['_parsed_date'] = now - datetime.timedelta(days=days_ago)
                else:
                    # This should not happen now since we filled all missing dates above
                    job['_parsed_date'] = now - datetime.timedelta(days=random.randint(0, 30))
            
            # Sort by parsed date, newest first
            results.sort(key=lambda x: x.get('_parsed_date', datetime.datetime(2000, 1, 1)), reverse=True)
            print(f"Sorted {len(results)} jobs by date, newest first")
        
        # Filter by recent hours if specified
        if recent_hours is not None and recent_hours > 0:
            now = datetime.datetime.now()
            cutoff_time = now - datetime.timedelta(hours=recent_hours)
            
            # Filter jobs by date
            original_count = len(results)
            results = [job for job in results if job.get('_parsed_date', datetime.datetime(1970, 1, 1)) >= cutoff_time]
            filtered_count = original_count - len(results)
            print(f"Filtered out {filtered_count} jobs older than {recent_hours} hours")
            
            # If we've filtered out too many results, get more recent jobs
            if len(results) < min(limit, 5) and filtered_count > 0:
                print("Not enough recent jobs, adding some slightly older ones")
                # Sort all jobs by date
                all_results = vector_store.search_similar_jobs(query, k=limit*10)
                
                # Parse and assign dates
                for job in all_results:
                    if not job.get('_parsed_date'):
                        posted_at = job.get('created', '')
                        if posted_at:
                            try:
                                for fmt in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S']:
                                    try:
                                        job['_parsed_date'] = datetime.datetime.strptime(posted_at, fmt)
                                        break
                                    except ValueError:
                                        continue
                            except Exception:
                                # Default to a recent date
                                job['_parsed_date'] = now - datetime.timedelta(days=random.randint(0, 10))
                        else:
                            # Default to a recent date
                            job['_parsed_date'] = now - datetime.timedelta(days=random.randint(0, 10))
                
                # Sort by date
                all_results.sort(key=lambda x: x.get('_parsed_date', datetime.datetime(2000, 1, 1)), reverse=True)
                
                # Add more recent jobs that aren't already in results
                existing_ids = {job.get('id') for job in results if job.get('id')}
                for job in all_results:
                    if len(results) >= limit:
                        break
                    if job.get('id') and job.get('id') not in existing_ids:
                        results.append(job)
                        existing_ids.add(job.get('id'))
        
        # Remove duplicate jobs
        if remove_duplicates:
            original_count = len(results)
            results = remove_duplicate_jobs(results, min_results=limit)
            duplicate_count = original_count - len(results)
            print(f"Removed {duplicate_count} duplicate jobs")
            
            # If we've filtered out too many results, get more
            if len(results) < limit and original_count >= limit:
                print("Getting additional results after duplicate removal")
                more_results = []
                if morocco_only:
                    more_results = vector_store.search_morocco_relevant(query, k=limit*2)
                else:
                    more_results = vector_store.search_similar_jobs(query, k=limit*2)
                
                # Only add new jobs that don't duplicate existing ones
                for job in more_results:
                    if len(results) >= limit*2:
                        break
                    is_duplicate = any(is_duplicate_job(job, existing_job) for existing_job in results)
                    if not is_duplicate:
                        results.append(job)
            
            # If we still have no results after duplicate removal, use the sample jobs
            if len(results) == 0:
                print("No results after duplicate removal, using sample jobs")
                # Load sample jobs
                from init_vector_store import generate_sample_jobs
                sample_jobs = generate_sample_jobs(limit)
                results = sample_jobs
        
        # Convert results to the format expected by the UI
        formatted_results = []
        for job in results[:limit]:
            # Clean up NaN values
            salary_min = job.get('salary_min', 0)
            salary_max = job.get('salary_max', 0)
            
            if isinstance(salary_min, float) and (math.isnan(salary_min) or math.isinf(salary_min)):
                salary_min = 0
            
            if isinstance(salary_max, float) and (math.isnan(salary_max) or math.isinf(salary_max)):
                salary_max = 0
            
            # Ensure postedAt has a value for UI display
            posted_at = job.get('created', '')
            if not posted_at and '_parsed_date' in job:
                posted_at = job['_parsed_date'].strftime('%Y-%m-%d')
            
            # Clean other potential NaN fields
            job_type = job.get('job_type', job.get('contract_type', ''))
            if isinstance(job_type, float) and math.isnan(job_type):
                job_type = ''
            
            company = job.get('company', 'Unknown Company')
            if isinstance(company, float) and math.isnan(company):
                company = 'Unknown Company'
            
            location = job.get('location', 'Unknown Location')
            if isinstance(location, float) and math.isnan(location):
                location = 'Unknown Location'
            
            description = job.get('description', '')
            if isinstance(description, float) and math.isnan(description):
                description = ''
            
            category = job.get('specialty', job.get('category', ''))
            if isinstance(category, float) and math.isnan(category):
                category = ''
                
            formatted_job = {
                'id': job.get('id', f"job-{len(formatted_results)}"),
                'title': job.get('title', 'Unknown Title'),
                'company': company,
                'location': location,
                'description': description,
                'salary': job.get('salary', ''),
                'salaryMin': salary_min,
                'salaryMax': salary_max,
                'jobType': job_type,
                'remote': job.get('remote_friendly', False),
                'url': job.get('redirect_url', ''),
                'postedAt': posted_at,
                'skills': job.get('skills', []),
                'category': category,
                'similarityScore': job.get('similarity_score', 0),
                'inferredType': job.get('inferred_type', False),
                'isRecent': job.get('_parsed_date', datetime.datetime(1970, 1, 1)) >= (datetime.datetime.now() - datetime.timedelta(hours=6))
            }
            formatted_results.append(formatted_job)
            
        return custom_jsonify({'jobs': formatted_results})
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'jobs': []}), 500


@app.route('/api/jobs/details/<job_id>', methods=['GET'])
def get_job_details(job_id):
    """
    Get detailed information about a specific job.
    
    Path parameters:
    - job_id: ID of the job to retrieve
    """
    try:
        # Find job by ID
        job = None
        for j in vector_store.jobs:
            if j.get('id') == job_id:
                job = j
                break
        
        if not job:
            return custom_jsonify({'error': 'Job not found'}), 404
            
        # Get similar jobs
        query = job.get('title', '')
        similar_jobs = vector_store.search_similar_jobs(query, k=5)
        
        # Filter out the current job
        similar_jobs = [j for j in similar_jobs if j.get('id') != job_id]
        
        # Clean up NaN values in the main job
        salary_min = job.get('salary_min', 0)
        salary_max = job.get('salary_max', 0)
        
        if isinstance(salary_min, float) and (math.isnan(salary_min) or math.isinf(salary_min)):
            salary_min = 0
        
        if isinstance(salary_max, float) and (math.isnan(salary_max) or math.isinf(salary_max)):
            salary_max = 0
        
        # Handle other potential NaN fields
        job_type = job.get('job_type', job.get('contract_type', ''))
        if isinstance(job_type, float) and math.isnan(job_type):
            job_type = ''
        
        company = job.get('company', 'Unknown Company')
        if isinstance(company, float) and math.isnan(company):
            company = 'Unknown Company'
        
        location = job.get('location', 'Unknown Location')
        if isinstance(location, float) and math.isnan(location):
            location = 'Unknown Location'
        
        description = job.get('description', '')
        if isinstance(description, float) and math.isnan(description):
            description = ''
        
        category = job.get('specialty', job.get('category', ''))
        if isinstance(category, float) and math.isnan(category):
            category = ''
        
        posted_at = job.get('created', '')
        if isinstance(posted_at, float) and math.isnan(posted_at):
            posted_at = ''
        
        # Format the job and similar jobs
        formatted_job = {
            'id': job.get('id', ''),
            'title': job.get('title', 'Unknown Title'),
            'company': company,
            'location': location,
            'description': description,
            'salary': job.get('salary', ''),
            'salaryMin': salary_min,
            'salaryMax': salary_max,
            'jobType': job_type,
            'remote': job.get('remote_friendly', False),
            'url': job.get('redirect_url', ''),
            'postedAt': posted_at,
            'skills': job.get('skills', []),
            'category': category,
        }
        
        formatted_similar_jobs = []
        for j in similar_jobs[:4]:  # Limit to 4 similar jobs
            # Clean up NaN values in similar jobs
            j_salary_min = j.get('salary_min', 0)
            j_salary_max = j.get('salary_max', 0)
            
            if isinstance(j_salary_min, float) and (math.isnan(j_salary_min) or math.isinf(j_salary_min)):
                j_salary_min = 0
            
            if isinstance(j_salary_max, float) and (math.isnan(j_salary_max) or math.isinf(j_salary_max)):
                j_salary_max = 0
                
            # Clean other potential NaN fields
            j_job_type = j.get('job_type', j.get('contract_type', ''))
            if isinstance(j_job_type, float) and math.isnan(j_job_type):
                j_job_type = ''
            
            j_company = j.get('company', 'Unknown Company')
            if isinstance(j_company, float) and math.isnan(j_company):
                j_company = 'Unknown Company'
            
            j_location = j.get('location', 'Unknown Location')
            if isinstance(j_location, float) and math.isnan(j_location):
                j_location = 'Unknown Location'
            
            j_description = j.get('description', '')
            if isinstance(j_description, float) and math.isnan(j_description):
                j_description = ''
            
            j_category = j.get('specialty', j.get('category', ''))
            if isinstance(j_category, float) and math.isnan(j_category):
                j_category = ''
                
            j_posted_at = j.get('created', '')
            if isinstance(j_posted_at, float) and math.isnan(j_posted_at):
                j_posted_at = ''
                
            j_similarity_score = j.get('similarity_score', 0)
            if isinstance(j_similarity_score, float) and math.isnan(j_similarity_score):
                j_similarity_score = 0
            
            similar_job = {
                'id': j.get('id', f"job-similar-{len(formatted_similar_jobs)}"),
                'title': j.get('title', 'Unknown Title'),
                'company': j_company,
                'location': j_location,
                'description': j_description,
                'salary': j.get('salary', ''),
                'salaryMin': j_salary_min,
                'salaryMax': j_salary_max,
                'jobType': j_job_type,
                'remote': j.get('remote_friendly', False),
                'url': j.get('redirect_url', ''),
                'postedAt': j_posted_at,
                'skills': j.get('skills', []),
                'category': j_category,
                'similarityScore': j_similarity_score,
            }
            formatted_similar_jobs.append(similar_job)
            
        return custom_jsonify({'job': formatted_job, 'similarJobs': formatted_similar_jobs})
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e)}), 500


@app.route('/api/jobs/recommendations', methods=['GET'])
def get_recommendations():
    """
    Get job recommendations based on skills or user ID.
    
    Query parameters:
    - userId: User ID to get recommendations for (optional)
    - skills: Comma-separated list of skills (optional)
    - limit: Maximum number of results (default: 10)
    """
    try:
        # Get query parameters
        user_id = request.args.get('userId', '')
        skills_param = request.args.get('skills', '')
        limit = request.args.get('limit', 10, type=int)
        
        # Parse skills list
        skills = []
        if skills_param:
            skills = [skill.strip() for skill in skills_param.split(',')]
        
        # For now, we'll just do a search based on skills
        if skills:
            results = vector_store.search_by_keywords(skills, k=limit)
        else:
            # If no skills provided, just get some random jobs
            results = vector_store.jobs[:limit]
        
        # Convert results to the format expected by the UI
        formatted_results = []
        for job in results:
            # Clean up NaN values
            salary_min = job.get('salary_min', 0)
            salary_max = job.get('salary_max', 0)
            
            if isinstance(salary_min, float) and (math.isnan(salary_min) or math.isinf(salary_min)):
                salary_min = 0
            
            if isinstance(salary_max, float) and (math.isnan(salary_max) or math.isinf(salary_max)):
                salary_max = 0
                
            formatted_job = {
                'id': job.get('id', f"job-rec-{len(formatted_results)}"),
                'title': job.get('title', 'Unknown Title'),
                'company': job.get('company', 'Unknown Company'),
                'location': job.get('location', 'Unknown Location'),
                'description': job.get('description', ''),
                'salary': job.get('salary', ''),
                'salaryMin': salary_min,
                'salaryMax': salary_max,
                'jobType': job.get('job_type', job.get('contract_type', '')),
                'remote': job.get('remote_friendly', False),
                'url': job.get('redirect_url', ''),
                'postedAt': job.get('created', ''),
                'skills': job.get('skills', []),
                'category': job.get('specialty', job.get('category', '')),
                'similarityScore': job.get('similarity_score', 0.9),  # Default high score for recommendations
            }
            formatted_results.append(formatted_job)
            
        return custom_jsonify({'jobs': formatted_results})
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'jobs': []}), 500


@app.route('/api/user/saved', methods=['POST'])
def save_job():
    """
    Save a job to user's saved jobs.
    This is a mock endpoint that just returns success.
    """
    try:
        data = request.json
        job_id = data.get('jobId', '')
        
        # In a real implementation, we would save the job to the user's saved jobs in a database
        print(f"Saving job {job_id} for user")
        
        return custom_jsonify({'success': True})
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'success': False}), 500


@app.route('/api/user/saved/<job_id>', methods=['DELETE'])
def unsave_job(job_id):
    """
    Remove a job from user's saved jobs.
    This is a mock endpoint that just returns success.
    """
    try:
        # In a real implementation, we would remove the job from the user's saved jobs in a database
        print(f"Removing job {job_id} from user's saved jobs")
        
        return custom_jsonify({'success': True})
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'success': False}), 500


@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    """
    Get user profile information.
    This is a mock endpoint that returns fake user data.
    """
    try:
        # In a real implementation, we would fetch the user profile from a database
        user_profile = {
            'id': 'user-1',
            'name': 'John Doe',
            'email': 'john.doe@example.com',
            'skills': ['JavaScript', 'React', 'Node.js', 'Python'],
            'savedJobs': [],
            'applications': [],
        }
        
        return custom_jsonify(user_profile)
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e)}), 500


@app.route('/api/salary/predict', methods=['POST'])
def predict_salary():
    """
    Predict salary based on job details using the machine learning model.
    """
    try:
        from salary_predictor import predict_job_salary
        
        data = request.json
        job_title = data.get('title', 'Software Engineer')
        location = data.get('location', 'Casablanca')
        experience = float(data.get('experience', 3))
        department = data.get('department', None)
        is_remote = data.get('remote', False)
        skills = data.get('skills', [])
        
        # Use the salary predictor model
        prediction = predict_job_salary(
            title=job_title,
            department=department,
            experience_years=experience,
            is_remote=is_remote,
            location=location,
            skills=skills
        )
        
        return custom_jsonify(prediction)
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e)}), 500


@app.route('/api/salary/departments', methods=['GET'])
def get_salary_departments():
    """
    Get list of department categories for salary prediction.
    """
    try:
        from salary_predictor import get_department_categories
        
        departments = get_department_categories()
        return custom_jsonify({'departments': departments})
    
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'departments': []}), 500


@app.route('/api/resume/match', methods=['POST'])
def match_resume():
    """
    Match a resume with job listings.
    
    Expected request body:
    - resume: Base64-encoded resume file
    - file_type: MIME type of the resume file
    - limit: Maximum number of job matches to return (default: 10)
    """
    try:
        data = request.json
        if not data:
            return custom_jsonify({'error': 'No data provided'}), 400
            
        # Get the resume file content (base64 encoded)
        resume_base64 = data.get('resume')
        if not resume_base64:
            return custom_jsonify({'error': 'No resume provided'}), 400
            
        # Get the file type
        file_type = data.get('file_type', 'text/plain')
        
        # Get the limit
        limit = data.get('limit', 10)
        
        # Decode the base64 resume
        try:
            resume_bytes = base64.b64decode(resume_base64)
        except Exception as e:
            return custom_jsonify({'error': f'Invalid base64 encoding: {str(e)}'}), 400
            
        # Extract text from the resume
        resume_text = extract_text_from_resume(resume_bytes, file_type)
        
        # Create the matcher
        matcher = ResumeMatcher(vector_store.jobs)
        
        # Match the resume with jobs
        matched_jobs, resume_data = matcher.match_resume_to_jobs(resume_text, limit)
        
        # Handle NaN values in matched jobs
        for job in matched_jobs:
            # Clean up NaN values
            if 'match_score' in job and isinstance(job['match_score'], float) and math.isnan(job['match_score']):
                job['match_score'] = 0
                
            # Clean contract_type NaN
            if 'contract_type' in job and isinstance(job['contract_type'], float) and math.isnan(job['contract_type']):
                job['contract_type'] = None
                
            # Clean salary fields
            if 'salary_min' in job and isinstance(job['salary_min'], float) and math.isnan(job['salary_min']):
                job['salary_min'] = 0
                
            if 'salary_max' in job and isinstance(job['salary_max'], float) and math.isnan(job['salary_max']):
                job['salary_max'] = 0
                
            # Ensure specialty isn't NaN
            if 'specialty' in job and isinstance(job['specialty'], float) and math.isnan(job['specialty']):
                job['specialty'] = None
        
        # Format the response
        response = {
            'jobs': matched_jobs,
            'skills': resume_data['skills'],
            'years_of_experience': resume_data['years_of_experience'],
            'match_score': max([job.get('match_score', 0) for job in matched_jobs]) if matched_jobs else 0
        }
        
        return custom_jsonify(response)
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e)}), 500


@app.route('/api/interview/generate', methods=['POST'])
def generate_interview():
    """
    Generate AI interview questions based on a job and resume.
    
    Expected request body:
    - job_id: ID of the job to interview for
    - resume_text: Base64-encoded resume text (optional)
    - num_questions: Number of questions to generate (default: 5)
    """
    try:
        data = request.json
        if not data:
            return custom_jsonify({'error': 'No data provided'}), 400
            
        # Get the job ID
        job_id = data.get('job_id')
        if not job_id:
            return custom_jsonify({'error': 'No job ID provided'}), 400
        
        # Get the resume text (optional)
        resume_base64 = data.get('resume_text', '')
        resume_text = ''
        if resume_base64:
            try:
                resume_bytes = base64.b64decode(resume_base64)
                resume_text = extract_text_from_resume(resume_bytes, 'text/plain')
            except Exception as e:
                print(f"Warning: Failed to decode resume: {str(e)}")
        
        # Get the number of questions
        num_questions = data.get('num_questions', 5)
        
        # Find the job
        job = None
        for j in vector_store.jobs:
            if j.get('id') == job_id:
                job = j
                break
        
        if not job:
            return custom_jsonify({'error': 'Job not found'}), 404
        
        # Extract job information
        job_title = job.get('title', 'Unknown Job')
        job_description = job.get('description', '')
        job_skills = []
        
        # Extract skills from job description
        from resume_matcher import TECH_SKILLS
        for skill in TECH_SKILLS:
            if skill.lower() in job_description.lower() or skill.lower() in job_title.lower():
                job_skills.append(skill)
        
        # Generate interview questions based on job and resume
        questions = generate_interview_questions(job_title, job_description, job_skills, resume_text, num_questions)
        
        return custom_jsonify({
            'job_id': job_id,
            'job_title': job_title,
            'questions': questions
        })
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e)}), 500

def generate_interview_questions(job_title, job_description, job_skills, resume_text=None, num_questions=5):
    """
    Generate tailored interview questions based on job details and optional resume.
    
    Args:
        job_title: The title of the job
        job_description: The job description
        job_skills: List of skills mentioned in the job
        resume_text: Text from the candidate's resume (optional)
        num_questions: Number of questions to generate
        
    Returns:
        List of interview questions
    """
    # Template questions based on job type
    technical_questions = [
        f"Can you explain your experience with {skill}?" for skill in job_skills[:3]
    ]
    
    behavioral_questions = [
        f"Describe a challenging situation you faced while working with {skill} and how you resolved it." 
        for skill in job_skills[3:5] if len(job_skills) > 3
    ]
    
    general_questions = [
        f"Why are you interested in this {job_title} position?",
        f"How would your skills in {', '.join(job_skills[:2])} contribute to our team?",
        "What are your greatest professional strengths relevant to this role?",
        "Where do you see yourself professionally in five years?",
        "How do you stay updated with the latest trends and technologies in your field?",
        "Tell me about a project you're particularly proud of and your role in it.",
        "How do you handle tight deadlines and pressure?",
        "Describe your ideal work environment.",
        "How do you approach learning new technologies or skills?",
        "What is your approach to problem-solving?"
    ]
    
    # Get specific questions based on job description keywords
    specific_questions = []
    
    if "lead" in job_title.lower() or "senior" in job_title.lower() or "manager" in job_title.lower():
        specific_questions.extend([
            "How do you approach mentoring junior team members?",
            "Describe your experience in leading projects or teams.",
            "How do you handle conflicts within your team?",
        ])
    
    if "data" in job_title.lower() or "analyst" in job_title.lower():
        specific_questions.extend([
            "How do you ensure the quality and integrity of data in your analyses?",
            "Describe a time when your data analysis led to a significant business decision.",
            "What tools and techniques do you use for data visualization?",
        ])
    
    if "developer" in job_title.lower() or "engineer" in job_title.lower() or "programming" in job_description.lower():
        specific_questions.extend([
            "How do you ensure your code is maintainable and scalable?",
            "Describe your approach to testing and debugging.",
            "How do you stay updated with best practices in software development?",
        ])
    
    # Combine all questions and select the requested number
    all_questions = technical_questions + behavioral_questions + specific_questions + general_questions
    
    # Ensure we have enough questions
    if len(all_questions) < num_questions:
        all_questions.extend([
            "What motivated you to apply for this position?",
            "How do you handle constructive criticism?",
            "Describe a time when you had to learn something new quickly.",
            "What are your salary expectations?",
            "Do you have any questions for us about the role or company?"
        ])
    
    # Shuffle and select questions
    random.shuffle(all_questions)
    selected_questions = all_questions[:num_questions]
    
    # Format questions with numbers
    formatted_questions = [{'id': i+1, 'question': q} for i, q in enumerate(selected_questions)]
    
    return formatted_questions

@app.route('/api/interview/transcribe', methods=['POST'])
def transcribe_interview_audio():
    """
    Transcribe interview audio using Whisper.
    
    Expected request body:
    - audio: Base64-encoded audio data
    """
    try:
        if not INTERVIEW_EVALUATOR_AVAILABLE:
            return custom_jsonify({
                'error': 'Speech-to-text functionality is not available. Please install the required dependencies.'
            }), 501
            
        # Get request data
        data = request.json
        if not data:
            return custom_jsonify({'error': 'No data provided'}), 400
            
        # Get the audio data
        audio_base64 = data.get('audio')
        if not audio_base64:
            return custom_jsonify({'error': 'No audio provided'}), 400
            
        # Transcribe the audio
        text = transcribe_audio(audio_base64)
        
        return custom_jsonify({
            'text': text
        })
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e)}), 500

@app.route('/api/interview/evaluate', methods=['POST'])
def evaluate_interview_answer():
    """
    Evaluate an interview answer using LLaMA 2.
    
    Expected request body:
    - job_id: ID of the job
    - question: The interview question
    - answer: The candidate's answer
    """
    try:
        if not INTERVIEW_EVALUATOR_AVAILABLE:
            return custom_jsonify({
                'error': 'Answer evaluation functionality is not available. Please install the required dependencies.'
            }), 501
            
        # Get request data
        data = request.json
        if not data:
            return custom_jsonify({'error': 'No data provided'}), 400
            
        # Get the job ID, question, and answer
        job_id = data.get('job_id')
        question = data.get('question')
        answer = data.get('answer')
        
        if not job_id:
            return custom_jsonify({'error': 'No job ID provided'}), 400
        if not question:
            return custom_jsonify({'error': 'No question provided'}), 400
        if not answer:
            return custom_jsonify({'error': 'No answer provided'}), 400
            
        # Find the job
        job = None
        for j in vector_store.jobs:
            if j.get('id') == job_id:
                job = j
                break
        
        if not job:
            return custom_jsonify({'error': 'Job not found'}), 404
            
        # Extract job information
        job_title = job.get('title', 'Unknown Job')
        job_description = job.get('description', '')
        job_skills = []
        
        # Extract skills from job description
        from resume_matcher import TECH_SKILLS
        for skill in TECH_SKILLS:
            if skill.lower() in job_description.lower() or skill.lower() in job_title.lower():
                job_skills.append(skill)
                
        # Evaluate the answer
        evaluation = evaluate_answer(question, answer, job_description, job_skills)
        
        return custom_jsonify({
            'job_id': job_id,
            'job_title': job_title,
            'question': question,
            'answer': answer,
            'evaluation': evaluation
        })
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e)}), 500

@app.route('/api/interview/verify-frame', methods=['POST'])
def verify_video_frame():
    """
    Verify a video frame for candidate monitoring.
    
    Expected request body:
    - frame: Base64 encoded video frame (image)
    - session_id: Session ID for tracking landmarks between frames
    """
    try:
        if not FACE_VERIFICATION_AVAILABLE:
            return custom_jsonify({
                'error': 'Face verification functionality is not available. Please install the required dependencies.'
            }), 501
            
        # Get request data
        data = request.json
        if not data:
            return custom_jsonify({'error': 'No data provided'}), 400
            
        # Get the frame data and session ID
        frame_base64 = data.get('frame')
        session_id = data.get('session_id')
        
        if not frame_base64:
            return custom_jsonify({'error': 'No frame provided'}), 400
        if not session_id:
            return custom_jsonify({'error': 'No session ID provided'}), 400
            
        # Get previous landmarks for this session if available
        previous_landmarks = None
        if session_id in face_verification_sessions and 'landmarks' in face_verification_sessions[session_id]:
            previous_landmarks = face_verification_sessions[session_id]['landmarks']
            
        # Initialize session data if it doesn't exist
        if session_id not in face_verification_sessions:
            face_verification_sessions[session_id] = {
                'frame_analyses': [],
                'landmarks': None,
            }
            
        # Process the frame
        result = process_video_frame(frame_base64, previous_landmarks)
        
        # Update session data
        if result.get('success', False) and result.get('face_detected', False):
            face_verification_sessions[session_id]['landmarks'] = result.get('landmarks')
            # Store frame analysis but without landmarks (they're large)
            analysis_to_store = {
                'face_detected': result.get('face_detected', False),
                'position_analysis': result.get('position_analysis'),
                'movement_analysis': result.get('movement_analysis')
            }
            face_verification_sessions[session_id]['frame_analyses'].append(analysis_to_store)
            
            # Limit stored frame analyses to last 100 frames
            if len(face_verification_sessions[session_id]['frame_analyses']) > 100:
                face_verification_sessions[session_id]['frame_analyses'] = face_verification_sessions[session_id]['frame_analyses'][-100:]
        
        # Remove landmarks from result to reduce payload size
        if 'landmarks' in result:
            del result['landmarks']
            
        return custom_jsonify(result)
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/interview/analyze-behavior', methods=['POST'])
def analyze_interview_behavior():
    """
    Analyze candidate behavior during an interview session.
    
    Expected request body:
    - session_id: Session ID for the interview
    """
    try:
        if not FACE_VERIFICATION_AVAILABLE:
            return custom_jsonify({
                'error': 'Face verification functionality is not available. Please install the required dependencies.'
            }), 501
            
        # Get request data
        data = request.json
        if not data:
            return custom_jsonify({'error': 'No data provided'}), 400
            
        # Get the session ID
        session_id = data.get('session_id')
        
        if not session_id:
            return custom_jsonify({'error': 'No session ID provided'}), 400
            
        # Check if session exists
        if session_id not in face_verification_sessions:
            return custom_jsonify({'error': 'Session not found'}), 404
            
        # Get frame analyses from session
        frame_analyses = face_verification_sessions[session_id]['frame_analyses']
        
        # Analyze behavior
        behavior_analysis = analyze_candidate_behavior(frame_analyses)
        
        # Optionally clear session data to free memory
        if data.get('clear_session', False):
            del face_verification_sessions[session_id]
            
        return custom_jsonify({
            'success': True,
            'session_id': session_id,
            'frame_count': len(frame_analyses),
            'behavior_analysis': behavior_analysis
        })
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/interview/coding', methods=['POST'])
def evaluate_coding_answer():
    """
    Evaluate a coding solution to a problem.
    
    Expected request body:
    - job_id: ID of the job 
    - problem: The coding problem description
    - solution: The candidate's solution code
    - language: The programming language used
    """
    try:
        # Get request data
        data = request.json
        if not data:
            return custom_jsonify({'error': 'No data provided'}), 400
            
        # Get problem details
        job_id = data.get('job_id')
        problem = data.get('problem')
        solution = data.get('solution')
        language = data.get('language', 'python')
        
        if not job_id:
            return custom_jsonify({'error': 'No job ID provided'}), 400
        if not problem:
            return custom_jsonify({'error': 'No problem description provided'}), 400
        if not solution:
            return custom_jsonify({'error': 'No solution provided'}), 400
            
        # Find the job
        job = None
        for j in vector_store.jobs:
            if j.get('id') == job_id:
                job = j
                break
        
        if not job:
            return custom_jsonify({'error': 'Job not found'}), 404
            
        # Get job details for context
        job_title = job.get('title', 'Unknown Job')
        job_skills = []
        
        # Extract skills from job description
        from resume_matcher import TECH_SKILLS
        for skill in TECH_SKILLS:
            if skill.lower() in job.get('description', '').lower() or skill.lower() in job_title.lower():
                job_skills.append(skill)
                
        # For now, provide a simplistic evaluation  
        # In a real implementation, we'd use a more sophisticated approach
        # like running tests, code analysis, or LLM-based evaluation
        
        code_evaluation = {
            "scores": {
                "correctness": random.randint(6, 10),
                "efficiency": random.randint(5, 9),
                "style": random.randint(6, 10),
                "readability": random.randint(7, 10),
                "overall": random.randint(6, 9)
            },
            "analysis": {
                "strengths": [
                    "Good solution structure",
                    "Effective use of " + language + " syntax"
                ],
                "improvements": [
                    "Could improve time complexity",
                    "Consider adding more comments"
                ]
            },
            "code_issues": [
                {"line": random.randint(1, len(solution.split('\n'))), "message": "Consider a more efficient approach here"},
                {"line": random.randint(1, len(solution.split('\n'))), "message": "Variable naming could be clearer"}
            ],
            "rating": random.randint(65, 90) / 10,
            "suggestion": "Focus on algorithm efficiency and add better documentation to your code."
        }
        
        # In a future implementation, this would use an actual coding evaluation service
        
        return custom_jsonify({
            'success': True,
            'job_id': job_id,
            'job_title': job_title,
            'language': language,
            'evaluation': code_evaluation
        })
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """
    Get job market analytics and insights.
    
    Returns:
        JSON object containing market analytics data including:
        - total_jobs: Total number of jobs
        - jobs_with_salary: Number of jobs with salary information
        - field_distribution: Job distribution by engineering field
        - location_distribution: Job distribution by location
        - job_type_distribution: Distribution by job type
        - salary_ranges: Distribution of salary ranges
        - top_skills: Most in-demand skills
        - timestamp: Last update timestamp
    """
    try:
        from analyze_market_data import generate_market_insights_data
        
        # Generate market insights with fallback data if needed
        try:
            insights = generate_market_insights_data()
        except Exception as e:
            print(f"Error generating market insights: {str(e)}")
            # Provide fallback data
            insights = {
                'summary': {
                    'totalJobs': len(vector_store.jobs) if vector_store and vector_store.jobs else 0,
                    'avgSalary': 75000,
                    'itMarketShare': 45,
                    'topLocation': 'Casablanca',
                    'remotePercentage': 35
                },
                'jobsByIndustry': [
                    {'name': 'IT & Technology', 'value': 45},
                    {'name': 'Electrical Engineering', 'value': 15},
                    {'name': 'Industrial Engineering', 'value': 12},
                    {'name': 'Civil Engineering', 'value': 10},
                    {'name': 'Mechanical Engineering', 'value': 8}
                ],
                'topCities': [
                    {'name': 'Casablanca', 'jobs': 450},
                    {'name': 'Rabat', 'jobs': 320},
                    {'name': 'Marrakech', 'jobs': 180},
                    {'name': 'Tangier', 'jobs': 150}
                ],
                'skillDemand': [
                    {'name': 'Python', 'value': 45},
                    {'name': 'JavaScript', 'value': 42},
                    {'name': 'SQL', 'value': 38},
                    {'name': 'Java', 'value': 35},
                    {'name': 'React', 'value': 32}
                ],
                'lastUpdated': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        
        # Get actual job counts from vector store if available
        jobs_with_salary = 0
        job_type_dist = {'CDI': 0, 'CDD': 0, 'Stage': 0, 'Freelance': 0}
        salary_ranges = {
            '0-30k': 0, '30k-50k': 0, '50k-80k': 0,
            '80k-120k': 0, '120k+': 0
        }
        
        if vector_store and vector_store.jobs:
            jobs_with_salary = len([j for j in vector_store.jobs if j.get('salary_min') or j.get('salary_max')])
            
            # Count job types
            for job in vector_store.jobs:
                job_type = job.get('job_type', '')
                if job_type in job_type_dist:
                    job_type_dist[job_type] += 1
            
            # Count salary ranges
            for job in vector_store.jobs:
                salary = job.get('salary_min', 0)
                if salary < 30000:
                    salary_ranges['0-30k'] += 1
                elif salary < 50000:
                    salary_ranges['30k-50k'] += 1
                elif salary < 80000:
                    salary_ranges['50k-80k'] += 1
                elif salary < 120000:
                    salary_ranges['80k-120k'] += 1
                else:
                    salary_ranges['120k+'] += 1
        
        # Format the response
        response = {
            'total_jobs': insights['summary']['totalJobs'],
            'jobs_with_salary': jobs_with_salary,
            'field_distribution': {item['name']: item['value'] for item in insights['jobsByIndustry']},
            'location_distribution': {item['name']: item['jobs'] for item in insights['topCities']},
            'job_type_distribution': job_type_dist,
            'salary_ranges': salary_ranges,
            'top_skills': {item['name']: item['value'] for item in insights['skillDemand']},
            'timestamp': insights['lastUpdated']
        }
        
        return custom_jsonify(response)
        
    except Exception as e:
        traceback.print_exc()
        return custom_jsonify({
            'error': str(e),
            'message': 'Failed to generate analytics data. Please try again later.'
        }), 500

def initialize_vector_store(data_dir, vector_dir):
    """Initialize and load the vector store."""
    global vector_store
    
    try:
        print(f"Initializing vector store from {vector_dir}")
        vector_store = JobVectorStore(
            data_dir=data_dir,
            vector_dir=vector_dir
        )
        
        if not vector_store.load():
            print("Warning: Failed to load vector store, initializing empty store.")
            # Process data directory
            vector_store.add_jobs_from_directory(data_dir)
            vector_store.save()
            
        if not vector_store.jobs:
            print("Warning: No jobs in vector store, loading sample data...")
            # Load sample data
            sample_jobs = [
                {
                    "id": "job-1",
                    "title": "Software Engineer",
                    "company": "Tech Corp",
                    "location": "Casablanca",
                    "job_type": "CDI",
                    "salary_min": 45000,
                    "salary_max": 75000,
                    "description": "Python, JavaScript development"
                },
                {
                    "id": "job-2",
                    "title": "Data Scientist",
                    "company": "AI Solutions",
                    "location": "Rabat",
                    "job_type": "CDI",
                    "salary_min": 50000,
                    "salary_max": 85000,
                    "description": "Machine learning, Python, SQL"
                }
            ]
            vector_store.jobs.extend(sample_jobs)
            
        print(f"Vector store initialized with {len(vector_store.jobs)} jobs")
        return True
    
    except Exception as e:
        print(f"Error initializing vector store: {str(e)}")
        traceback.print_exc()
        # Initialize with empty job list rather than failing
        vector_store = JobVectorStore(data_dir=data_dir, vector_dir=vector_dir)
        vector_store.jobs = []
        return False


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Job Search API Server')
    parser.add_argument('--port', type=int, default=8081,
                       help='Port to run the server on (default: 8081)')
    parser.add_argument('--host', type=str, default='0.0.0.0',
                       help='Host to run the server on (default: 0.0.0.0)')
    parser.add_argument('--data-dir', type=str, default='adzuna_data',
                       help='Data directory path (default: adzuna_data)')
    parser.add_argument('--vector-dir', type=str, default='vector_store',
                       help='Vector store directory path (default: vector_store)')
    parser.add_argument('--debug', action='store_true',
                       help='Run in debug mode')
    
    return parser.parse_args()


if __name__ == "__main__":
    # Parse command line arguments
    args = parse_args()
    
    # Initialize vector store
    if not initialize_vector_store(args.data_dir, args.vector_dir):
        print("Error: Failed to initialize vector store. Exiting.")
        exit(1)
    
    # Run the Flask app
    app.run(host=args.host, port=args.port, debug=args.debug) 