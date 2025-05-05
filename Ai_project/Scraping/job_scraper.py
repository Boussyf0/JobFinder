from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_stealth import stealth
from webdriver_manager.chrome import ChromeDriverManager
import csv
import os
import time
import random
import concurrent.futures
import threading
import queue
from datetime import datetime
import sys
from selenium.common.exceptions import (
    TimeoutException, 
    NoSuchElementException, 
    WebDriverException, 
    StaleElementReferenceException
)

# Thread local storage for WebDriver instances
thread_local = threading.local()

# Imports keywords from external file if available
try:
    print("Importing keywords from external file")
except ImportError:
    # Fallback to internal keywords configuration
    keywords_by_specialty = {
        "Ingénierie Informatique et Réseaux": [
            "ingénieur informatique", "développeur fullstack", "ingénieur réseaux", "cybersécurité", "devops"
        ],
        "Génie Électrique et Systèmes Intelligents": [
            "ingénieur électrotechnique", "automatisme", "smart grid", "IOT", "systèmes embarqués"
        ],
        "Génie Industriel": [
            "lean manufacturing", "supply chain", "gestion de production", "qualité industrielle", "logistique industrielle"
        ],
        "Génie Civil, Bâtiments et Travaux Publics": [
            "ingénieur génie civil", "BTP", "conducteur de travaux", "chef de chantier", "ouvrages d'art"
        ],
        "Génie Financier": [
            "ingénieur financier", "analyste financier", "audit", "modélisation financière", "contrôle de gestion"
        ]
    }

# Configuration
location = "Maroc"
output_file = "indeed_jobs_detailed.csv"
MAX_RETRIES = 3
PAGE_LOAD_TIMEOUT = 25
WAIT_BETWEEN_REQUESTS_MIN = 2
WAIT_BETWEEN_REQUESTS_MAX = 5
CAPTCHA_CHECK_DELAY = 15  # Time to wait if a captcha is detected
MAX_WORKERS = 3  # Number of parallel workers for scraping
MAX_PAGES_PER_KEYWORD = 5  # Maximum number of pages to scrape per keyword
RATE_LIMIT_PER_MINUTE = 20  # Maximum requests per minute
MEMORY_EFFICIENT = True  # Whether to use memory-efficient mode

# Shared state for rate limiting
last_requests = []
rate_limit_lock = threading.Lock()

# Queue for job data collection
job_data_queue = queue.Queue()

# Cache for job descriptions to avoid fetching the same job multiple times
job_description_cache = {}
job_cache_lock = threading.Lock()

def get_timestamp():
    """Get current timestamp in a readable format."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def log_message(message, level="INFO"):
    """Log a message with timestamp and level."""
    timestamp = get_timestamp()
    print(f"[{timestamp}] [{level}] {message}")

def check_rate_limit():
    """Check and enforce rate limiting."""
    with rate_limit_lock:
        current_time = time.time()
        # Remove requests older than 60 seconds
        global last_requests
        last_requests = [t for t in last_requests if current_time - t < 60]
        
        # Check if we've exceeded our rate limit
        if len(last_requests) >= RATE_LIMIT_PER_MINUTE:
            sleep_time = 60 - (current_time - last_requests[0])
            if sleep_time > 0:
                log_message(f"Rate limit reached. Sleeping for {sleep_time:.2f} seconds", "WARN")
                time.sleep(sleep_time)
        
        # Add current request to the list
        last_requests.append(time.time())

def setup_driver():
    """Set up the Chrome driver with appropriate options."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    # Randomize user agent
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
    ]
    options.add_argument(f"user-agent={random.choice(user_agents)}")
    
    # Performance optimizations
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-application-cache")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-features=VizDisplayCompositor")
    options.add_argument("--disable-features=IsolateOrigins,site-per-process")
    
    # Enable disk cache for better performance
    options.add_argument("--disk-cache-size=50000000")  # 50MB cache
    
    # Use eager page load strategy (faster)
    options.page_load_strategy = 'eager'
    
    # Disable images for faster page loads
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values.notifications": 2,
        "profile.managed_default_content_settings.stylesheets": 2,
        "profile.managed_default_content_settings.cookies": 1,
        "profile.managed_default_content_settings.javascript": 1,
        "profile.managed_default_content_settings.plugins": 1,
        "profile.managed_default_content_settings.popups": 2,
        "profile.managed_default_content_settings.geolocation": 2,
        "profile.managed_default_content_settings.media_stream": 2,
    }
    options.add_experimental_option("prefs", prefs)
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    
    # Stealth mode to avoid bot detection
    stealth(driver,
            languages=["fr-FR", "fr"],
            vendor="Google Inc.",
            platform="Win32",
            webgl_vendor="Intel Inc.",
            renderer="Intel Iris OpenGL Engine",
            fix_hairline=True)
    
    return driver

