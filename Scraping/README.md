# Indeed Job Scraper

Ce scraper permet de collecter automatiquement des offres d'emploi depuis Indeed Maroc, organisées par spécialité et mots-clés, avec stockage en base de données SQLite.

## Caractéristiques

- Recherche par mots-clés personnalisables
- Organisation des résultats par spécialité
- Extraction du titre, entreprise, salaire, résumé et description complète
- Stockage en base de données SQLite avec déduplication
- Export en CSV, JSON 
- Recherche et filtrage des offres
- Multi-threading pour des performances améliorées
- Gestion avancée des erreurs et mécanismes de reprise
- Contournement des détections anti-bot

## Installation

1. Créez un environnement virtuel Python:
   ```
   python -m venv env
   source env/bin/activate  # Sur Windows: env\Scripts\activate
   ```

2. Installez les dépendances:
   ```
   pip install -r requirements.txt
   ```

3. Assurez-vous d'avoir Chrome installé sur votre système.

## Configuration

Vous pouvez personnaliser les mots-clés en modifiant le fichier `keywords_config.py`. Ce fichier contient un dictionnaire avec des spécialités comme clés et des listes de mots-clés comme valeurs.

## Utilisation

### Scraper standard (CSV uniquement)

```bash
python job_scraper.py
```

### Scraper avec base de données SQLite

```bash
python job_scraper_with_db.py
```

### Options avancées

Le scraper avec base de données prend en charge plusieurs options:

```bash
python job_scraper_with_db.py --help
```

Options disponibles:

- `--specialties`: Liste des spécialités à scraper (par défaut: toutes)
- `--max-workers`: Nombre maximum de workers parallèles (défaut: 3)
- `--max-pages`: Nombre maximum de pages par mot-clé (défaut: 5)
- `--data-dir`: Répertoire pour stocker les données (défaut: ./data)
- `--deduplicate`: Supprimer les doublons après le scraping
- `--export`: Formats d'exportation (csv, json)
- `--location`: Lieu pour la recherche d'emploi (défaut: Maroc)
- `--list-specialties`: Liste les spécialités disponibles et quitte

Exemples:

```bash
# Scraper uniquement la spécialité Informatique
python job_scraper_with_db.py --specialties "Ingénierie Informatique et Réseaux"

# Scraper avec 4 workers et exporter en CSV et JSON
python job_scraper_with_db.py --max-workers 4 --export csv json

# Scraper 10 pages maximum par mot-clé et supprimer les doublons
python job_scraper_with_db.py --max-pages 10 --deduplicate

# Lister les spécialités disponibles
python job_scraper_with_db.py --list-specialties
```

### Fusionner des fichiers CSV (ancienne méthode)

```bash
python merge_csv_files.py
```

## Architecture du stockage de données

### Base de données SQLite

Les offres d'emploi sont stockées dans une base de données SQLite avec le schéma suivant:

- `id`: Identifiant unique de l'offre
- `specialty`: Spécialité de l'offre
- `keyword`: Mot-clé utilisé pour trouver l'offre
- `title`: Titre de l'offre
- `company`: Nom de l'entreprise
- `salary`: Salaire (si disponible)
- `summary`: Résumé de l'offre
- `description`: Description complète
- `url`: URL de l'offre
- `scrape_date`: Date de scraping
- `location`: Localisation

### Fichiers de sortie

- `data/indeed_jobs.db`: Base de données SQLite
- `data/indeed_jobs.csv`: Export CSV
- `data/indeed_jobs.json`: Export JSON

## Résolution des problèmes

### Erreurs "stale element reference"
Ces erreurs se produisent lorsque les éléments de la page ne sont plus attachés au DOM. Le scraper est conçu pour gérer ces erreurs, mais si elles persistent:
- Augmentez les délais entre les requêtes (WAIT_BETWEEN_REQUESTS_MIN et WAIT_BETWEEN_REQUESTS_MAX)
- Vérifiez votre connexion Internet

### Timeouts
Si vous rencontrez des timeouts fréquents:
- Vérifiez que votre connexion Internet est stable
- Indeed peut limiter les requêtes - augmentez les temps d'attente
- Réduisez le nombre de `max-workers` à 2
- Essayez de réduire le nombre de mots-clés à traiter en une seule session

### Captchas
Si Indeed présente des captchas:
- Le script attend un certain temps (CAPTCHA_CHECK_DELAY) avant de réessayer
- Vous pouvez désactiver le mode headless pour résoudre manuellement les captchas

## API pour développeurs

La classe `JobStore` offre une API pour interagir avec les données:

```python
from job_store import JobStore

# Initialiser le stockage
store = JobStore("./data")

# Obtenir le nombre total d'offres
count = store.get_job_count()

# Rechercher des offres
python_jobs = store.search(query="python")
jobs_casa = store.search(company="Casablanca")

# Obtenir des statistiques
stats = store.get_stats()

# Dédupliquer les offres
deleted = store.deduplicate()

# Exporter
store.export_to_csv("export.csv")
store.export_to_json("export.json")
``` 

# Client Adzuna API

Ce module permet d'exploiter l'API Adzuna pour collecter et analyser des données sur le marché de l'emploi avec des visualisations.

## Caractéristiques

- Utilisation complète des endpoints de l'API Adzuna:
  - Recherche d'emplois
  - Catégories
  - Histogrammes de salaires
  - Top employeurs
  - Données géographiques
  - Historique des salaires
- Visualisations automatiques:
  - Distribution des salaires
  - Classement des entreprises qui recrutent le plus
  - Évolution des salaires dans le temps
- Fallback automatique entre différents pays
- Organisation par spécialité
- Export en CSV

## Installation

```bash
pip install pandas matplotlib
```

## Utilisation simple

