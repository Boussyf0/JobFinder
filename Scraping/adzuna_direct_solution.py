import requests
import json
import os
import time
import csv
import urllib.parse
from datetime import datetime

class AdzunaDirectSolution:
    """
    A direct solution for getting job data that might be relevant to Morocco
    using the GB (UK) Adzuna API, which has better international coverage.
    """
    
    def __init__(self, app_id: str = "e1ad5111", app_key: str = "1ff882c979b3403a7e2c47cfdc6a6578", 
                output_dir: str = "adzuna_data"):
        """
        Initialize the Adzuna direct solution.
        
        Args:
            app_id: Your Adzuna API application ID
            app_key: Your Adzuna API key
            output_dir: Directory to save output files
        """
        self.app_id = app_id
        self.app_key = app_key
        self.country = "gb"  # Use UK endpoint which has better international coverage
        self.base_url = "https://api.adzuna.com/v1/api"
        self.output_dir = output_dir
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
    def log(self, message: str, level: str = "INFO") -> None:
        """Log a message with timestamp and level."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def _make_request(self, endpoint: str, params: dict = None) -> dict:
        """
        Make a request to the Adzuna API.
        
        Args:
            endpoint: API endpoint to call
            params: Query parameters
            
        Returns:
            JSON response or empty dict if request failed
        """
        if params is None:
            params = {}
            
        # Add authentication parameters
        params.update({
            "app_id": self.app_id,
            "app_key": self.app_key,
            "content-type": "application/json"
        })
        
        url = f"{self.base_url}/{endpoint}"
        self.log(f"Calling API: {url}")
        
        try:
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                return response.json()
            else:
                self.log(f"API error: {response.status_code} - {response.text}", "ERROR")
                return {}
                
        except requests.exceptions.RequestException as e:
            self.log(f"Request exception: {str(e)}", "ERROR")
            return {}
        except json.JSONDecodeError:
            self.log(f"Invalid JSON response", "ERROR")
            return {}
    
    def search_jobs(self, what: str, page: int = 1, results_per_page: int = 50) -> dict:
        """
        Search for jobs.
        
        Args:
            what: Search query
            page: Page number
            results_per_page: Number of results per page
            
        Returns:
            Dictionary with search results
        """
        endpoint = f"jobs/{self.country}/search/{page}"
        
        # Prepare parameters
        params = {
            "results_per_page": results_per_page,
            "what": urllib.parse.quote(what),
            "sort_by": "relevance"  # Sort by relevance to get best matches first
        }
        
        # Make request
        data = self._make_request(endpoint, params)
        if data and "results" in data:
            jobs = data["results"]
            total = data.get("count", 0)
            self.log(f"Found {len(jobs)} jobs (Total: {total}) for '{what}'")
            return data
        return {"results": [], "count": 0}
    
    def save_jobs_to_csv(self, jobs: list, filename: str, specialty: str = None) -> str:
        """
        Save jobs to a CSV file.
        
        Args:
            jobs: List of job dictionaries
            filename: Base filename
            specialty: Job specialty (optional)
            
        Returns:
            Path to saved file
        """
        if not jobs:
            self.log(f"No jobs to save", "WARN")
            return None
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if specialty:
            full_filename = f"{filename}_{specialty}_{timestamp}.csv"
        else:
            full_filename = f"{filename}_{timestamp}.csv"
            
        filepath = os.path.join(self.output_dir, full_filename)
        
        fieldnames = [
            "title", "company", "location", "description", 
            "salary_min", "salary_max", "contract_type",
            "created", "redirect_url", "category", "specialty"
        ]
        
        self.log(f"Saving {len(jobs)} jobs to {filepath}")
        
        with open(filepath, mode="w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for job in jobs:
                row = {
                    "title": job.get("title", "").strip(),
                    "company": job.get("company", {}).get("display_name", "").strip(),
                    "location": job.get("location", {}).get("display_name", "").strip(),
                    "description": job.get("description", "").strip(),
                    "salary_min": job.get("salary_min", ""),
                    "salary_max": job.get("salary_max", ""),
                    "contract_type": job.get("contract_type", ""),
                    "created": job.get("created", ""),
                    "redirect_url": job.get("redirect_url", ""),
                    "category": job.get("category", {}).get("label", ""),
                    "specialty": specialty or ""
                }
                writer.writerow(row)
        
        self.log(f"Successfully saved jobs to {filepath}")
        return filepath
    
    def run_analysis(self, specialties: dict, max_pages: int = 2) -> dict:
        """
        Run a comprehensive analysis of job data.
        
        Args:
            specialties: Dictionary mapping specialties to keywords
            max_pages: Maximum pages to fetch per keyword
            
        Returns:
            Dictionary with analysis results
        """
        results = {
            "job_count": 0,
            "specialties": {}
        }
        
        # For each specialty
        for specialty, keywords in specialties.items():
            self.log(f"\n🔍 Analyzing specialty: {specialty.replace('_', ' ').title()}")
            specialty_results = {
                "keywords": {},
                "jobs": []
            }
            
            # For each keyword
            for keyword in keywords:
                self.log(f"🔎 Analyzing keyword: {keyword}")
                all_jobs = []
                
                # Try various queries to maximize chances of finding relevant jobs
                search_queries = [
                    keyword,  # Basic keyword
                    f"{keyword} remote",  # Remote jobs
                    f"{keyword} international",  # International jobs
                    f"{keyword} global",  # Global jobs
                    f"{keyword} africa"  # African jobs
                ]
                
                for query in search_queries:
                    self.log(f"  Trying query: '{query}'")
                    
                    # Search jobs
                    for page in range(1, max_pages + 1):
                        search_results = self.search_jobs(query, page=page)
                        if "results" in search_results:
                            jobs = search_results["results"]
                            if jobs:
                                # Add specialty info
                                for job in jobs:
                                    job["specialty"] = specialty
                                    job["search_query"] = query
                                
                                all_jobs.extend(jobs)
                                
                                # If we got fewer results than asked for, no need for more pages
                                if len(jobs) < 50:
                                    break
                            else:
                                break
                                
                        time.sleep(1)  # Pause to avoid rate limiting
                    
                    time.sleep(2)  # Pause between queries
                
                # Process jobs for this keyword
                self.log(f"Found {len(all_jobs)} jobs across all queries for '{keyword}'")
                
                if all_jobs:
                    # Save jobs for this keyword
                    self.save_jobs_to_csv(all_jobs, f"jobs_{specialty}", specialty=keyword)
                    
                    # Add to results
                    specialty_results["keywords"][keyword] = {
                        "job_count": len(all_jobs),
                        "queries": search_queries
                    }
                    
                    specialty_results["jobs"].extend(all_jobs)
                
                time.sleep(2)  # Pause between keywords
            
            # Save jobs for this specialty
            if specialty_results["jobs"]:
                job_count = len(specialty_results["jobs"])
                self.log(f"Total: {job_count} jobs for specialty {specialty}")
                
                self.save_jobs_to_csv(specialty_results["jobs"], 
                                     f"jobs_{specialty}_all", 
                                     specialty=specialty)
                
                results["job_count"] += job_count
                results["specialties"][specialty] = specialty_results
        
        # Save combined results
        all_jobs = []
        for specialty_data in results["specialties"].values():
            all_jobs.extend(specialty_data["jobs"])
            
        if all_jobs:
            self.save_jobs_to_csv(all_jobs, "all_jobs")
            self.log(f"Total jobs collected across all specialties: {len(all_jobs)}")
        
        # Save summary
        self.log(f"\n📊 Analysis complete:")
        self.log(f"Total jobs collected: {results['job_count']}")
        
        return results


# Moroccan job market specialties and keywords - more targeted keywords
MOROCCO_SPECIALTIES = {
    "development": [
        "developer", "programmer", "software engineer", "web developer",
        "frontend", "backend", "fullstack", "data scientist", "mobile dev"
    ],
    "engineering": [
        "engineer", "engineering", "electrical engineer", "mechanical engineer",
        "civil engineer", "process engineer", "engineering manager"
    ],
    "finance": [
        "accountant", "finance", "financial analyst", "accounting",
        "controller", "auditor", "banking", "finance manager"
    ],
    "business": [
        "marketing", "sales", "business development", "account manager",
        "marketing manager", "digital marketing", "e-commerce"
    ],
    "management": [
        "manager", "director", "project manager", "team lead",
        "head of", "chief", "executive"
    ]
}

# More concise version for faster testing
TEST_SPECIALTIES = {
    "development": [
        "developer", "software engineer"
    ],
    "finance": [
        "accountant", "finance"
    ]
}

if __name__ == "__main__":
    try:
        # Initialize direct solution
        adzuna = AdzunaDirectSolution()
        
        # Run analysis
        adzuna.log("🚀 Starting direct analysis of international job data")
        
        # Use this for full analysis
        results = adzuna.run_analysis(MOROCCO_SPECIALTIES)
        
        # Use this for quick testing
        # results = adzuna.run_analysis(TEST_SPECIALTIES, max_pages=1)
        
        adzuna.log("🏁 Analysis completed!")
        
    except KeyboardInterrupt:
        print("\n⚠️ Analysis interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc() 