def get_thread_driver():
    """Get or create a thread-local WebDriver instance."""
    if not hasattr(thread_local, "driver"):
        thread_local.driver = setup_driver()
    return thread_local.driver

def random_sleep(min_time=WAIT_BETWEEN_REQUESTS_MIN, max_time=WAIT_BETWEEN_REQUESTS_MAX):
    """Sleep for a random time to avoid detection."""
    sleep_time = random.uniform(min_time, max_time)
    time.sleep(sleep_time)

def check_for_captcha(driver):
    """Check if a captcha is present and wait if needed."""
    try:
        captcha_indicators = [
            "//div[contains(text(), 'captcha')]",
            "//iframe[contains(@src, 'captcha')]",
            "//iframe[contains(@src, 'recaptcha')]",
            "//div[contains(@class, 'captcha')]"
        ]
        
        for indicator in captcha_indicators:
            if driver.find_elements(By.XPATH, indicator):
                log_message("Captcha détecté! Veuillez résoudre le captcha manuellement.", "WARN")
                log_message(f"Attente de {CAPTCHA_CHECK_DELAY} secondes...", "INFO")
                time.sleep(CAPTCHA_CHECK_DELAY)
                return True
        return False
    except:
        return False

def safe_find_element(driver, by, value, wait_time=10, default="Non spécifié"):
    """Safely find an element, return default value if not found."""
    try:
        element = WebDriverWait(driver, wait_time).until(
            EC.presence_of_element_located((by, value))
        )
        return element.text.strip()
    except (TimeoutException, NoSuchElementException, StaleElementReferenceException):
        return default

def get_job_description(driver, job_link, job_id=None):
    """Get job description from the job detail page."""
    if job_id and job_id in job_description_cache:
        return job_description_cache[job_id]
        
    description = "Non spécifié"
    try:
        # Check rate limit before making request
        check_rate_limit()
        
        # Open job link in the same window to avoid too many tabs
        current_url = driver.current_url
        driver.get(job_link)
        random_sleep(1, 3)  # Use shorter sleep for description pages
        
        # Check for captcha
        if check_for_captcha(driver):
            return "CAPTCHA détecté - veuillez réessayer plus tard"
        
        try:
            description = safe_find_element(driver, By.ID, "jobDescriptionText", wait_time=10)
        except:
            # Try alternative selectors
            selectors = [
                (By.CLASS_NAME, "jobsearch-jobDescriptionText"),
                (By.XPATH, "//div[contains(@class, 'description')]"),
                (By.XPATH, "//div[contains(@id, 'description')]")
            ]
            
            for selector_type, selector in selectors:
                try:
                    description_elem = driver.find_element(selector_type, selector)
                    description = description_elem.text.strip()
                    if description:
                        break
                except:
                    continue
        
        # Cache the result
        if job_id:
            with job_cache_lock:
                job_description_cache[job_id] = description
                
    except Exception as e:
        log_message(f"Erreur lors de l'obtention de la description: {str(e)}", "ERROR")
    
    return description