```python
from adzuna_api_enhanced import AdzunaAPI

# Initialiser l'API
api = AdzunaAPI(
    app_id="votre_app_id",
    app_key="votre_app_key",
    country="ma"  # Morocco par défaut
)

# Rechercher des emplois
jobs = api.search_jobs("développeur")

# Obtenir les catégories disponibles
categories = api.get_categories()

# Obtenir les principales entreprises qui recrutent
top_companies = api.get_top_companies("finance")

# Obtenir des histogrammes de salaires
histogram = api.get_histogram("data scientist")

# Obtenir des données géographiques
geodata = api.get_geodata("ingénieur")

# Obtenir l'historique des salaires
history = api.get_history("comptable")
```

## Analyse complète du marché

```python
# Définir les spécialités et mots-clés à analyser
specialties = {
    "informatique": ["développeur", "data scientist", "devops"],
    "finance": ["comptable", "analyste financier", "auditeur"]
}

# Lancer l'analyse complète
results = api.run_full_analysis(specialties)

print(f"Total des offres collectées: {results['job_count']}")
print(f"Visualisations générées: {len(results['visualizations'])}")
```

## Résultats

L'analyse génère:

1. Fichiers CSV par spécialité et mot-clé
2. Graphiques dans le dossier `adzuna_data/charts/`:
   - `salary_histogram_*.png`: Distribution des salaires
   - `top_companies_*.png`: Top employeurs
   - `salary_history_*.png`: Évolution des salaires

## Personnalisation

```python
# Personnaliser les pays de fallback
api = AdzunaAPI(
    app_id="votre_app_id",
    app_key="votre_app_key",
    country="ma",
    fallback_countries=["fr", "de", "gb"],
    output_dir="mes_donnees"
)

# Visualiser manuellement un histogramme
histogram_data = api.get_histogram("développeur web")
api.visualize_salary_histogram(
    histogram_data,
    title="Salaires des développeurs web"
)
``` 

# Job Scraping and Analysis Tools

This repository contains tools for scraping, storing, and analyzing job listings from various sources.

## Tools Overview

### 1. Adzuna API Solution (`adzuna_solution_fixed.py`)

A tool for fetching international job data from Adzuna API across multiple countries.

- **Features**:
  - Multi-country search (UK, US, France, etc.)
  - Remote job filtering
  - Job tagging with metadata
  - Deduplication of results
  - Morocco-relevant job identification

### 2. Job Vector Store (`adzuna_vector_store.py`)

A vector database implementation using FAISS for efficient similarity search of job listings.

- **Features**:
  - Stores job data as vector embeddings for semantic search
  - Performs similarity searches based on job descriptions and titles
  - Filters for remote, international, and Morocco-relevant jobs
  - Persists data for future use
  - Provides job statistics and analytics

## Installation

### Requirements

Install the required packages:

```bash
pip install -r requirements.txt
```

### Required packages:

```
requests
pandas
faiss-cpu
numpy
sentence-transformers
tqdm
```

For GPU acceleration (optional):
```
faiss-gpu
```

## Usage

### Fetching Job Data

```python
from Scraping.adzuna_solution_fixed import AdzunaSolution

# Initialize the solution
adzuna = AdzunaSolution()

# Run analysis with all specialties
results = adzuna.run_analysis(JOB_SPECIALTIES)

# Or run a quick test
results = adzuna.run_analysis(TEST_SPECIALTIES, max_pages=1)
```

### Using the Vector Database

```python
from Scraping.adzuna_vector_store import JobVectorStore

# Initialize vector store
vector_store = JobVectorStore()

# Load existing store or create a new one
if not vector_store.load():
    # Add jobs from CSV files
    vector_store.add_jobs_from_directory("adzuna_data")
    vector_store.save()

# Perform semantic search for similar jobs
results = vector_store.search_similar_jobs("machine learning engineer", k=10)

# Search for remote jobs
remote_jobs = vector_store.search_remote_jobs("data science", k=10)

# Search for Morocco-relevant jobs
morocco_jobs = vector_store.search_morocco_relevant("software developer", k=10)
```

## Advanced Features

### Vector Search Capabilities

The vector database enables several advanced search capabilities:

1. **Semantic similarity search**: Find jobs that are conceptually similar, not just keyword matches
   ```python
   # Find jobs similar to "AI researcher" even if they don't contain those exact words
   results = vector_store.search_similar_jobs("AI researcher")
   ```

2. **Keyword filtering with semantic context**:
   ```python
   # Find jobs containing specific keywords
   results = vector_store.search_by_keywords(["python", "machine learning", "data"], 
                                           require_all=False)
   ```

3. **Specialized job searches**:
   ```python
   # Find jobs with similar titles
   results = vector_store.search_by_job_title("Frontend Developer")
   
   # Find remote jobs that match a query
   results = vector_store.search_remote_jobs("DevOps engineer")
   ```

4. **Morocco-relevant opportunities**:
   ```python
   # Find jobs relevant to Morocco (remote, international, or mentions Morocco)
   results = vector_store.search_morocco_relevant("finance analyst")
   ```

## Data Output

The tools generate several types of data outputs:

1. **CSV Files**: 
   - Individual specialty job listings
   - All jobs combined
   - Morocco-relevant jobs

2. **Vector Database Files**:
   - FAISS index file (`.index`)
   - Job data pickle file (`.pkl`)

## Workflow Example

1. **Collect data** using the Adzuna API solution
2. **Store and vectorize** the job data using JobVectorStore
3. **Perform semantic searches** to find relevant job opportunities
4. **Filter results** for remote, international, or Morocco-specific jobs

## Troubleshooting

If you encounter issues:

- Ensure your API credentials are correct
- Check your internet connection
- Make sure required dependencies are installed
- For vector store issues, check that FAISS is properly installed 