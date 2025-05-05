import requests
import json
import os
import time
import csv
import urllib.parse
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt
from typing import Dict, List, Any, Optional, Tuple

class AdzunaAPI:
    """
    A comprehensive client for the Adzuna API that provides access to all
    available endpoints including search, categories, histogram, top companies,
    geodata, and history.
    """
    
    def __init__(self, app_id: str, app_key: str, country: str = "ma", 
                 fallback_countries: List[str] = None, output_dir: str = "adzuna_data"):
        """
        Initialize the Adzuna API client.
        
        Args:
            app_id: Your Adzuna API application ID
            app_key: Your Adzuna API key
            country: Primary country code to search (default: "ma" for Morocco)
            fallback_countries: List of country codes to try if primary fails
            output_dir: Directory to save output files
        """
        self.app_id = "e1ad5111"
        self.app_key = "1ff882c979b3403a7e2c47cfdc6a6578"
        self.primary_country = country
        self.fallback_countries = fallback_countries or ["fr", "gb"]
        self.current_country = country
        self.base_url = "https://api.adzuna.com/v1/api"
        self.output_dir = output_dir
        self.categories = None
        
        # Create output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            os.makedirs(os.path.join(output_dir, "charts"), exist_ok=True)
        
    def log(self, message: str, level: str = "INFO") -> None:
        """Log a message with timestamp and level."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """
        Make a request to the Adzuna API.
        
        Args:
            endpoint: API endpoint to call
            params: Query parameters
            
        Returns:
            JSON response or None if request failed
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
            elif response.status_code == 404:
                self.log(f"API endpoint not found: {url}", "ERROR")
                return None
            else:
                self.log(f"API error: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log(f"Request exception: {str(e)}", "ERROR")
            return None
        except json.JSONDecodeError:
            self.log(f"Invalid JSON response", "ERROR")
            return None
    
    def try_countries(self, endpoint: str, params: Dict = None) -> Tuple[Optional[Dict], str]:
        """
        Try calling an endpoint with different countries if primary fails.
        
        Returns:
            Tuple of (response data, country code that worked)
        """
        # Try primary country first
        self.log(f"Trying primary country: {self.primary_country}")
        endpoint_with_country = endpoint.format(country=self.primary_country)
        data = self._make_request(endpoint_with_country, params)
        
        if data:
            return data, self.primary_country
            
        # Try fallback countries
        for country in self.fallback_countries:
            self.log(f"Trying fallback country: {country}")
            endpoint_with_country = endpoint.format(country=country)
            data = self._make_request(endpoint_with_country, params)
            
            if data:
                return data, country
                
        return None, ""
    
    def get_version(self) -> str:
        """Get the current version of the Adzuna API."""
        data = self._make_request("version")
        if data:
            return data.get("version", "Unknown")
        return "Unknown"
        
    def get_categories(self, country: str = None) -> List[Dict]:
        """
        Get available job categories.
        
        Args:
            country: Country code (uses instance default if None)
            
        Returns:
            List of category dictionaries
        """
        country = country or self.current_country
        endpoint = f"jobs/{country}/categories"
        
        data = self._make_request(endpoint)
        if data and "results" in data:
            self.categories = data["results"]
            return data["results"]
        return []
        
    def search_jobs(self, what: str, country: str = None, location: str = None, 
                    category: str = None, page: int = 1, results_per_page: int = 50) -> Dict:
        """
        Search for jobs with various filters.
        
        Args:
            what: Search query
            country: Country code (uses instance default if None)
            location: Location filter
            category: Category filter
            page: Page number
            results_per_page: Number of results per page
            
        Returns:
            Dictionary with search results
        """
        country = country or self.current_country
        endpoint = f"jobs/{country}/search/{page}"
        
        # Prepare parameters
        params = {
            "results_per_page": results_per_page,
            "what": urllib.parse.quote(what)
        }
        
        # Add optional parameters
        if location:
            params["where"] = location
        if category:
            params["category"] = category
            
        # Make request
        data = self._make_request(endpoint, params)
        if data:
            self.log(f"Found {len(data.get('results', []))} jobs (Total: {data.get('count', 0)})")
            return data
        return {"results": [], "count": 0}

    def get_histogram(self, what: str = None, country: str = None, 
                      location: str = None) -> Dict:
        """
        Get salary histogram data.
        
        Args:
            what: Search query (optional)
            country: Country code (uses instance default if None)
            location: Location filter (optional)
            
        Returns:
            Dictionary with histogram data
        """
        country = country or self.current_country
        endpoint = f"jobs/{country}/histogram"
        
        params = {}
        if what:
            params["what"] = urllib.parse.quote(what)
        if location:
            params["where"] = location
            
        data = self._make_request(endpoint, params)
        if data:
            return data
        return {}
        
    def get_top_companies(self, what: str, country: str = None, 
                          location: str = None) -> List[Dict]:
        """
        Get top companies for a search query.
        
        Args:
            what: Search query
            country: Country code (uses instance default if None)
            location: Location filter (optional)
            
        Returns:
            List of top companies
        """
        country = country or self.current_country
        endpoint = f"jobs/{country}/top_companies"
        
        params = {
            "what": urllib.parse.quote(what)
        }
        if location:
            params["where"] = location
            
        data = self._make_request(endpoint, params)
        if data and "leaderboard" in data:
            return data["leaderboard"]
        return []
        
    def get_geodata(self, what: str = None, country: str = None) -> Dict:
        """
        Get geographical salary data.
        
        Args:
            what: Search query (optional)
            country: Country code (uses instance default if None)
            
        Returns:
            Dictionary with geodata
        """
        country = country or self.current_country
        endpoint = f"jobs/{country}/geodata"
        
        params = {}
        if what:
            params["what"] = urllib.parse.quote(what)
            
        data = self._make_request(endpoint, params)
        if data:
            return data
        return {}
        
    def get_history(self, what: str = None, country: str = None, 
                    location: str = None) -> Dict:
        """
        Get historical salary data.
        
        Args:
            what: Search query (optional)
            country: Country code (uses instance default if None)
            location: Location filter (optional)
            
        Returns:
            Dictionary with historical data
        """
        country = country or self.current_country
        endpoint = f"jobs/{country}/history"
        
        params = {}
        if what:
            params["what"] = urllib.parse.quote(what)
        if location:
            params["where"] = location
            
        data = self._make_request(endpoint, params)
        if data:
            return data
        return {}
    
    def save_jobs_to_csv(self, jobs: List[Dict], filename: str, 
                         specialty: str = None, country: str = None) -> str:
        """
        Save jobs to a CSV file.
        
        Args:
            jobs: List of job dictionaries
            filename: Base filename
            specialty: Job specialty (optional)
            country: Country code (optional)
            
        Returns:
            Path to saved file
        """
        if not jobs:
            self.log(f"No jobs to save", "WARN")
            return None
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if specialty and country:
            full_filename = f"{filename}_{specialty}_{country}_{timestamp}.csv"
        else:
            full_filename = f"{filename}_{timestamp}.csv"
            
        filepath = os.path.join(self.output_dir, full_filename)
        
        fieldnames = [
            "title", "company", "location", "description", 
            "salary_min", "salary_max", "contract_type",
            "created", "redirect_url", "category", "country", "specialty"
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
                    "country": country or self.current_country,
                    "specialty": specialty or ""
                }
                writer.writerow(row)
        
        self.log(f"Successfully saved jobs to {filepath}")
        return filepath
    
    def visualize_salary_histogram(self, histogram_data: Dict, 
                                   title: str = "Salary Distribution") -> str:
        """
        Create and save a visualization of salary histogram data.
        
        Args:
            histogram_data: Histogram data from the Adzuna API
            title: Chart title
            
        Returns:
            Path to saved chart image
        """
        if not histogram_data or "histogram" not in histogram_data:
            self.log("No histogram data to visualize", "WARN")
            return None
            
        try:
            # Extract data
            bins = []
            counts = []
            
            for item in histogram_data["histogram"]:
                bins.append(f"{item['from']}-{item['to']}")
                counts.append(item['count'])
                
            # Create dataframe
            df = pd.DataFrame({
                'salary_range': bins,
                'count': counts
            })
            
            # Sort by salary range
            df['from'] = df['salary_range'].apply(lambda x: int(x.split('-')[0]))
            df = df.sort_values('from')
            
            # Create plot
            plt.figure(figsize=(10, 6))
            plt.bar(df['salary_range'], df['count'])
            plt.title(title)
            plt.xlabel('Salary Range')
            plt.ylabel('Number of Jobs')
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Save figure
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_title = title.replace(' ', '_').lower()
            filename = f"salary_histogram_{safe_title}_{timestamp}.png"
            filepath = os.path.join(self.output_dir, "charts", filename)
            
            plt.savefig(filepath)
            plt.close()
            
            self.log(f"Saved salary histogram to {filepath}")
            return filepath
            
        except Exception as e:
            self.log(f"Error visualizing histogram: {str(e)}", "ERROR")
            return None

    def visualize_top_companies(self, companies: List[Dict], 
                               title: str = "Top Companies") -> str:
        """
        Create and save a visualization of top companies.
        
        Args:
            companies: List of company dictionaries
            title: Chart title
            
        Returns:
            Path to saved chart image
        """
        if not companies:
            self.log("No company data to visualize", "WARN")
            return None
            
        try:
            # Extract data
            names = [company['canonical_name'] for company in companies]
            counts = [company['count'] for company in companies]
            
            # Limit to top 15 companies
            if len(names) > 15:
                names = names[:15]
                counts = counts[:15]
                
            # Create plot
            plt.figure(figsize=(12, 8))
            plt.barh(names, counts)
            plt.title(title)
            plt.xlabel('Number of Job Postings')
            plt.tight_layout()
            
            # Save figure
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_title = title.replace(' ', '_').lower()
            filename = f"top_companies_{safe_title}_{timestamp}.png"
            filepath = os.path.join(self.output_dir, "charts", filename)
            
            plt.savefig(filepath)
            plt.close()
            
            self.log(f"Saved top companies chart to {filepath}")
            return filepath
            
        except Exception as e:
            self.log(f"Error visualizing top companies: {str(e)}", "ERROR")
            return None
            
    def visualize_historical_data(self, history_data: Dict, 
                                 title: str = "Historical Salary Trends") -> str:
        """
        Create and save a visualization of historical salary data.
        
        Args:
            history_data: Historical data from the Adzuna API
            title: Chart title
            
        Returns:
            Path to saved chart image
        """
        if not history_data or "month" not in history_data:
            self.log("No historical data to visualize", "WARN")
            return None
            
        try:
            # Extract data
            months = []
            avg_salaries = []
            
            for month, data in history_data["month"].items():
                months.append(month)
                avg_salaries.append(data.get("average", 0))
                
            # Create dataframe and sort by date
            df = pd.DataFrame({
                'month': months,
                'average_salary': avg_salaries
            })
            df['month'] = pd.to_datetime(df['month'])
            df = df.sort_values('month')
            
            # Create plot
            plt.figure(figsize=(12, 6))
            plt.plot(df['month'], df['average_salary'], marker='o')
            plt.title(title)
            plt.xlabel('Month')
            plt.ylabel('Average Salary')
            plt.grid(True)
            plt.tight_layout()
            
            # Save figure
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_title = title.replace(' ', '_').lower()
            filename = f"salary_history_{safe_title}_{timestamp}.png"
            filepath = os.path.join(self.output_dir, "charts", filename)
            
            plt.savefig(filepath)
            plt.close()
            
            self.log(f"Saved historical salary chart to {filepath}")
            return filepath
            
        except Exception as e:
            self.log(f"Error visualizing historical data: {str(e)}", "ERROR")
            return None

    def run_full_analysis(self, specialty_keywords: Dict[str, List[str]], 
                         max_pages: int = 3) -> Dict:
        """
        Run a full analysis including search, top companies, histogram, and history
        for each specialty and keyword.
        
        Args:
            specialty_keywords: Dictionary of specialties and keywords
            max_pages: Maximum pages to fetch per keyword
            
        Returns:
            Dictionary with analysis results
        """
        results = {
            "job_count": 0,
            "specialties": {},
            "visualizations": []
        }
        
        # Get API version
        api_version = self.get_version()
        self.log(f"Using Adzuna API version: {api_version}")
        
        # Try to get categories
        categories_data, working_country = self.try_countries("jobs/{country}/categories")
        if categories_data:
            self.current_country = working_country
            self.log(f"Using country: {working_country}")
            if "results" in categories_data:
                self.categories = categories_data["results"]
                self.log(f"Found {len(self.categories)} job categories")
                
        # For each specialty
        for specialty, keywords in specialty_keywords.items():
            self.log(f"\n🔍 Analyzing specialty: {specialty.replace('_', ' ').title()}")
            specialty_results = {
                "jobs": [],
                "top_companies": {},
                "visualizations": []
            }
            
            # For each keyword
            for keyword in keywords:
                self.log(f"🔎 Analyzing keyword: {keyword}")
                all_jobs = []
                
                # Search jobs
                for page in range(1, max_pages + 1):
                    search_results = self.search_jobs(keyword, page=page)
                    if "results" in search_results:
                        jobs = search_results["results"]
                        if jobs:
                            # Add specialty and keyword info
                            for job in jobs:
                                job["specialty"] = specialty
                                job["search_keyword"] = keyword
                            all_jobs.extend(jobs)
                            
                            # If we got fewer results than we asked for, no need for more pages
                            if len(jobs) < 50:
                                break
                        else:
                            break
                    time.sleep(1)  # Pause to avoid rate limiting
                
                self.log(f"Found {len(all_jobs)} jobs for keyword '{keyword}'")
                
                if all_jobs:
                    # Save jobs for this keyword
                    self.save_jobs_to_csv(all_jobs, f"jobs_{specialty}", 
                                         specialty=specialty, 
                                         country=self.current_country)
                    
                    specialty_results["jobs"].extend(all_jobs)
                    
                    # Get top companies
                    top_companies = self.get_top_companies(keyword)
                    if top_companies:
                        self.log(f"Found {len(top_companies)} top companies for '{keyword}'")
                        specialty_results["top_companies"][keyword] = top_companies
                        
                        # Visualize top companies
                        viz_path = self.visualize_top_companies(
                            top_companies, 
                            f"Top Companies - {specialty.replace('_', ' ').title()} - {keyword}"
                        )
                        if viz_path:
                            specialty_results["visualizations"].append({
                                "type": "top_companies",
                                "keyword": keyword,
                                "path": viz_path
                            })
                    
                    # Get salary histogram
                    histogram_data = self.get_histogram(keyword)
                    if histogram_data and "histogram" in histogram_data:
                        self.log(f"Got salary histogram data for '{keyword}'")
                        
                        # Visualize histogram
                        viz_path = self.visualize_salary_histogram(
                            histogram_data,
                            f"Salary Distribution - {specialty.replace('_', ' ').title()} - {keyword}"
                        )
                        if viz_path:
                            specialty_results["visualizations"].append({
                                "type": "salary_histogram",
                                "keyword": keyword,
                                "path": viz_path
                            })
                    
                    # Get historical data
                    history_data = self.get_history(keyword)
                    if history_data and "month" in history_data:
                        self.log(f"Got historical salary data for '{keyword}'")
                        
                        # Visualize historical data
                        viz_path = self.visualize_historical_data(
                            history_data,
                            f"Salary Trends - {specialty.replace('_', ' ').title()} - {keyword}"
                        )
                        if viz_path:
                            specialty_results["visualizations"].append({
                                "type": "salary_history",
                                "keyword": keyword,
                                "path": viz_path
                            })
                    
                time.sleep(2)  # Pause between keywords
            
            # Save all jobs for this specialty
            specialty_jobs = specialty_results["jobs"]
            if specialty_jobs:
                self.log(f"Total: {len(specialty_jobs)} jobs for specialty {specialty}")
                results["job_count"] += len(specialty_jobs)
                results["specialties"][specialty] = specialty_results
                results["visualizations"].extend(specialty_results["visualizations"])
        
        # Save combined results
        all_jobs = []
        for specialty, data in results["specialties"].items():
            all_jobs.extend(data["jobs"])
            
        if all_jobs:
            self.save_jobs_to_csv(all_jobs, "all_jobs")
            self.log(f"Total jobs collected across all specialties: {len(all_jobs)}")
            
        return results


# Main execution
if __name__ == "__main__":
    # Adzuna credentials
    APP_ID = "e1ad5111"
    APP_KEY = "1ff882c979b3403a7e2c47cfdc6a6578"
    
    # Initialize API client
    adzuna = AdzunaAPI(APP_ID, APP_KEY)
    
    # Specialties and keywords
    specialties = {
        "ingenierie_informatique": [
            "développeur", "software", "developer", "data", "web"
        ],
        "genie_electrique": [
            "électrique", "électronique", "automatisme"
        ],
        "genie_industriel": [
            "industriel", "production", "logistique", "manufacturing"
        ],
        "genie_civil_btp": [
            "génie civil", "construction", "bâtiment", "chantier"
        ],
        "genie_financier": [
            "finance", "comptabilité", "analyste", "comptable"
        ]
    }
    
    try:
        # Run full analysis
        adzuna.log("🚀 Starting Adzuna API comprehensive analysis")
        results = adzuna.run_full_analysis(specialties, max_pages=2)
        adzuna.log(f"🏁 Analysis completed. Total jobs: {results['job_count']}")
        adzuna.log(f"📊 Generated {len(results['visualizations'])} visualizations")
        
    except KeyboardInterrupt:
        adzuna.log("\n⚠️ Analysis interrupted by user", "WARN")
    except Exception as e:
        adzuna.log(f"❌ Unexpected error: {str(e)}", "ERROR")
        import traceback
        traceback.print_exc() 