def extract_job_data(job, specialty, keyword):
    """Extract data from a job listing element safely."""
    job_data = {
        "specialty": specialty,
        "keyword": keyword,
        "title": "Non spécifié",
        "company": "Non spécifié",
        "salary": "Non spécifié",
        "summary": "Non spécifié",
        "description": "Non spécifié",
        "job_link": "Non spécifié",
        "job_id": f"{int(time.time())}-{random.randint(1000, 9999)}"  # Generate a unique ID
    }
    
    try:
        # Use try/except for each attribute to prevent one failure from skipping the job
        try:
            if job.find_elements(By.TAG_NAME, "h2"):
                job_data["title"] = job.find_element(By.TAG_NAME, "h2").text.strip()
        except (StaleElementReferenceException, NoSuchElementException):
            pass
        
        try:
            if job.find_elements(By.CSS_SELECTOR, "[data-testid='company-name']"):
                job_data["company"] = job.find_element(By.CSS_SELECTOR, "[data-testid='company-name']").text.strip()
        except (StaleElementReferenceException, NoSuchElementException):
            pass
        
        try:
            if job.find_elements(By.CLASS_NAME, "salary-snippet-container"):
                job_data["salary"] = job.find_element(By.CLASS_NAME, "salary-snippet-container").text.strip()
        except (StaleElementReferenceException, NoSuchElementException):
            pass
            
        try:
            if job.find_elements(By.CLASS_NAME, "job-snippet"):
                job_data["summary"] = job.find_element(By.CLASS_NAME, "job-snippet").text.strip()
        except (StaleElementReferenceException, NoSuchElementException):
            pass
        
        try:
            if job.find_elements(By.CSS_SELECTOR, "a"):
                job_data["job_link"] = job.find_element(By.CSS_SELECTOR, "a").get_attribute("href")
                
                # Try to extract job ID from URL
                try:
                    if "jk=" in job_data["job_link"]:
                        job_id = job_data["job_link"].split("jk=")[1].split("&")[0]
                        job_data["job_id"] = job_id
                except:
                    pass
        except (StaleElementReferenceException, NoSuchElementException):
            pass
    
    except Exception as e:
        log_message(f"Erreur lors de l'extraction des données: {str(e)}", "ERROR")
    
    return job_data

def process_job_listings(jobs_data, driver, specialty, keyword):
    """Process job listings to get detailed information."""
    results = []
    total = len(jobs_data)
    
    for i, job_data in enumerate(jobs_data):
        try:
            log_message(f"Traitement de l'offre {i+1}/{total}: {job_data.get('title')} | {job_data.get('company')}", "INFO")
            
            if job_data.get("job_link") != "Non spécifié":
                current_url = driver.current_url
                job_data["description"] = get_job_description(
                    driver, 
                    job_data["job_link"], 
                    job_data.get("job_id")
                )
                
                # Go back to search results only if needed
                if i < total - 1:  # Don't navigate back for the last job
                    driver.get(current_url)
                    random_sleep(1, 2)  # Shorter wait between job details
            
            results.append(job_data)
            
            # Add to the global queue for progressive saving
            job_data_queue.put(job_data)
            
        except Exception as e:
            log_message(f"Erreur lors du traitement d'une offre: {str(e)}", "ERROR")
            continue
    
    return results

