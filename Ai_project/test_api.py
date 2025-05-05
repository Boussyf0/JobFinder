#!/usr/bin/env python3
"""
Test script for the job search API to debug API connection issues
"""

import requests
import json

API_URL = "http://localhost:8081/api"

def test_jobs_search():
    """Test the jobs search endpoint with different parameters"""
    print("Testing /api/jobs/search endpoint...")
    
    # Try with minimal parameters
    response = requests.get(f"{API_URL}/jobs/search", params={"limit": 5})
    
    print(f"Status code: {response.status_code}")
    try:
        data = response.json()
        job_count = len(data.get('jobs', []))
        print(f"Received {job_count} jobs")
        
        if job_count > 0:
            # Print the first job
            print("\nFirst job:")
            first_job = data['jobs'][0]
            print(f"ID: {first_job.get('id')}")
            print(f"Title: {first_job.get('title')}")
            print(f"Company: {first_job.get('company')}")
            print(f"Location: {first_job.get('location')}")
        else:
            print("No jobs received!")
            print(f"Response data: {data}")
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Raw response: {response.text[:500]}...")

def test_vector_store():
    """Print information about the vector store by accessing the recommendations endpoint"""
    print("\nTesting the vector store via recommendations endpoint...")
    
    response = requests.get(f"{API_URL}/jobs/recommendations", params={"limit": 2})
    
    print(f"Status code: {response.status_code}")
    try:
        data = response.json()
        job_count = len(data.get('jobs', []))
        print(f"Received {job_count} recommendations")
        
        if job_count > 0:
            print("\nSample recommendation:")
            job = data['jobs'][0]
            print(f"ID: {job.get('id')}")
            print(f"Title: {job.get('title')}")
        else:
            print("No recommendations received!")
            print(f"Response data: {data}")
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Raw response: {response.text[:500]}...")

if __name__ == "__main__":
    print("API Testing Script")
    print("=================")
    
    # Test the search endpoint
    test_jobs_search()
    
    # Test recommendations / vector store
    test_vector_store()
    
    print("\nTesting complete!") 