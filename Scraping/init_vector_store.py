#!/usr/bin/env python3
"""
Initialize the vector store with sample job data.
"""

import os
import pickle
import datetime
import random
import uuid

class JobVectorStore:
    def __init__(self):
        self.jobs = []

def generate_sample_jobs(count=50):
    """Generate sample job data"""
    job_titles = [
        "Software Engineer", "Frontend Developer", "Backend Developer",
        "Full Stack Developer", "DevOps Engineer", "Data Scientist",
        "Machine Learning Engineer", "AI Specialist", "Cloud Engineer",
        "Mobile Developer", "UI/UX Designer", "Product Manager"
    ]
    
    companies = [
        "TechCorp", "InnovateSoft", "DataMinds", "CloudNative",
        "MobileTech", "AILabs", "WebSolutions", "DevTeam",
        "SmartSystems", "TechGrowth", "CodeMasters", "DigitalFuture"
    ]
    
    locations = [
        "Casablanca", "Rabat", "Marrakech", "Tangier", "Fez",
        "Agadir", "Meknes", "Oujda", "Kenitra", "Tetouan"
    ]
    
    job_types = ["CDI", "CDD", "Stage", "Freelance"]
    
    skills_pool = [
        "JavaScript", "TypeScript", "React", "Angular", "Vue.js",
        "Node.js", "Python", "Django", "Flask", "FastAPI",
        "Java", "Spring Boot", "PHP", "Laravel", "Ruby on Rails",
        "C#", ".NET", "Go", "Rust", "Kotlin", "Swift",
        "HTML", "CSS", "SASS", "Docker", "Kubernetes",
        "AWS", "Azure", "GCP", "CI/CD", "Git",
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
        "GraphQL", "REST API", "Microservices", "TDD", "Agile"
    ]
    
    jobs = []
    now = datetime.datetime.now()
    
    for i in range(count):
        # Generate random job data
        title = random.choice(job_titles)
        company = random.choice(companies)
        location = random.choice(locations)
        job_type = random.choice(job_types)
        remote = random.choice([True, False])
        
        # Generate random skills (3-7 skills)
        skills_count = random.randint(3, 7)
        skills = random.sample(skills_pool, skills_count)
        
        # Generate random salary range
        salary_min = random.randint(30000, 80000)
        salary_max = salary_min + random.randint(10000, 40000)
        
        # Generate random date (within last 30 days)
        days_ago = random.randint(0, 30)
        created = (now - datetime.timedelta(days=days_ago)).strftime("%Y-%m-%d")
        
        # Generate description
        description = f"We are looking for a {title} to join our team at {company}. "
        description += f"This is a {job_type} position "
        description += "with remote work options. " if remote else "based in our office. "
        description += f"The ideal candidate will have experience with {', '.join(skills[:3])}. "
        description += f"Salary range: {salary_min} - {salary_max} MAD."
        
        # Create job object
        job = {
            "id": str(uuid.uuid4()),
            "title": title,
            "company": company,
            "location": location,
            "job_type": job_type,
            "remote_friendly": remote,
            "skills": skills,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "created": created,
            "description": description,
            "category": "Engineering",
            "redirect_url": f"https://example.com/jobs/{i}"
        }
        
        jobs.append(job)
    
    return jobs

def main():
    # Create vector store directory if it doesn't exist
    vector_dir = os.path.join(os.path.dirname(__file__), "vector_store")
    os.makedirs(vector_dir, exist_ok=True)
    
    # Create vector store file path
    vector_store_path = os.path.join(vector_dir, "job_vector_store.pkl")
    
    # Create vector store with sample jobs
    vector_store = JobVectorStore()
    vector_store.jobs = generate_sample_jobs(50)
    
    # Save vector store
    with open(vector_store_path, "wb") as f:
        pickle.dump(vector_store, f)
    
    print(f"Vector store initialized with {len(vector_store.jobs)} sample jobs")

if __name__ == "__main__":
    main() 