def scrape_jobs_for_keyword(specialty, keyword):
    """Scrape jobs for a given keyword and specialty."""
    log_message(f"Scraping pour '{keyword}' ({specialty})", "INFO")
    driver = get_thread_driver()
    
    base_url = "https://ma.indeed.com/emplois"
    search_url = f"{base_url}?q={keyword.replace(' ', '+')}&l={location.replace(' ', '+')}"
    job_listings = []
    retry_count = 0
    
    while retry_count < MAX_RETRIES:
        try:
            # Check rate limit before making request
            check_rate_limit()
            
            driver.get(search_url)
            # Add extra wait time for the first load
            random_sleep(3, 6)
            
            if check_for_captcha(driver):
                retry_count += 1
                log_message(f"Captcha détecté! ({retry_count}/{MAX_RETRIES})", "WARN")
                if retry_count >= MAX_RETRIES:
                    log_message(f"Échec après {MAX_RETRIES} tentatives pour '{keyword}'", "ERROR")
                    return job_listings
                continue
            
            # Process pages one by one with a limit
            for page_number in range(1, MAX_PAGES_PER_KEYWORD + 1):
                try:
                    log_message(f"Page {page_number}/{MAX_PAGES_PER_KEYWORD}", "INFO")
                    
                    # Wait for job cards to load
                    try:
                        WebDriverWait(driver, 15).until(
                            EC.presence_of_element_located((By.ID, "mosaic-provider-jobcards"))
                        )
                    except TimeoutException:
                        # Try alternative element
                        try:
                            WebDriverWait(driver, 10).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, ".jobsearch-ResultsList"))
                            )
                        except TimeoutException:
                            log_message("Timeout en attendant les résultats de recherche.", "WARN")
                            break
                    
                    # Get all job listings at once
                    jobs = driver.find_elements(By.CLASS_NAME, "job_seen_beacon")
                    if not jobs:
                        # Try alternative selectors
                        jobs = driver.find_elements(By.CSS_SELECTOR, ".jobsearch-ResultsList > li")
                    
                    if not jobs:
                        log_message("Aucune offre trouvée sur cette page.", "WARN")
                        break
                    
                    log_message(f"Trouvé {len(jobs)} offres sur cette page", "INFO")
                    
                    # First extract all job data without visiting detail pages
                    jobs_data = []
                    for job in jobs:
                        try:
                            job_data = extract_job_data(job, specialty, keyword)
                            if job_data.get("title") != "Non spécifié":
                                jobs_data.append(job_data)
                        except StaleElementReferenceException:
                            log_message("Élément périmé, passe au suivant", "WARN")
                            continue
                        except Exception as e:
                            log_message(f"Erreur sur une offre: {str(e)}", "ERROR")
                            continue
                    
                    # Process job details
                    processed_jobs = process_job_listings(jobs_data, driver, specialty, keyword)
                    job_listings.extend(processed_jobs)
                    
                    # Memory optimization: clear the page DOM if needed
                    if MEMORY_EFFICIENT and page_number < MAX_PAGES_PER_KEYWORD:
                        driver.execute_script("document.body.innerHTML = '';")
                    
                    # Check if we should go to the next page
                    if page_number < MAX_PAGES_PER_KEYWORD:
                        # Try to go to next page
                        try:
                            next_buttons = driver.find_elements(By.CSS_SELECTOR, "a[data-testid='pagination-page-next']")
                            if not next_buttons:
                                # Try alternative selector
                                next_buttons = driver.find_elements(By.XPATH, "//a[contains(@aria-label, 'Next')]")
                            
                            if not next_buttons:
                                log_message("Dernière page atteinte.", "INFO")
                                break
                            
                            next_btn = next_buttons[0]
                            driver.execute_script("arguments[0].scrollIntoView(true);", next_btn)
                            random_sleep(1, 2)
                            driver.execute_script("arguments[0].click();", next_btn)
                            random_sleep(2, 4)  # Shorter wait for page transition
                        except Exception as e:
                            log_message(f"Dernière page atteinte ou erreur de navigation: {str(e)}", "WARN")
                            break
                
                except TimeoutException:
                    log_message(f"Timeout en attendant les résultats de recherche sur la page {page_number}.", "WARN")
                    # Specific handling for timeout - could be rate limiting
                    random_sleep(5, 10)  # Shorter wait
                    break
                    
                except Exception as e:
                    log_message(f"Erreur lors du scraping de la page {page_number}: {str(e)}", "ERROR")
                    break
            
            # If we got here with results, break the retry loop
            if job_listings:
                break
            
            retry_count += 1
            if retry_count < MAX_RETRIES:
                log_message(f"Nouvelle tentative ({retry_count}/{MAX_RETRIES}) avec un délai plus long...", "WARN")
                random_sleep(5, 10)  # Shorter wait between retries
            
        except WebDriverException as e:
            retry_count += 1
            log_message(f"Erreur de WebDriver ({retry_count}/{MAX_RETRIES}): {str(e)}", "ERROR")
            if retry_count >= MAX_RETRIES:
                log_message(f"Échec après {MAX_RETRIES} tentatives pour '{keyword}'", "ERROR")
                return job_listings
            
            log_message("Réinitialisation du WebDriver et nouvelle tentative...", "INFO")
            try:
                driver.quit()
            except:
                pass
            thread_local.driver = setup_driver()
            driver = thread_local.driver
            random_sleep(5, 10)  # Shorter wait before retry
            
        except Exception as e:
            log_message(f"Erreur inattendue: {str(e)}", "ERROR")
            retry_count += 1
            if retry_count >= MAX_RETRIES:
                break
            random_sleep(3, 7)
    
    log_message(f"Terminé pour '{keyword}' - {len(job_listings)} offres trouvées", "INFO")
    return job_listings

