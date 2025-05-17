import requests
import json
import os
import time
import csv
import urllib.parse
from datetime import datetime

class AdzunaSolution:
    """
    An improved solution for getting international job data from Adzuna API
    that properly handles search parameters and results filtering.
    """
    
    def __init__(self, app_id: str = "e1ad5111", app_key: str = "1ff882c979b3403a7e2c47cfdc6a6578", 
                output_dir: str = "adzuna_data"):
        """
        Initialize the Adzuna solution.
        
        Args:
            app_id: Your Adzuna API application ID
            app_key: Your Adzuna API key
            output_dir: Directory to save output files
        """
        self.app_id = app_id
        self.app_key = app_key
        # Try different countries
        self.countries = ["gb", "us", "fr", "ma"]  # UK, US, France, Morocco
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
    
    def search_jobs(self, what: str, country: str, page: int = 1, results_per_page: int = 50) -> dict:
        """
        Search for jobs.
        
        Args:
            what: Search query
            country: Country code
            page: Page number
            results_per_page: Number of results per page
            
        Returns:
            Dictionary with search results
        """
        endpoint = f"jobs/{country}/search/{page}"
        
        # Prepare parameters
        params = {
            "results_per_page": results_per_page,
            "what": what,  # No URL encoding - let requests handle it properly
            "sort_by": "relevance"  # Sort by relevance to get best matches first
        }
        
        # Make request
        data = self._make_request(endpoint, params)
        if data and "results" in data:
            jobs = data["results"]
            total = data.get("count", 0)
            self.log(f"Found {len(jobs)} jobs (Total: {total}) for '{what}' in {country}")
            return data
        return {"results": [], "count": 0}
    
    def search_remote_jobs(self, what: str, country: str, page: int = 1, results_per_page: int = 50) -> dict:
        """
        Search for remote jobs using specific remote parameters.
        
        Args:
            what: Search query
            country: Country code
            page: Page number
            results_per_page: Number of results per page
            
        Returns:
            Dictionary with search results
        """
        endpoint = f"jobs/{country}/search/{page}"
        
        # Prepare parameters with remote indicators
        # Use known remote job terms from Adzuna
        params = {
            "results_per_page": results_per_page,
            "what": what,
            "where": "remote",  # Add remote location
            "sort_by": "relevance"
        }
        
        # Make request
        data = self._make_request(endpoint, params)
        if data and "results" in data:
            jobs = data["results"]
            total = data.get("count", 0)
            self.log(f"Found {len(jobs)} remote jobs (Total: {total}) for '{what}' in {country}")
            return data
        return {"results": [], "count": 0}
    
    def tag_jobs(self, jobs: list, source_country: str, query: str, query_type: str = "standard") -> list:
        """
        Tag jobs with metadata.
        
        Args:
            jobs: List of job dictionaries
            source_country: Country code where jobs were found
            query: Search query
            query_type: Type of query (standard, remote, etc.)
            
        Returns:
            Tagged jobs
        """
        for job in jobs:
            job["source_country"] = source_country
            job["query"] = query
            job["query_type"] = query_type
            # Check if job might be remote-friendly
            description = job.get("description", "").lower()
            title = job.get("title", "").lower()
            job["remote_friendly"] = any(term in description or term in title for term in 
                                         ["remote", "work from home", "télétravail", "teletravail", 
                                          "home-based", "virtual", "anywhere"])
            # Check if job might be internationally accessible
            job["international"] = any(term in description or term in title for term in 
                                      ["international", "global", "worldwide", "africa", "morocco", "maroc", 
                                       "offshore", "nearshore", "foreign", "abroad", "overseas"])
        
        return jobs
    
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
            "created", "redirect_url", "category", "specialty",
            "source_country", "query", "query_type", "remote_friendly", "international"
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
                    "specialty": specialty or "",
                    "source_country": job.get("source_country", ""),
                    "query": job.get("query", ""),
                    "query_type": job.get("query_type", ""),
                    "remote_friendly": job.get("remote_friendly", False),
                    "international": job.get("international", False)
                }
                writer.writerow(row)
        
        self.log(f"Successfully saved jobs to {filepath}")
        return filepath
    
    def deduplicate_jobs(self, jobs: list) -> list:
        """
        Deduplicate jobs based on title and company.
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            Deduplicated jobs
        """
        seen = set()
        deduplicated = []
        
        for job in jobs:
            # Create a unique key for each job
            key = f"{job.get('title', '')}-{job.get('company', {}).get('display_name', '')}"
            
            if key not in seen:
                seen.add(key)
                deduplicated.append(job)
        
        self.log(f"Deduplicated {len(jobs)} jobs to {len(deduplicated)} unique jobs")
        return deduplicated
    
    def run_analysis(self, specialties: dict, max_pages: int = 2) -> dict:
        """
        Run a comprehensive analysis of job data across multiple countries.
        
        Args:
            specialties: Dictionary mapping specialties to keywords
            max_pages: Maximum pages to fetch per keyword
            
        Returns:
            Dictionary with analysis results
        """
        results = {
            "job_count": 0,
            "specialties": {},
            "countries": {}
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
                keyword_jobs = []
                
                # Try each country
                for country in self.countries:
                    country_jobs = []
                    
                    # Standard search
                    self.log(f"  Searching in {country} for '{keyword}'")
                    for page in range(1, max_pages + 1):
                        search_results = self.search_jobs(keyword, country, page)
                        if "results" in search_results and search_results["results"]:
                            jobs = search_results["results"]
                            tagged_jobs = self.tag_jobs(jobs, country, keyword, "standard")
                            country_jobs.extend(tagged_jobs)
                            
                            # If we got fewer results than asked for, no need for more pages
                            if len(jobs) < 50:
                                break
                        else:
                            break
                            
                        time.sleep(1)  # Pause to avoid rate limiting
                    
                    # Remote search for the same keyword
                    self.log(f"  Searching remote jobs in {country} for '{keyword}'")
                    search_results = self.search_remote_jobs(keyword, country)
                    if "results" in search_results and search_results["results"]:
                        jobs = search_results["results"]
                        tagged_jobs = self.tag_jobs(jobs, country, keyword, "remote")
                        country_jobs.extend(tagged_jobs)
                    
                    # Log country results
                    self.log(f"  Found {len(country_jobs)} jobs in {country} for '{keyword}'")
                    keyword_jobs.extend(country_jobs)
                    
                    # Track country stats
                    if country not in results["countries"]:
                        results["countries"][country] = 0
                    results["countries"][country] += len(country_jobs)
                    
                    time.sleep(2)  # Pause between countries
                
                # Deduplicate jobs for this keyword
                unique_keyword_jobs = self.deduplicate_jobs(keyword_jobs)
                
                # Process jobs for this keyword
                self.log(f"Found {len(unique_keyword_jobs)} unique jobs across all countries for '{keyword}'")
                
                if unique_keyword_jobs:
                    # Save jobs for this keyword
                    self.save_jobs_to_csv(unique_keyword_jobs, f"jobs_{specialty}", specialty=keyword)
                    
                    # Add to results
                    specialty_results["keywords"][keyword] = {
                        "job_count": len(unique_keyword_jobs)
                    }
                    
                    specialty_results["jobs"].extend(unique_keyword_jobs)
                
                time.sleep(2)  # Pause between keywords
            
            # Save jobs for this specialty
            unique_specialty_jobs = self.deduplicate_jobs(specialty_results["jobs"])
            if unique_specialty_jobs:
                job_count = len(unique_specialty_jobs)
                self.log(f"Total: {job_count} unique jobs for specialty {specialty}")
                
                self.save_jobs_to_csv(unique_specialty_jobs, 
                                     f"jobs_{specialty}_all", 
                                     specialty=specialty)
                
                results["job_count"] += job_count
                results["specialties"][specialty] = specialty_results
        
        # Save combined results
        all_jobs = []
        for specialty_data in results["specialties"].values():
            all_jobs.extend(specialty_data["jobs"])
            
        unique_all_jobs = self.deduplicate_jobs(all_jobs)
        if unique_all_jobs:
            self.save_jobs_to_csv(unique_all_jobs, "all_jobs")
            self.log(f"Total unique jobs collected across all specialties: {len(unique_all_jobs)}")
        
        # Save country statistics
        self.log("\n📊 Jobs by country:")
        for country, count in results["countries"].items():
            self.log(f"  {country.upper()}: {count} jobs")
        
        # Save Morocco-relevant jobs (remote or international)
        morocco_jobs = [job for job in unique_all_jobs if job.get("remote_friendly") or job.get("international")]
        if morocco_jobs:
            self.save_jobs_to_csv(morocco_jobs, "morocco_relevant_jobs")
            self.log(f"Found {len(morocco_jobs)} jobs that are potentially relevant for Morocco")
        
        # Save summary
        self.log(f"\n📊 Analysis complete:")
        self.log(f"Total unique jobs collected: {len(unique_all_jobs)}")
        self.log(f"Morocco-relevant jobs: {len(morocco_jobs)}")
        
        return results


# Improved job market specialties and keywords
JOB_SPECIALTIES = {
    "development": [
        "developer", "programmer", "software engineer", "web dev",
        "frontend developer", "backend developer", "full stack", "data scientist"
    ],
    "engineering": [
        "engineer", "engineering", "electrical engineer", "mechanical engineer",
        "civil engineer", "process engineer"
    ],
    "finance": [
        "accountant", "finance", "financial analyst", "accounting",
        "controller", "auditor", "banking"
    ],
    "business": [
        "marketing", "sales", "business development", "account manager",
        "digital marketing", "ecommerce"
    ],
    "management": [
        "manager", "director", "project manager", "team lead",
        "head of", "chief"
    ]
}

# Smaller test set for quick testing
TEST_SPECIALTIES = {
    "development": ["developer", "software engineer"],
    "finance": ["accountant", "finance"]
}

if __name__ == "__main__":
    try:
        # Initialize solution
        adzuna = AdzunaSolution()
        
        # Run analysis
        adzuna.log("🚀 Starting international job analysis with Adzuna API")
        
        # Full analysis
        # results = adzuna.run_analysis(JOB_SPECIALTIES)
        
        # Quick test run
        results = adzuna.run_analysis(TEST_SPECIALTIES, max_pages=1)
        
        adzuna.log("🏁 Analysis completed!")
        
    except KeyboardInterrupt:
        print("\n⚠️ Analysis interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc() 