def save_jobs_worker():
    """Worker thread to save jobs from the queue to CSV file."""
    first_save = not os.path.isfile(output_file)
    
    try:
        while True:
            # Try to get a job from the queue with a timeout
            try:
                job_data = job_data_queue.get(timeout=1)
            except queue.Empty:
                # No jobs available, check if program is shutting down
                if getattr(threading.current_thread(), "stop_flag", False):
                    break
                continue
            
            try:
                with open(output_file, "a", newline="", encoding="utf-8") as f:
                    fieldnames = ["specialty", "keyword", "title", "company", "salary", "summary", "description"]
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    
                    if first_save:
                        writer.writeheader()
                        first_save = False
                    
                    # Remove 'job_id' and 'job_link' from data before saving
                    save_data = {k: v for k, v in job_data.items() if k in fieldnames}
                    writer.writerow(save_data)
            except Exception as e:
                log_message(f"Erreur lors de l'écriture dans le fichier CSV: {str(e)}", "ERROR")
            finally:
                job_data_queue.task_done()
    except Exception as e:
        log_message(f"Erreur dans le thread de sauvegarde: {str(e)}", "ERROR")

def scrape_with_pool(specialty, keywords):
    """Scrape jobs using a thread pool for better performance."""
    results = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Create a dictionary of futures to specialty/keyword pairs
        future_to_keyword = {
            executor.submit(scrape_jobs_for_keyword, specialty, keyword): keyword
            for keyword in keywords
        }
        
        for future in concurrent.futures.as_completed(future_to_keyword):
            keyword = future_to_keyword[future]
            try:
                jobs = future.result()
                results.extend(jobs)
                log_message(f"Terminé: {keyword} - {len(jobs)} offres", "INFO")
            except Exception as e:
                log_message(f"Erreur pour le mot-clé '{keyword}': {str(e)}", "ERROR")
    
    return results

def cleanup_resources():
    """Clean up all WebDriver instances and resources."""
    # Close all WebDriver instances
    for thread in threading.enumerate():
        if hasattr(thread, '_target') and thread._target == scrape_jobs_for_keyword:
            if hasattr(thread_local, "driver"):
                try:
                    thread_local.driver.quit()
                except:
                    pass

def main():
    """Main function to run the scraper."""
    start_time = time.time()
    log_message("Démarrage du scraper Indeed", "INFO")
    
    # Start the job saving worker thread
    save_thread = threading.Thread(target=save_jobs_worker)
    save_thread.daemon = True
    save_thread.start()
    
    all_jobs = []
    
    try:
        # Process specialties one by one
        for specialty, keywords in keywords_by_specialty.items():
            log_message(f"Traitement de la spécialité: {specialty}", "INFO")
            
            # Use thread pool to scrape jobs for each keyword in parallel
            specialty_jobs = scrape_with_pool(specialty, keywords)
            all_jobs.extend(specialty_jobs)
            
            log_message(f"Spécialité {specialty} terminée. {len(specialty_jobs)} offres trouvées.", "INFO")
            
            # Add longer pause between specialties
            pause_time = random.uniform(5, 10)
            log_message(f"Pause de {pause_time:.1f} secondes avant la prochaine spécialité...", "INFO")
            time.sleep(pause_time)
        
        # Signal the save thread to stop and wait for queue to be empty
        log_message("Attente de la fin des sauvegardes...", "INFO")
        job_data_queue.join()
        setattr(save_thread, "stop_flag", True)
        save_thread.join(timeout=10)
        
        # Final summary
        duration = time.time() - start_time
        log_message(f"Scraping terminé en {duration:.2f} secondes. {len(all_jobs)} offres enregistrées dans '{output_file}'.", "INFO")
        
    except KeyboardInterrupt:
        log_message("Interruption utilisateur détectée. Nettoyage des ressources...", "WARN")
        
    except Exception as e:
        log_message(f"Erreur dans le processus principal: {str(e)}", "ERROR")
        
    finally:
        # Clean up resources
        cleanup_resources()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterruption de l'utilisateur. Arrêt du programme.")
        sys.exit(0)
