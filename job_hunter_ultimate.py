#!/usr/bin/env python3
"""
🚀 ULTIMATE JOB HUNTER v3.0 
3-Source Professional Job Search System
"""

import os
import sys
import json
import time
import random
import argparse
import re
import requests
import threading
from datetime import datetime, timedelta
from urllib.parse import quote_plus, urlparse
from typing import Optional, Dict, Any, List
from pathlib import Path
import urllib3
import warnings

# Lokale Imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from booster_turbo import TurboBewerbungsHelfer

# Add imports for the new ranking system
from search_profiles import SearchProfile, RankingWeights
from datetime import datetime, timedelta
from difflib import SequenceMatcher

# Import new modular components
from job_search_manager import JobSearchManager
from job_ranker import JobRanker
from job_utils import (
    normalize_text, build_query_variations, safe_api_call, validate_job_data,
    clean_filename_string, clean_company_name_string, clean_job_title_string,
    normalize_job_url
)

# Import new profile-specific cache system
from profile_job_cache import ProfileJobCache

# Centralized configuration
from config_manager import ConfigManager

# ---------------------------------------------------------------------------
# Suppress noisy SSL warnings coming from urllib3 LibreSSL builds (Task 32.18)
# ---------------------------------------------------------------------------
try:
    from urllib3.exceptions import NotOpenSSLWarning  # type: ignore

    warnings.filterwarnings("ignore", category=NotOpenSSLWarning)
except Exception:  # pragma: no cover – urllib3 might be missing in minimal envs
    pass

# =========================================
# 🔤 Note: Utility functions moved to job_utils.py
# =========================================

# Comprehensive SSL warning suppression for macOS LibreSSL compatibility  
try:
    warnings.filterwarnings('ignore', category=urllib3.exceptions.NotOpenSSLWarning)
except AttributeError:
    pass  # NotOpenSSLWarning not available in urllib3 < 2.0
warnings.filterwarnings('ignore', message='urllib3 v2 only supports OpenSSL 1.1.1+.*')
warnings.filterwarnings('ignore', message='.*urllib3.*')

# Additional urllib3 warning suppression
try:
    import urllib3
    urllib3.disable_warnings()
except:
    pass

# Unterdrücke lästigen multiprocessing.resource_tracker Hinweis (macOS / Python 3.9)
warnings.filterwarnings(
    'ignore',
    message=r'resource_tracker: There appear to be \d+ leaked semaphore objects',
    category=UserWarning,
    module='multiprocessing.resource_tracker'
)

# =========================================
# 🛡️ Note: Utility functions moved to job_utils.py
# =========================================

class UltimateJobHunter:
    def __init__(self, skip_stepstone: bool = True, json_output: bool = False):  # Stepstone standardmäßig deaktiviert
        """Initialisiert Ultimate Job Hunter"""
        print("🚀 ULTIMATE JOB HUNTER v3.0")
        
        # Lade zentrale Konfiguration
        self.config = cfg = ConfigManager()

        # API Keys (Environment > config.yaml)
        self.openai_api_key = cfg.openai_api_key
        self.adzuna_api_key = cfg.adzuna_api_key
        self.adzuna_app_id = cfg.adzuna_app_id or 'test_app'
        # Load JSearch API keys from both singular and plural forms
        self.jsearch_api_key = os.getenv('JSEARCH_API_KEYS') or cfg.jsearch_api_key
        
        # Check if we have at least OpenAI API key for letter generation
        if not self.openai_api_key:
            print("❌ OpenAI API-Key fehlt in .env - benötigt für Anschreiben-Generierung")
            sys.exit(1)
        
        # Job search APIs are optional - demo mode will be used if they fail
        if not self.adzuna_api_key and not self.jsearch_api_key:
            print("⚠️ Keine Job-Search API-Keys gefunden - Demo-Modus wird verwendet")
        else:
            print("✅ Mindestens ein Job-Search API verfügbar")
            
        print("✅ API-Keys geladen")
        
        # Optionen
        self.skip_stepstone = skip_stepstone
        self.json_output = json_output
        self.automated_mode = False  # For fully automated execution
        self.auto_address = False    # Automatically handle missing addresses
        
        # Process Control System (Task 31.1-31.2)
        self.cancel_event = threading.Event()  # Graceful shutdown flag
        self.process_thread = None              # Current running thread
        self.process_status = "idle"           # idle, running, paused, cancelled, completed
        self.process_lock = threading.Lock()   # Thread-safe status updates
        self.last_search_cache = {}            # Cache for rewrite functionality
        
        # Bewerbungshelfer
        self.bewerbungshelfer = TurboBewerbungsHelfer(
            use_chatgpt=True, 
            chatgpt_api_key=self.openai_api_key
        )
        
        # Session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        # Processed Jobs - Legacy and New System
        self.processed_jobs_file = 'processed_jobs.json'
        self.processed_jobs = self.load_processed_jobs()
        
        # Initialize Profile-Specific Job Cache
        self.profile_job_cache = ProfileJobCache(self.processed_jobs_file)
        
        # Initialize new modular components
        self.job_search_manager = JobSearchManager(
            adzuna_api_key=self.adzuna_api_key,
            adzuna_app_id=self.adzuna_app_id,
            jsearch_api_key=self.jsearch_api_key,
            processed_jobs=self.processed_jobs,
            skip_stepstone=self.skip_stepstone
        )
        
        self.job_ranker = JobRanker()

    def load_processed_jobs(self):
        """Lade bereits verarbeitete Jobs"""
        if os.path.exists(self.processed_jobs_file):
            try:
                with open(self.processed_jobs_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Handle both old format (list of URLs) and new format (list of objects)
                    if isinstance(data, list):
                        if data and isinstance(data[0], dict):
                            # New format with metadata
                            self.processed_jobs = {self.normalize_job_url(job.get('url', job.get('job_id', ''))) 
                                                 for job in data}
                        else:
                            # Old format - just URLs
                            self.processed_jobs = {self.normalize_job_url(url) for url in data}
                    else:
                        self.processed_jobs = set()
                        
            except Exception as e:
                print(f"❌ Fehler beim Laden der processed_jobs: {e}")
                self.processed_jobs = set()
        else:
            self.processed_jobs = set()

        # Always return the processed_jobs set for external consumers
        return self.processed_jobs

    def get_job_by_id(self, job_id):
        """🎯 NEW: Get job details by job_id for dropdown preview"""
        try:
            # Load current job data
            with open(self.processed_jobs_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Search in all profile sections for the job
            for profile_key, profile_data in data.items():
                if isinstance(profile_data, dict) and 'jobs' in profile_data:
                    for job in profile_data['jobs']:
                        if job.get('job_id') == job_id:
                            return job
            
            return None
        except Exception as e:
            logger.error(f"Error getting job by ID {job_id}: {e}")
            return None

    def save_processed_job(self, url):
        """⚠️ DEPRECATED - Use mark_job_as_completed instead"""
        print("⚠️ WARNING: save_processed_job is deprecated. Use mark_job_as_completed.")
        return self.mark_job_as_completed(url, user_approved=True)

    def mark_job_as_completed(self, job_id, user_approved=True, job_data=None):
        """🎯 Neue Funktion: Markiert Job als abgeschlossen nur nach User-Approval"""
        # Save training data first (regardless of approval status)
        self._save_training_data(job_id, user_approved, job_data)
        
        if not user_approved:
            print(f"   ⏭️ Job {job_id} nicht approved - nicht auf processed Liste")
            return False
        
        # Job zur processed Liste hinzufügen
        normalized_id = self.normalize_job_url(job_id)
        self.processed_jobs.add(normalized_id)
        
        try:
            # Load existing data
            if os.path.exists(self.processed_jobs_file):
                with open(self.processed_jobs_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            else:
                existing_data = []
            
            # Convert old format to new format if needed
            if existing_data and not isinstance(existing_data[0], dict):
                # Old format - convert to new format
                existing_data = [{'job_id': url, 'url': url, 'date_added': datetime.now().isoformat()} 
                               for url in existing_data]
            
            # Add new job with metadata
            new_entry = {
                'job_id': job_id,
                'url': job_id if job_id.startswith('http') else None,
                'date_added': datetime.now().isoformat(),
                'user_approved': user_approved
            }
            
            # Add additional job data if provided
            if job_data:
                new_entry.update({
                    'company': job_data.get('company'),
                    'title': job_data.get('title'),
                    'location': job_data.get('location'),
                    'platform': job_data.get('platform')
                })
            
            # Check if job already exists
            job_exists = any(job.get('job_id') == job_id or job.get('url') == job_id 
                           for job in existing_data if isinstance(job, dict))
            
            if not job_exists:
                existing_data.append(new_entry)
            
            # Save updated data
            with open(self.processed_jobs_file, 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, indent=2, ensure_ascii=False)
                
            # 📊 Analytics Integration - Add to Analytics DB
            try:
                from analytics_manager import AnalyticsManager, ApplicationAnalytics
                analytics = AnalyticsManager()
                
                # Create analytics entry for the completed application
                analytics_entry = ApplicationAnalytics(
                    application_id=f"app_{abs(hash(job_id)) % 1000000}",
                    job_id=job_id,
                    company=job_data.get('company', 'Unknown') if job_data else 'Unknown',
                    title=job_data.get('title', 'Unknown') if job_data else 'Unknown',
                    location=job_data.get('location', 'Unknown') if job_data else 'Unknown',
                    platform=job_data.get('platform', 'Unknown') if job_data else 'Unknown',
                    application_date=datetime.now(),
                    status='pending'  # Start with pending status
                )
                
                analytics.add_application(analytics_entry)
                print(f"   📊 Application added to Analytics DB: {analytics_entry.application_id}")
                
            except Exception as analytics_error:
                print(f"   ⚠️ Analytics integration failed: {analytics_error}")
                # Don't fail the main operation if analytics fails
                
            print(f"   ✅ Job {job_id} als completed markiert")
            return True
        except Exception as e:
            print(f"   ❌ Fehler beim Speichern: {e}")
            return False
    
    def _save_training_data(self, job_id, user_approved, job_data):
        """💾 Save training data for ML model (Task 42.1)"""
        try:
            import csv
            from pathlib import Path
            
            # Ensure data directory exists
            data_dir = Path('data')
            data_dir.mkdir(exist_ok=True)
            
            csv_file = data_dir / 'job_matching_dataset.csv'
            
            # Check if CSV exists and has headers
            write_header = not csv_file.exists()
            if csv_file.exists():
                # Check if file is empty or only has header
                with open(csv_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    write_header = not content or content.count('\n') == 0
            
            # Prepare job data for CSV
            if job_data:
                # Extract skills from job description using simple heuristics
                skills = self._extract_skills_from_job(job_data)
                
                # Convert to training data format
                training_row = {
                    'job_id': job_id,
                    'title': job_data.get('title', ''),
                    'description': job_data.get('description', ''),
                    'skills': ', '.join(skills) if skills else '',
                    'location': job_data.get('location', ''),
                    'salary': job_data.get('salary_info', '') or job_data.get('salary', ''),
                    'company_size': job_data.get('company_size', ''),
                    'remote': 'yes' if job_data.get('remote') or job_data.get('job_is_remote') else 'no',
                    'years_experience': job_data.get('job_required_experience', '') or job_data.get('years_experience', ''),
                    'match_label': 1 if user_approved else 0
                }
                
                # Append to CSV
                with open(csv_file, 'a', newline='', encoding='utf-8') as f:
                    fieldnames = ['job_id', 'title', 'description', 'skills', 'location', 
                                'salary', 'company_size', 'remote', 'years_experience', 'match_label']
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    
                    if write_header:
                        writer.writeheader()
                    
                    writer.writerow(training_row)
                
                print(f"   📊 Training data saved: label={training_row['match_label']} for {job_data.get('title', job_id)}")
                
                # Check if we have enough data to suggest training
                self._check_training_readiness(csv_file)
                
        except Exception as e:
            print(f"   ⚠️ Could not save training data: {e}")
    
    def _extract_skills_from_job(self, job_data):
        """🧠 Extract skills from job data using simple keyword matching"""
        skills = []
        
        # Common skill keywords to look for
        skill_keywords = [
            # Technical skills
            'python', 'javascript', 'react', 'angular', 'vue', 'nodejs', 'java', 'c++', 'c#',
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'docker', 'kubernetes',
            'aws', 'azure', 'gcp', 'terraform', 'ansible',
            
            # Marketing skills
            'seo', 'sem', 'google ads', 'facebook ads', 'social media', 'content marketing',
            'email marketing', 'analytics', 'google analytics', 'performance marketing',
            'digital marketing', 'marketing automation', 'crm',
            
            # E-commerce skills
            'shopify', 'woocommerce', 'magento', 'amazon', 'ebay', 'marketplace',
            'e-commerce', 'ecommerce', 'online shop', 'conversion optimization',
            
            # General skills
            'project management', 'agile', 'scrum', 'kanban', 'jira', 'confluence',
            'communication', 'teamwork', 'leadership', 'problem solving'
        ]
        
        # Search in title and description
        text_to_search = f"{job_data.get('title', '')} {job_data.get('description', '')}".lower()
        
        for skill in skill_keywords:
            if skill.lower() in text_to_search:
                skills.append(skill)
        
        # Also check job_required_skills if available
        if job_data.get('job_required_skills'):
            required_skills = job_data['job_required_skills']
            if isinstance(required_skills, str):
                # Parse string of skills
                parsed_skills = [s.strip() for s in required_skills.replace(',', ' ').split() if s.strip()]
                skills.extend(parsed_skills[:10])  # Limit to prevent spam
        
        return list(set(skills))  # Remove duplicates
    
    def _check_training_readiness(self, csv_file):
        """🎯 Check if we have enough data for training and suggest it"""
        try:
            import csv
            
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            total_samples = len(rows)
            positive_samples = sum(1 for row in rows if row.get('match_label') == '1')
            
            # Suggest training at certain milestones
            if total_samples in [50, 100, 150, 200, 300, 500] or (total_samples > 500 and total_samples % 100 == 0):
                print(f"\n🎯 TRAINING UPDATE: {total_samples} labeled samples collected!")
                print(f"   ✅ Relevant: {positive_samples} | ❌ Not relevant: {total_samples - positive_samples}")
                
                if total_samples >= 200:
                    print("   💡 Ready for ML training! Run: python train_job_scorer.py")
                elif total_samples >= 100:
                    print("   📈 Getting close! 100+ samples collected. Consider training with --force")
                else:
                    print(f"   📊 Need {200 - total_samples} more samples for reliable training")
        
        except Exception as e:
            # Fail silently - this is just informational
            pass
    
    def reset_job_cache(self):
        """🎯 Neue Funktion: Reset der processed_jobs.json"""
        try:
            # Backup erstellen
            import shutil
            from datetime import datetime
            backup_file = f"processed_jobs_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            if os.path.exists(self.processed_jobs_file):
                shutil.copy2(self.processed_jobs_file, backup_file)
                print(f"   💾 Backup erstellt: {backup_file}")
            
            # Cache leeren
            self.processed_jobs = set()
            with open(self.processed_jobs_file, 'w', encoding='utf-8') as f:
                json.dump([], f, indent=2)
            
            print("   ✅ Job-Cache erfolgreich geleert")
            return True
        except Exception as e:
            print(f"   ❌ Fehler beim Reset: {e}")
            return False

    def clean_expired_jobs(self, max_age_days=30):
        """🧹 Entferne Jobs älter als max_age_days aus processed_jobs.json"""
        try:
            if not os.path.exists(self.processed_jobs_file):
                return 0
            
            with open(self.processed_jobs_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                return 0
            
            # Calculate cutoff date
            cutoff_date = datetime.now() - timedelta(days=max_age_days)
            initial_count = len(data)
            
            # Filter jobs
            filtered_data = []
            for item in data:
                if isinstance(item, dict) and 'date_added' in item:
                    try:
                        job_date = datetime.fromisoformat(item['date_added'].replace('Z', '+00:00'))
                        if job_date > cutoff_date:
                            filtered_data.append(item)
                    except:
                        # Keep jobs with invalid dates
                        filtered_data.append(item)
                else:
                    # Keep old format entries (can't determine age)
                    filtered_data.append(item)
            
            # Save filtered data
            with open(self.processed_jobs_file, 'w', encoding='utf-8') as f:
                json.dump(filtered_data, f, indent=2, ensure_ascii=False)
            
            # Update in-memory set
            self.processed_jobs = {self.normalize_job_url(job.get('url', job.get('job_id', ''))) 
                                 for job in filtered_data if isinstance(job, dict)}
            
            removed_count = initial_count - len(filtered_data)
            print(f"   🧹 {removed_count} Jobs älter als {max_age_days} Tage entfernt")
            return removed_count
            
        except Exception as e:
            print(f"   ❌ Fehler beim Bereinigen: {e}")
            return 0

    def normalize_job_url(self, url):
        """🔧 Normalisiere Job-URL / Job-ID für Duplikatserkennung - REFACTORED to use job_utils"""
        from job_utils import normalize_job_url
        return normalize_job_url(url)

    def remove_gendering(self, title: str) -> str:
        """🧹 Entferne Gendering aus Jobtiteln - REFACTORED to use job_utils"""
        from job_utils import remove_gendering
        return remove_gendering(title)

    def search_adzuna_api(self, query: str, max_results: int = 5, max_age_days: Optional[int] = None) -> List[Dict[str, Any]]:
        """🌐 Adzuna API-Suche - REFACTORED to use JobSearchManager"""
        # Update processed jobs reference in search manager
        self.job_search_manager.processed_jobs = self.processed_jobs
        
        # Use the new modular search system
        return self.job_search_manager.search_adzuna_api(query, max_results, max_age_days)

    def search_jsearch_api(self, query: str, max_results: int = 5, max_age_days: Optional[int] = None) -> List[Dict[str, Any]]:
        """⚡ JSearch API-Suche - REFACTORED to use JobSearchManager"""
        # Update processed jobs reference in search manager
        self.job_search_manager.processed_jobs = self.processed_jobs
        
        # Use the new modular search system
        return self.job_search_manager.search_jsearch_api(query, max_results, max_age_days)

    def search_stepstone_stealth(self, query, max_results=5):
        """🔍 Stepstone Stealth-Suche - REFACTORED to use JobSearchManager"""
        # Update processed jobs reference in search manager
        self.job_search_manager.processed_jobs = self.processed_jobs
        
        # Use the new modular search system
        return self.job_search_manager.search_stepstone_stealth(query, max_results)

    def search_stepstone_http(self, query, max_results=5):
        """🔍 Stepstone HTTP-Suche - REFACTORED to use JobSearchManager"""
        # Update processed jobs reference in search manager
        self.job_search_manager.processed_jobs = self.processed_jobs
        
        # Use the new modular search system
        return self.job_search_manager.search_stepstone_http(query, max_results)

    def rank_jobs(self, jobs, profile: SearchProfile = None, weights: RankingWeights = None):
        """🎯 Advanced Job Ranking with User-Defined Weights"""
        if not jobs:
            return []
        
        # Create ranker with custom weights and profile
        ranker = JobRanker(weights=weights, profile=profile)
        
        # Use the new ranking system
        return ranker.rank_jobs(jobs)

    def search_all_sources(self, max_jobs=15):
        """🔍 Multi-Source Suche"""
        print(f"🔍 Suche {max_jobs} Jobs aus 3 VOLLSTÄNDIGEN Quellen...")
        if self.skip_stepstone:
            print("📋 QUELLEN: Adzuna API + JSearch API (Stepstone deaktiviert)")
            print("🚀 FOKUS auf 2 STABILE APIs!")
        else:
            print("📋 QUELLEN: Adzuna API + JSearch API + Stepstone (Stealth)")
            print("🚀 ALLE APIs AKTIV - Maximum Power!")
        
        # Dynamische Queries aus preferences.yaml laden
        try:
            with open('preferences.yaml', 'r', encoding='utf-8') as f:
                import yaml
                prefs = yaml.safe_load(f)
                target_roles = prefs.get('target_roles', [])
                
                # Queries aus target_roles generieren
                queries = []
                for role in target_roles:
                    # Bereinige Klammern und zusätzliche Infos
                    clean_role = role.split('(')[0].strip()
                    queries.append(clean_role)
                
                # Fallback wenn keine Rollen definiert
                if not queries:
                    queries = [
                        "Digital Marketing Manager",
                        "E-Commerce Manager", 
                        "Marketing Manager"
                    ]
                    
                print(f"🎯 DYNAMISCHE QUERIES aus preferences.yaml: {queries}")
                
        except Exception as e:
            print(f"⚠️ Preferences-Fehler: {e}")
            queries = [
                "Digital Marketing Manager",
                "E-Commerce Manager", 
                "Marketing Manager",
                "Performance Marketing"
            ]
        
        all_jobs = []
        
        for query in queries[:4]:  # 4 Queries für beste Abdeckung
            if len(all_jobs) >= max_jobs:
                break
            
            print(f"\n🎯 '{query}'")
            
            # Pro Query: mehr Jobs pro Quelle wenn Stepstone deaktiviert
            jobs_per_source = 7 if self.skip_stepstone else 3  # 7 pro Quelle (nur 2 Quellen) oder 3 pro Quelle (3 Quellen)
            
            # 1. Adzuna API - Professionell
            adzuna_jobs = self.search_adzuna_api(query, jobs_per_source)
            all_jobs.extend(adzuna_jobs)
            
            # 2. JSearch API - Schnell
            jsearch_jobs = self.search_jsearch_api(query, jobs_per_source)
            all_jobs.extend(jsearch_jobs)
            
            # 3. Stepstone - Premium deutsch (mit Fallback)
            stepstone_jobs = []
            if not self.skip_stepstone:
                print("🔍 STEPSTONE: Browser zuerst, dann HTTP-Fallback")
                stepstone_jobs = self.search_stepstone_stealth(query, jobs_per_source)
                
                # Fallback auf HTTP wenn Browser fehlschlägt
                if len(stepstone_jobs) == 0:
                    print("   🔄 Browser fehlgeschlagen - versuche HTTP-Fallback")
                    stepstone_jobs = self.search_stepstone_http(query, jobs_per_source)
                
                all_jobs.extend(stepstone_jobs)
            else:
                print("🔍 STEPSTONE: Übersprungen (--skip-stepstone)")
            
            print(f"📊 Query Total: {len(adzuna_jobs + jsearch_jobs + stepstone_jobs)} Jobs")
            
            time.sleep(2)  # Pause zwischen Queries
        
        print(f"\n📊 GESAMT: {len(all_jobs)} Jobs")
        print(f"📈 PLATFORM-VERTEILUNG:")
        platforms = {}
        for job in all_jobs:
            platform = job['platform']
            platforms[platform] = platforms.get(platform, 0) + 1
        
        for platform, count in platforms.items():
            print(f"   {platform}: {count} Jobs")
        
        return all_jobs

    def build_api_content(self, job):
        """🔧 Baue strukturierten Content aus ALLEN verfügbaren API-Daten"""
        content_parts = [
            f"Position: {job['title']}",
            f"Unternehmen: {job['company']}",
            f"Standort: {job['location']}",
            f"Plattform: {job['platform']}"
        ]
        
        # ERWEITERTE Firmeninformationen (JSearch)
        if job['platform'] == 'JSearch':
            if job.get('employer_website'): 
                content_parts.append(f"Firmen-Website: {job['employer_website']}")
            if job.get('employer_company_type'): 
                content_parts.append(f"Unternehmenstyp: {job['employer_company_type']}")
            if job.get('job_publisher'): 
                content_parts.append(f"Veröffentlicht über: {job['job_publisher']}")
            
            # DETAILLIERTE Gehaltsinformationen
            salary_parts = []
            if job.get('job_min_salary') and job.get('job_max_salary'):
                currency = job.get('job_salary_currency', 'USD')
                period = job.get('job_salary_period', 'year')
                salary_parts.append(f"{job['job_min_salary']:,} - {job['job_max_salary']:,} {currency} per {period}")
            elif job.get('job_salary'):
                salary_parts.append(str(job['job_salary']))
            
            if salary_parts:
                content_parts.append(f"Gehalt: {' / '.join(salary_parts)}")
            
            # Arbeitszeit und Remote-Optionen
            if job.get('job_employment_type'): 
                content_parts.append(f"Arbeitszeit: {job['job_employment_type']}")
            if job.get('job_is_remote'): 
                content_parts.append(f"Remote-Arbeit: {'Ja' if job['job_is_remote'] else 'Nein'}")
            if job.get('job_posted_at'): 
                content_parts.append(f"Veröffentlicht: {job['job_posted_at']}")
        
        # ERWEITERTE Adzuna-Daten
        if job['platform'] == 'Adzuna':
            # Gehaltsinformationen (mit Hinweis ob geschätzt)
            if job.get('salary_min') or job.get('salary_max'):
                salary_info = []
                if job.get('salary_min'): salary_info.append(f"ab {job['salary_min']}€")
                if job.get('salary_max'): salary_info.append(f"bis {job['salary_max']}€")
                salary_text = ' '.join(salary_info)
                if job.get('salary_is_predicted'):
                    salary_text += " (geschätzt)"
                content_parts.append(f"Gehalt: {salary_text}")
            
            # Vertragsart und Kategorie
            if job.get('contract_type'): 
                content_parts.append(f"Vertragsart: {job['contract_type']}")
            if job.get('category_label'): 
                content_parts.append(f"Kategorie: {job['category_label']}")
            
            # Zeitstempel und Job-ID
            if job.get('created'): 
                content_parts.append(f"Veröffentlicht: {job['created']}")
            if job.get('job_id'): 
                content_parts.append(f"Job-ID: {job['job_id']}")
            
            # Geografische Details
            if job.get('latitude') and job.get('longitude'):
                content_parts.append(f"Koordinaten: {job['latitude']:.4f}, {job['longitude']:.4f}")
            
            # Erweiterte Firmendaten
            company_data = job.get('company_data', {})
            if isinstance(company_data, dict) and len(company_data) > 1:
                # Falls Adzuna mehr Firmendaten hat als nur display_name
                company_details = []
                for key, value in company_data.items():
                    if key != 'display_name' and key != '__CLASS__' and value:
                        company_details.append(f"{key}: {value}")
                if company_details:
                    content_parts.append(f"Firmendetails: {', '.join(company_details)}")
        
        # Hauptbeschreibung
        if job.get('description'):
            content_parts.append(f"\nStellenbeschreibung:\n{job['description']}")
        
        # ERWEITERTE JSearch-Zusatzdaten
        if job['platform'] == 'JSearch':
            # VOLLSTÄNDIGE Benefits-Liste (nicht nur 3!)
            if job.get('job_benefits'):
                benefits_data = job['job_benefits']
                if isinstance(benefits_data, list):
                    # Liste von Benefits
                    benefits_text = '\n'.join([f"• {benefit}" for benefit in benefits_data])
                    content_parts.append(f"\nBenefits und Zusatzleistungen:\n{benefits_text}")
                else:
                    # String oder andere Datentyp
                    content_parts.append(f"\nBenefits und Zusatzleistungen:\n{benefits_data}")
            
            # Qualifikationen und Anforderungen
            if job.get('job_qualifications'):
                content_parts.append(f"\nAnforderungen und Qualifikationen:\n{job['job_qualifications']}")
            
            # NEUE FELDER - Erfahrungsanforderungen
            if job.get('job_required_experience'):
                exp_data = job['job_required_experience']
                if isinstance(exp_data, dict):
                    exp_text = ', '.join([f"{k}: {v}" for k, v in exp_data.items() if v])
                    content_parts.append(f"\nErfahrungsanforderungen:\n{exp_text}")
                else:
                    content_parts.append(f"\nErfahrungsanforderungen:\n{exp_data}")
            
            # NEUE FELDER - Erforderliche Skills
            if job.get('job_required_skills'):
                skills_data = job['job_required_skills']
                if isinstance(skills_data, list):
                    skills_text = ', '.join(skills_data)
                    content_parts.append(f"\nErforderliche Skills:\n{skills_text}")
                else:
                    content_parts.append(f"\nErforderliche Skills:\n{skills_data}")
            
            # NEUE FELDER - Bildungsanforderungen
            if job.get('job_required_education'):
                edu_data = job['job_required_education']
                if isinstance(edu_data, dict):
                    edu_text = ', '.join([f"{k}: {v}" for k, v in edu_data.items() if v])
                    content_parts.append(f"\nBildungsanforderungen:\n{edu_text}")
                else:
                    content_parts.append(f"\nBildungsanforderungen:\n{edu_data}")
            
            # Job-Highlights (oft sehr detailliert!)
            if job.get('job_highlights'):
                highlights_data = job['job_highlights']
                if isinstance(highlights_data, dict):
                    for section, items in highlights_data.items():
                        if items:
                            if isinstance(items, list):
                                items_text = '\n'.join([f"• {item}" for item in items])
                                content_parts.append(f"\n{section.title()}:\n{items_text}")
                            else:
                                content_parts.append(f"\n{section.title()}:\n{items}")
        
        return '\n'.join(content_parts)

    def scrape_with_strategy(self, url):
        """🔍 Verbesserte Scraping-Strategie für vollständige Stellenbeschreibungen"""
        try:
            print(f"   📄 Scraping: {url[:60]}...")
            
            # User-Agent für bessere Akzeptanz
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = self.session.get(url, timeout=self.config.get('job_search.timeouts.job_hunter_ultimate_request', 20), headers=headers)
            
            if response.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Entferne störende Elemente
                for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'advertisement']):
                    tag.decompose()
                
                # Spezielle Selektoren für Job-Seiten
                job_content = None
                
                # Adzuna-spezifische Selektoren
                if 'adzuna.de' in url:
                    job_content = soup.find('div', class_='adp-body') or soup.find('div', {'id': 'job_description'})
                
                # Allgemeine Job-Selektoren
                if not job_content:
                    selectors = [
                        '.job-description', '.job-content', '.jobad-content',
                        '[data-testid="job-description"]', '.description',
                        'main', 'article', '.content'
                    ]
                    
                    for selector in selectors:
                        job_content = soup.select_one(selector)
                        if job_content and len(job_content.get_text().strip()) > 200:
                            break
                
                if job_content:
                    # Extrahiere strukturierten Text
                    text = job_content.get_text(separator='\n', strip=True)
                    
                    # Bereinige und strukturiere
                    lines = [line.strip() for line in text.split('\n') if line.strip()]
                    content = '\n'.join(lines)
                    
                    # Begrenzte aber substantielle Länge
                    return content[:4000] if content else None
                else:
                    # Fallback: Ganzer Seitentext
                    text = soup.get_text(separator=' ', strip=True)
                    lines = [line.strip() for line in text.split('\n') if line.strip()]
                    content = ' '.join(lines)
                    return content[:3000] if content else None
                    
            else:
                print(f"   ❌ HTTP {response.status_code}")
                return None
                
        except Exception as e:
            print(f"   ❌ Scraping-Fehler: {e}")
            return None

    def process_top_jobs(self, ranked_jobs, count=3):
        """🚀 Verarbeite Top-Jobs (CLI-Modus) – jetzt mit Rückfrage-Logik und robusteren Dateinamen"""
        if not ranked_jobs:
            print("❌ Keine Jobs!")
            return
        
        print(f"\n🚀 Verarbeite TOP {count} Jobs:")
        
        successful = 0
        
        for i, job in enumerate(ranked_jobs[:count], 1):
            print(f"\n📝 Job {i}: {job['title']} @ {job['company']}")
            print(f"🔗 {job['url']}")
            
            # Für Dateinamen & Pfade
            from pathlib import Path
            from job_utils import clean_filename_string
            
            # 🔑 Stelle sicher, dass wir eine job_id besitzen (Ranking entfernt es manchmal)
            job_id_candidate = job.get('job_id') or job.get('id')
            if job_id_candidate:
                job['job_id'] = str(job_id_candidate)  # Ensure it's a string
            else:
                # Generiere Fallback-ID
                import uuid
                job['job_id'] = str(uuid.uuid4())
            
            try:
                # Nutze API-Daten direkt oder Scraping als Fallback
                content = None
                
                if job['platform'] in ['Adzuna', 'JSearch'] and job.get('description'):
                    # ZUERST: Versuche vollständige Beschreibung durch Scraping zu bekommen
                    print("📊 API-Daten verfügbar - versuche vollständige Beschreibung...")
                    
                    # Prüfe ob API-Beschreibung vollständig ist (nicht abgeschnitten)
                    api_desc = job.get('description', '')
                    is_truncated = api_desc.endswith('…') or api_desc.endswith('...') or len(api_desc) < 500
                    
                    # ADZUNA: Kein Scraping wegen Anti-Bot-Schutz (HTTP 403)
                    if is_truncated and job.get('url') and job['platform'] != 'Adzuna':
                        print(f"📄 API-Beschreibung abgeschnitten ({len(api_desc)} Zeichen) - scrape vollständige Version...")
                        scraped_content = self.scrape_with_strategy(job['url'])
                        
                        if scraped_content and len(scraped_content) > len(api_desc):
                            print(f"✅ Vollständige Beschreibung gescrapt: {len(scraped_content)} Zeichen")
                            content = scraped_content
                        else:
                            print("⚠️ Scraping fehlgeschlagen - nutze API-Daten")
                            content = self.build_api_content(job)
                    elif job['platform'] == 'Adzuna' and is_truncated:
                        print(f"📊 Adzuna-Beschreibung kurz ({len(api_desc)} Zeichen) - aber kein Scraping (Anti-Bot-Schutz)")
                        content = self.build_api_content(job)
                    else:
                        print("📊 API-Beschreibung scheint vollständig zu sein")
                        content = self.build_api_content(job)
                    
                elif 'stepstone.de' in job['url']:
                    # Nur Stepstone muss gescrapt werden
                    print("📄 Scrape Stepstone...")
                    content = self.bewerbungshelfer.scrape_stepstone_with_retry(job['url'])
                    
                    if not content or len(content) < 200:
                        print(f"❌ Stepstone Scraping fehlgeschlagen ({len(content) if content else 0} Zeichen)")
                        content = None
                else:
                    # Andere URLs - versuche Scraping
                    print("📄 Scrape Content...")
                    content = self.scrape_with_strategy(job['url'])
                
                # Fallback für alle fehlgeschlagenen Fälle
                if not content or len(content) < 200:
                    print(f"🆘 Fallback: Nutze Job-Basis-Infos...")
                    content = f"""
                    Stellenausschreibung:
                    Position: {job['title']}
                    Unternehmen: {job['company']}
                    Standort: {job['location']}
                    
                    Eine interessante Position im Bereich Digital Marketing und E-Commerce.
                    Weitere Details zur Position werden gerne im persönlichen Gespräch besprochen.
                    """
                
                print(f"✅ Content: {len(content)} Zeichen")
                
                # Anschreiben generieren
                print("⚡ Generiere Anschreiben...")
                # 🔧 KRITISCHER FIX: Korrekte job_data Übergabe für Betreff-Extraktion
                manual_job_data = {
                    'title': job.get('title'),
                    'company': job.get('company'),
                    'location': job.get('location'),
                    'url': job.get('url')
                }
                
                # Verwende neuen modularen ApplicationGenerator (Fassade)
                if hasattr(self.bewerbungshelfer, "application_generator"):
                    anschreiben = self.bewerbungshelfer.application_generator.generate_letter(content, job_data=manual_job_data)
                else:
                    anschreiben = self.bewerbungshelfer.generate_anschreiben(content, job_data=manual_job_data)
                
                if not anschreiben:
                    print("❌ Anschreiben-Fehler")
                    continue
                
                # PDF erstellen mit positionsbasiertem Namen
                print("📄 Erstelle PDF...")
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                
                # Positionsbasierter Dateiname (wird später noch gefiltert)
                raw_title = job.get('title') or job.get('position') or 'Bewerbung'
                position_clean = clean_job_title_string(raw_title) if raw_title else 'Bewerbung'
                pdf_file = f"Bewerbung als {position_clean}_{timestamp}.pdf"
                txt_file = f"Bewerbung als {position_clean}_{timestamp}.txt"
                
                # Vollständiges DIN 5008 Format erstellen
                full_letter = self.bewerbungshelfer.create_full_din5008_letter(anschreiben, content, job)
                
                # WICHTIGE INFOS OBEN + Stellenausschreibung für Abgleich
                # datetime ist bereits oben importiert
                
                # Extrahiere wichtige Job-Infos
                job_date = job.get('created') or job.get('job_posted_at') or job.get('date_found', 'Unbekannt')
                employment_type = job.get('job_employment_type') or job.get('contract_type', 'Nicht angegeben')
                is_remote = job.get('job_is_remote', False)
                remote_info = "Remote" if is_remote else "Vor Ort"
                
                # Versuche Remote-Info aus Beschreibung zu extrahieren falls nicht in API
                if not is_remote and content:
                    content_lower = content.lower()
                    if any(term in content_lower for term in ['remote', 'homeoffice', 'home office', 'hybrid']):
                        if 'hybrid' in content_lower:
                            remote_info = "Hybrid"
                        elif any(term in content_lower for term in ['remote', 'homeoffice', 'home office']):
                            remote_info = "Remote möglich"
                
                reference_info = f"""=== 📋 JOB-ÜBERSICHT ===
🎯 POSITION: {job['title']}
🏢 UNTERNEHMEN: {job['company']}
📍 ORT: {job['location']}
📅 DATUM: {job_date}
⏰ BESCHÄFTIGUNG: {employment_type}
🏠 ARBEITSPLATZ: {remote_info}
🌐 PLATTFORM: {job['platform']}

🔗 STELLENAUSSCHREIBUNG (anklickbar):
{job['url']}

=== 📄 VOLLSTÄNDIGE STELLENBESCHREIBUNG ===
{content}

=== 📋 ENDE STELLENAUSSCHREIBUNG ===
"""
                
                full_letter_with_reference = full_letter + "\n\n" + reference_info
                
                # ────────────────────────────────────────────────
                # 📄 DATEIEN SPEICHERN (mit sicherem Dateinamen)
                # ────────────────────────────────────────────────
                safe_title = clean_filename_string(position_clean)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                folder_path = Path("applications")
                folder_path.mkdir(parents=True, exist_ok=True)
                base_name = folder_path / f"Bewerbung_{safe_title}_{timestamp}"
                txt_file_path = base_name.with_suffix('.txt')
                pdf_file_path = base_name.with_suffix('.pdf')
                
                # 📍 Firmenadresse suchen (nachdem Anschreiben fertig ist)
                company_name = job.get('company', 'Unbekanntes Unternehmen')
                if hasattr(self.bewerbungshelfer, "address_lookup"):
                    address_info = self.bewerbungshelfer.address_lookup.find_address(
                        company_name,
                        job_description=content or "",
                        job_data=job,
                    )
                else:
                    address_info = self.bewerbungshelfer.find_company_address(company_name, content or "", job_data=job)
                
                address_present = self.bewerbungshelfer.should_create_pdf_with_address(address_info)
                
                # 💬 Neue Rückfrage-Logik, falls keine Adresse vorhanden
                if not address_present:
                    try:
                        answer = input("⚠️  Keine Firmenanschrift gefunden. Trotzdem TXT-Datei speichern (j/n)? ")
                        if not answer.lower().startswith('j'):
                            print("⏭️  Job übersprungen – keine Datei gespeichert.")
                            continue  # Überspringe Job ohne etwas abzulegen
                    except EOFError:
                        # Non-interactive mode - automatically save
                        print("⚠️  Keine Firmenanschrift gefunden. Speichere trotzdem (non-interactive mode).")
                        pass
                
                # Schreibe TXT (immer, wenn wir hier sind)
                with open(txt_file_path, 'w', encoding='utf-8') as f:
                    f.write(full_letter_with_reference)
                
                # PDF nur, wenn Adresse vorhanden
                pdf_path_str = None
                if address_present:
                    pdf_job_data = job.copy()
                    if address_info:
                        pdf_job_data['address_info'] = address_info
                    ok = self.bewerbungshelfer.create_professional_pdf(
                        anschreiben,
                        str(pdf_file_path),
                        job.get('description'),
                        pdf_job_data
                    )
                    if ok:
                        pdf_path_str = str(pdf_file_path)
                
                # Save to draft database for future editing
                try:
                    from draft_storage import create_draft
                    job_info = {'company': company_name, 'title': job.get('title', 'Unbekannte Position')}
                    create_draft(job_info, anschreiben)
                    print(f"✅ Draft saved for {company_name} - {job.get('title', 'Unbekannte Position')}")
                except Exception as draft_err:
                    print(f"⚠️ Draft saving failed: {draft_err}")

                # Job als abgeschlossen markieren
                if self.mark_job_as_completed(job['job_id'], user_approved=True, job_data=job):
                    successful += 1
                    print("✅ Erfolgreich gespeichert! →", txt_file_path.name, ("+ PDF" if pdf_path_str else ""))
                else:
                    print("❌ Job completion failed")
            except Exception as e:
                print(f"❌ Fehler: {e}")
                print("FULL TRACEBACK:")
                import traceback
                traceback.print_exc()
        
        print(f"\n🎉 {successful} Bewerbungen verarbeitet!")

    def hunt_ultimate(self, max_jobs=15, auto_process=3, keywords=None):
        """🎯 Ultimate Job Hunt"""
        print("🎯 ULTIMATE JOB HUNT GESTARTET!")
        
        # Cache search parameters for rewrite functionality
        self.cache_search_parameters(
            max_jobs=max_jobs, 
            auto_process=auto_process, 
            keywords=keywords
        )
        
        try:
            # Suche - use keywords if provided, otherwise fallback to preferences
            if keywords:
                all_jobs = self.fetch_jobs_from_providers(keywords, max_jobs, location=location, include_remote=include_remote)
            else:
                all_jobs = self.search_all_sources(max_jobs)
            
            if not all_jobs:
                print("❌ Keine Jobs gefunden!")
                return
            
            # Check for cancellation before ranking
            if self.check_cancellation():
                return
            
            # Ranking
            ranked_jobs = self.rank_jobs(all_jobs)
            
            if not ranked_jobs:
                self.emit_json_event('final_results', {
                    'message': 'Keine relevanten Jobs gefunden – bitte Suchbegriffe anpassen.',
                    'status': 'no_jobs'
                })
                return
            
            # Verarbeitung
            self.process_top_jobs(ranked_jobs, auto_process)
            
        except KeyboardInterrupt:
            print("\n⏹️ Unterbrochen")
        except Exception as e:
            print(f"\n❌ Fehler: {e}")
            import traceback
            traceback.print_exc()

    def scrape_stepstone_job_details(self, driver, job_url):
        """🔍 Scrape einzelne Stepstone-Job-Details für bessere Anschreiben"""
        details = {'description': '', 'requirements': '', 'benefits': ''}
        
        try:
            print(f"      📄 Lade Details: {job_url[:50]}...")
            
            # Neuen Tab öffnen für Job-Details
            driver.execute_script("window.open('');")
            driver.switch_to.window(driver.window_handles[1])
            
            # Job-Seite laden mit Timeout
            driver.get(job_url)
            
            # Warten auf Seiteninhalt
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            from selenium.webdriver.common.by import By
            
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "main"))
                )
            except:
                pass  # Fallback: Versuche trotzdem zu parsen
            
            # BeautifulSoup für robustes Parsing
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Verschiedene Selektoren für Job-Beschreibung
            description_selectors = [
                '[data-testid="job-description"]',
                '.job-description',
                '#job-description',
                '.jobad-content',
                '.job-content',
                'main section',
                'article'
            ]
            
            description_text = ""
            for selector in description_selectors:
                elements = soup.select(selector)
                if elements:
                    for elem in elements:
                        # Skripte und Styles entfernen
                        for tag in elem(['script', 'style', 'nav', 'header', 'footer']):
                            tag.decompose()
                        text = elem.get_text(' ', strip=True)
                        if len(text) > 100:  # Nur substantielle Texte
                            description_text += text + " "
                    if description_text:
                        break
            
            # Fallback: Gesamter Seitentext
            if not description_text:
                # Alle störenden Elemente entfernen
                for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
                    tag.decompose()
                description_text = soup.get_text(' ', strip=True)
            
            # Text bereinigen und begrenzen
            description_text = description_text[:3000]  # Max 3000 Zeichen
            
            # Einfache Kategorisierung
            text_lower = description_text.lower()
            
            # Anforderungen extrahieren
            requirements_keywords = ['anforderungen', 'requirements', 'qualifikation', 'erfahrung', 'skills', 'kenntnisse']
            requirements = []
            for keyword in requirements_keywords:
                if keyword in text_lower:
                    # Vereinfachte Extraktion
                    start = text_lower.find(keyword)
                    if start != -1:
                        segment = description_text[start:start+500]
                        requirements.append(segment)
                        break
            
            # Benefits extrahieren
            benefits_keywords = ['benefits', 'vorteile', 'bieten wir', 'unser angebot', 'was wir bieten']
            benefits = []
            for keyword in benefits_keywords:
                if keyword in text_lower:
                    start = text_lower.find(keyword)
                    if start != -1:
                        segment = description_text[start:start+300]
                        benefits.append(segment)
                        break
            
            details = {
                'description': description_text,
                'requirements': ' '.join(requirements),
                'benefits': ' '.join(benefits)
            }
            
            print(f"      ✅ Details: {len(description_text)} chars")
            
        except Exception as detail_error:
            print(f"      ⚠️ Detail-Scraping fehlgeschlagen: {detail_error}")
            details = {'description': 'Details nicht verfügbar', 'requirements': '', 'benefits': ''}
        
        finally:
            # Tab schließen und zurück zur Hauptseite
            try:
                if len(driver.window_handles) > 1:
                    driver.close()  # Aktuellen Tab schließen
                    driver.switch_to.window(driver.window_handles[0])  # Zurück zum Haupt-Tab
            except:
                pass
        
        return details

    def hunt_interactive(self, keyword_str='', max_jobs=15, max_age_days=None, location=None, include_remote=False, profile_name=None):
        """🎯 Neue Interactive Hunt-Funktion"""
        try:
            self.emit_json_event('stage_change', {
                'stage': 'Initialisierung',
                'message': 'Starte Interactive Job Search...',
                'progress': 0
            })
            
            # Schritt 1: Jobs sammeln
            self.emit_json_event('stage_change', {
                'stage': 'Jobsuche',
                'message': 'Sammle Jobs von verschiedenen Plattformen...',
                'progress': 10
            })
            
            # Verwende neue Provider-übergreifende Fetch-Funktion
            if not keyword_str:
                keyword_str = "Digital Marketing Manager"
            
            # Verwende übergebenen max_jobs Parameter und max_age_days
            
            all_jobs = self.fetch_jobs_from_providers(keyword_str, max_jobs, max_age_days, location=location, include_remote=include_remote, profile_name=profile_name)
            
            # Progress update nach Job-Sammlung
            self.emit_json_event('stage_change', {
                'stage': 'Jobsuche abgeschlossen',
                'message': f'{len(all_jobs)} Jobs von allen Providern gefunden',
                'progress': 40
            })
            
            # Schritt 2: Jobs ranken
            self.emit_json_event('stage_change', {
                'stage': 'Ranking',
                'message': f'Bewerte und ranke {len(all_jobs)} gefundene Jobs...',
                'progress': 45
            })
            
            # Check for cancellation before ranking
            if self.check_cancellation():
                return {'error': 'Process was cancelled', 'status': 'cancelled'}
            
            ranked_jobs = self.rank_jobs(all_jobs)
            
            self.emit_json_event('stage_change', {
                'stage': 'Ranking abgeschlossen',
                'message': f'{len(ranked_jobs)} relevante Jobs gefunden',
                'progress': 50
            })
            
            # Early Exit: Keine relevanten Jobs gefunden
            if len(ranked_jobs) == 0:
                self.emit_json_event('final_results', {
                    'message': 'Keine relevanten Jobs gefunden - bitte Suchkriterien anpassen',
                    'status': 'no_jobs',
                    'total_found': len(all_jobs),
                    'relevant_count': 0
                })
                return
            
            # Schritt 3: User Selection Event
            self.emit_json_event('user_selection_required', {
                'ranked_jobs': ranked_jobs,
                'total_found': len(all_jobs),
                'relevant_count': len(ranked_jobs)
            })
            
            # Warte auf User Input (über stdin)
            selected_jobs = self.wait_for_job_selection()
            if not selected_jobs:
                self.emit_json_event('final_results', {
                    'message': 'Keine Jobs ausgewählt - Workflow beendet',
                    'status': 'cancelled'
                })
                return
            
            # Schritt 4: Bewerbungen generieren (mit Adress-Suche für Frontend-Anzeige)
            applications = self.process_selected_jobs(selected_jobs, ranked_jobs, save_files=False, search_addresses=True)
            
            # Schritt 5: User Approval Event
            self.emit_json_event('user_approval_required', {
                'applications': applications,
                'count': len(applications)
            })
            
            # Warte auf User Approval
            approved_jobs = self.wait_for_application_approval()
            
            # Schritt 6: Finalisierung
            finalized_count = 0
            generated_count = 0  # tatsächlich gespeicherte Bewerbungen
            finalized_apps: List[Dict[str, Any]] = []
            app_lookup = {app['job_id']: app for app in applications}

            for entry in approved_jobs:
                # Eintrag kann entweder int (Legacy) oder Dict sein
                if isinstance(entry, dict):
                    job_id = entry.get('job_id')
                    updated_text = entry.get('application_text')
                    sender_address = entry.get('sender_address')
                    company_address = entry.get('company_address')
                    force_pdf = bool(entry.get('force_pdf'))
                else:
                    job_id = entry
                    updated_text = None
                    sender_address = None
                    company_address = None
                    force_pdf = False

                if not job_id:
                    continue

                app_data = app_lookup.get(job_id)

                # Jetzt erst – nach Approval – Dateien schreiben 📂
                if app_data:
                    try:
                        # Verwende Aktualisierungen des Users, falls vorhanden
                        final_text = updated_text or app_data['application_text']

                        # Prepare job data with user-provided addresses
                        final_job_data = app_data.copy()
                        if company_address and company_address.strip():
                            # User provided company address - add to job data
                            final_job_data['user_company_address'] = company_address.strip()
                        if sender_address and sender_address.strip():
                            # User provided sender address - add to job data  
                            final_job_data['user_sender_address'] = sender_address.strip()

                        # Erzeuge Dateinamen & speichere
                        save_info = self.save_application(
                            final_text,
                            app_data['company'],
                            app_data['filename'],
                            final_job_data
                        )

                        # Merge Save-Info zurück in dict
                        app_data.update(save_info)
                        generated_count += 1
                        
                        # Save to draft database for future editing
                        try:
                            from draft_storage import create_draft
                            job_info = {'company': app_data['company'], 'title': app_data['job_title']}
                            create_draft(job_info, final_text)
                            print(f"✅ Draft saved for {app_data['company']} - {app_data['job_title']}")
                        except Exception as draft_err:
                            print(f"⚠️ Draft saving failed: {draft_err}")
                            # Log detailed error for debugging
                            import traceback
                            print(f"⚠️ Draft error details: {traceback.format_exc()}")
                        
                        finalized_apps.append({
                            'job_id': job_id,
                            'company': app_data['company'],
                            'job_title': app_data['job_title'],
                            'pdf_path': save_info.get('pdf_path'),
                            'txt_path': save_info.get('txt_path')
                        })
                    except Exception as save_err:
                        print(f"❌ Speichern nach Approval fehlgeschlagen für Job {job_id}: {save_err}")

                if self.mark_job_as_completed(job_id, user_approved=True):
                    finalized_count += 1
            
            self.emit_json_event('final_results', {
                'message': f'Interactive Workflow abgeschlossen! {finalized_count} Bewerbungen finalisiert.',
                'approved_count': finalized_count,
                'total_generated': generated_count,
                'applications': finalized_apps,
                'status': 'success'
            })
            
        except Exception as e:
            self.emit_json_event('final_results', {
                'message': f'Fehler im Interactive Workflow: {str(e)}',
                'status': 'error'
            })

    def process_selected_jobs(self, selected_job_ids, ranked_jobs, save_files: bool = True, search_addresses: bool = False):
        """🗄️  Backwards-Compatibility Wrapper

        Alte Aufrufe ohne `save_files`-Argument werden hierher geroutet und dann
        direkt an die neue Implementierung `_process_selected_jobs_impl`
        delegiert. So behalten wir API-Kompatibilität ohne doppelten Code.
        """
        return self._process_selected_jobs_impl(selected_job_ids, ranked_jobs, save_files, search_addresses)

    # Refactored implementation (prefixed with underscore to avoid recursion)
    def _process_selected_jobs_impl(self, selected_job_ids, ranked_jobs, save_files: bool, search_addresses: bool = False):
        applications = []

        # Finde ausgewählte Jobs
        selected_id_set = {int(jid) for jid in selected_job_ids}
        selected_jobs = [job for job in ranked_jobs if int(job['id']) in selected_id_set]

        self.emit_json_event('stage_change', {
            'stage': 'Bewerbungserstellung',
            'message': f'Erstelle Bewerbungen für {len(selected_jobs)} Jobs...',
            'progress': 60
        })

        for i, job in enumerate(selected_jobs):
            try:
                application_text = self.generate_application(job)

                company_clean = clean_company_name_string(job['company'])
                raw_title = job.get('title') or job.get('position') or 'Bewerbung'
                position_clean = clean_job_title_string(raw_title) if raw_title else 'Bewerbung'
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"Bewerbung als {position_clean}_{timestamp}.txt"

                if save_files:
                    save_info = self.save_application(application_text, job['company'], filename, job)
                elif search_addresses:
                    # Nur Adress-Suche durchführen ohne Dateien zu speichern
                    print(f"🔍 Searching address for {job['company']} (for frontend display)")
                    try:
                        address_result = self.bewerbungshelfer.find_company_address(
                            job['company'], 
                            job.get('description', ''),
                            job
                        )
                        
                        # Extract address from result
                        if isinstance(address_result, dict):
                            street = address_result.get('street', '')
                            city = address_result.get('city', '') 
                            postal_code = address_result.get('postal_code', '')
                            if street and city:
                                found_address = f"{street}, {postal_code} {city}" if postal_code else f"{street}, {city}"
                            else:
                                found_address = ""
                            
                            # 🔧 FIXED: Preserve complete address_info including street_lines for PDF formatting
                            address_info = address_result.copy()
                            address_info['search_performed'] = True
                        else:
                            found_address = str(address_result) if address_result else ""
                            address_info = {'search_performed': True, 'method': 'fallback_string'}
                        
                        address_available = bool(found_address and found_address != "Nicht verfügbar")
                        save_info = {
                            'txt_path': '', 
                            'pdf_path': None,
                            'found_address': found_address or '',
                            'address_info': address_info,
                            'address_available': address_available
                        }
                        print(f"✅ Address search result: {found_address} (available: {address_available})")
                    except Exception as e:
                        print(f"❌ Address search failed: {e}")
                        save_info = {
                            'txt_path': '', 
                            'pdf_path': None,
                            'found_address': '',
                            'address_info': {'search_performed': True, 'error': str(e)},
                            'address_available': False
                        }
                else:
                    save_info = {'txt_path': '', 'pdf_path': None}

                application_data = {
                    **save_info,
                    'job_id': int(job['id']),
                    'job_title': job['title'],
                    'company': job['company'],
                    'application_text': application_text,
                    'filename': filename,
                    'file_path': save_info.get('txt_path', ''),
                    'found_address': save_info.get('found_address', ''),
                    'address_info': save_info.get('address_info', {}),
                    'address_available': save_info.get('address_available', False)
                }

                applications.append(application_data)

                progress = 60 + int(((i + 1) / max(1, len(selected_jobs))) * (10 if save_files else 5))
                self.emit_json_event('stage_change', {
                    'stage': 'Bewerbungserstellung',
                    'message': f'{i+1}/{len(selected_jobs)} Entwürfe generiert',
                    'progress': progress
                })
            except Exception as e:
                print(f"   ❌ Fehler bei Job {job['id']}: {str(e)}")
                continue
        return applications

    def wait_for_job_selection(self):
        """🎯 Warte auf Job-Auswahl vom User via HTTP"""
        import requests
        import time
        
        print("   ⏳ Warte auf Job-Auswahl via HTTP...")
        
        timeout = 300  # 5 minutes
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Check for job selection data from HTTP API
                response = requests.get('http://localhost:8000/job-selection', timeout=1)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('type') == 'job_selection':
                        job_ids = data.get('selected_job_ids', [])
                        print(f"   ✅ Job-Auswahl über HTTP erhalten: {job_ids}")
                        return job_ids
                    elif data.get('type') == 'cancel':
                        print("   ❌ Abbruch über HTTP erhalten")
                        return []
                        
            except requests.exceptions.RequestException:
                # API not ready or no data yet, continue waiting
                pass
            except Exception as e:
                print(f"   ❌ HTTP-Fehler: {e}")
                
            # Check for cancellation
            if self.check_cancellation():
                print("   ❌ Prozess abgebrochen")
                return []
                
            time.sleep(1)  # Check every second
        
        print("   ⏰ Timeout - keine Auswahl erhalten")
        return []

    def wait_for_application_approval(self):
        """🎯 Warte auf Bewerbungs-Genehmigung vom User via HTTP"""
        import requests
        import time
        
        print("   ⏳ Warte auf Bewerbungs-Genehmigung via HTTP...")
        
        timeout = 300  # 5 minutes
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Check for application approval data from HTTP API
                response = requests.get('http://localhost:8000/application-approval', timeout=1)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('type') == 'application_approval':
                        approved_apps = data.get('approved_applications', [])
                        print(f"   ✅ Bewerbungs-Genehmigung über HTTP erhalten: {len(approved_apps)} Bewerbungen")
                        return approved_apps
                    elif data.get('type') == 'cancel':
                        print("   ❌ Abbruch über HTTP erhalten")
                        return []
                        
            except requests.exceptions.RequestException:
                # API not ready or no data yet, continue waiting
                pass
            except Exception as e:
                print(f"   ❌ HTTP-Fehler: {e}")
                
            # Check for cancellation
            if self.check_cancellation():
                print("   ❌ Prozess abgebrochen")
                return []
                
            time.sleep(1)  # Check every second
        
        print("   ⏰ Timeout - keine Genehmigung erhalten")
        return []

    # =========================================
    # 🔄 JSON Event Emitter (für GUI-Integration)
    # =========================================
    def emit_json_event(self, event_type: str, data: Optional[Dict[str, Any]] = None):
        """Sendet strukturierte JSON-Events an stdout, wenn json_output aktiviert ist."""
        if not self.json_output:
            # Wenn nicht aktiviert, nur Debug-Ausgabe
            return

        payload: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'type': event_type
        }

        if data is not None:
            payload.update(data)

        try:
            sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
            sys.stdout.flush()
        except Exception as e:
            # Fallback: einfache Print-Ausgabe
            print(f"⚠️ emit_json_event failed: {e}")

    # =========================================
    # 💌 Bewerbung generieren & speichern
    # =========================================
    def generate_application(self, job: dict) -> str:
        """Erzeuge Anschreiben-Text für einen Job.

        1. Nutzt vorhandene Beschreibung, sonst Scraping-Fallback.
        2. Ruft TurboBewerbungsHelfer.generate_anschreiben auf.
        3. Gibt generierten Brieftext zurück (reiner Text, kein PDF)."""

        # 1) Vollständige Stellenausschreibung besorgen
        job_description = job.get('description')
        if not job_description or len(job_description) < 200:
            scraped = self.scrape_with_strategy(job.get('url', ''))
            if scraped and len(scraped) > len(job_description or ''):
                job_description = scraped

        if not job_description:
            # Minimaler Fallback – nur Basisdaten
            job_description = (
                f"Position: {job.get('title')}\n"
                f"Unternehmen: {job.get('company')}\n"
                f"Standort: {job.get('location')}\n"
            )

        # 2) Anschreiben generieren
        # 🔧 KRITISCHER FIX: Korrekte job_data Übergabe für Betreff-Extraktion
        job_data = {
            'title': job.get('title'),
            'company': job.get('company'),
            'location': job.get('location'),
            'url': job.get('url')
        }
        
        # Verwende neuen modularen ApplicationGenerator (Fassade)
        if hasattr(self.bewerbungshelfer, "application_generator"):
            anschreiben = self.bewerbungshelfer.application_generator.generate_letter(job_description, job_data=job_data)
        else:
            anschreiben = self.bewerbungshelfer.generate_anschreiben(job_description, job_data=job_data)

        # 3) NO SAFETY-NET - AI REQUIRED!
        if not anschreiben:
            logger.error("❌ AI-BEWERBUNGSGENERIERUNG FEHLGESCHLAGEN - KEINE FALLBACK-TEMPLATE!")
            raise Exception("AI-Bewerbungsgenerierung fehlgeschlagen. Kein Fallback-Template verfügbar.")
        return anschreiben.strip()

    def save_application(self, application_text: str, company: str, filename: str, job: dict) -> dict:
        """Speichere Anschreiben als PDF wenn Adresse vorhanden, sonst nur als TXT.

        • Hat die Bewerbungshelfer-Komponente eine gültige Adresse → PDF + TXT
        • Fehlt die Anschrift → nur TXT-Datei mit Platzhalter für manuelle Adresse
        Rückgabe-Dict enthält:
        { 'pdf_path': <str|None>, 'txt_path': <str>, 'address_info': <dict>, 'found_address': <str>, 'address_available': <bool> }
        """
        
        print(f"🎯 save_application CALLED with company: {company}")
        print(f"🎯 save_application job keys: {list(job.keys()) if job else 'None'}")
        print(f"🎯 save_application user_company_address: {job.get('user_company_address') if job else 'No job_data'}")
        print("🔥 MANUAL JOB DEBUG: save_application function definitely called!")
        
        safe_company = clean_company_name_string(company)
        folder_name = f"{safe_company}_{datetime.now().strftime('%Y-%m-%d')}"
        folder_path = Path("applications") / folder_name
        folder_path.mkdir(parents=True, exist_ok=True)

        # Baue eindeutigen Dateinamen (Basis ohne Extension)
        raw_title = job.get('title') or job.get('position') or 'Bewerbung'
        position_clean = clean_job_title_string(raw_title) if raw_title else 'Bewerbung'
        position_safe = clean_filename_string(position_clean)  # ✅ FIX: Sanitize for filesystem
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_file = folder_path / f"Bewerbung als {position_safe}_{timestamp}"
        txt_file = base_file.with_suffix('.txt')
        pdf_file = base_file.with_suffix('.pdf')

        # ✨ Stelle sicher, dass keine Datei überschrieben wird
        version = 1
        while txt_file.exists() or pdf_file.exists():
            version += 1
            base_file = folder_path / f"Bewerbung als {position_safe}_{timestamp}_v{version}"
            txt_file = base_file.with_suffix('.txt')
            pdf_file = base_file.with_suffix('.pdf')

        # Check if user provided addresses, otherwise search automatically
        user_company_address = job.get('user_company_address')
        user_sender_address = job.get('user_sender_address')
        
        if user_company_address and user_company_address.strip():
            # 🎯 ENHANCED: Smart Address Parsing for user-provided addresses
            import re
            address_lines = user_company_address.strip().split('\n')
            
            # Initialize address_info with defaults
            address_info = {
                'found_method': 'user_provided',
                'street': '',
                'city': '',
                'postal_code': '',
                'company_name': company,  # Use the original company name
                'full_address': user_company_address.strip()
            }
            
            # Parse address intelligently
            if len(address_lines) == 1:
                # Single line input - try smart parsing
                single_line = address_lines[0].strip()
                
                # FORMAT 1: "Street, PLZ City" (with comma)
                if ',' in single_line:
                    parts = [part.strip() for part in single_line.split(',')]
                    if len(parts) >= 2:
                        address_info['street'] = parts[0].strip()
                        # Try to extract PLZ and city from remaining parts
                        remaining = ', '.join(parts[1:])
                        print(f"   🔍 PARSE DEBUG: single_line='{single_line}'")
                        print(f"   🔍 PARSE DEBUG: parts={parts}")
                        print(f"   🔍 PARSE DEBUG: remaining='{remaining}'")
                        plz_city_match = re.search(r'(\d{5})\s+([A-ZÄÖÜ][a-zäöüß\-\s]+?)(?:,|$)', remaining)
                        print(f"   🔍 PARSE DEBUG: plz_city_match={plz_city_match}")
                        if plz_city_match:
                            address_info['postal_code'] = plz_city_match.group(1)
                            address_info['city'] = plz_city_match.group(2).strip()
                            print(f"   🔧 USER ADDRESS (comma format): Street: '{address_info['street']}', PLZ: '{address_info['postal_code']}', City: '{address_info['city']}'")
                        else:
                            print(f"   ⚠️ PARSE DEBUG: Regex failed to match remaining part: '{remaining}'")
                
                # FORMAT 2: "Street HouseNumber PLZ City" (without comma)
                if not address_info['street'] and not address_info['city']:
                    no_comma_pattern = r'^(.+?\s+\d+[a-z]?)\s+(\d{5})\s+(.+)$'
                    no_comma_match = re.search(no_comma_pattern, single_line)
                    if no_comma_match:
                        address_info['street'] = no_comma_match.group(1).strip()
                        address_info['postal_code'] = no_comma_match.group(2).strip()
                        address_info['city'] = no_comma_match.group(3).strip()
                        print(f"   🔧 USER ADDRESS (no-comma format): Street: '{address_info['street']}', PLZ: '{address_info['postal_code']}', City: '{address_info['city']}'")
                
                # FALLBACK: If parsing fails, store as street only
                if not address_info['street'] and not address_info['city']:
                    address_info['street'] = single_line
                    print(f"   ⚠️ USER ADDRESS: Could not parse, stored as street: '{single_line}'")
            
            else:
                # Multi-line input - use lines as components
                # Assume: Line 1 = Street, Line 2 = PLZ City (or separate PLZ/City)
                if len(address_lines) >= 1:
                    address_info['street'] = address_lines[0].strip()
                if len(address_lines) >= 2:
                    # Try to parse "PLZ City" format
                    second_line = address_lines[1].strip()
                    plz_city_match = re.search(r'(\d{5})\s+(.+)', second_line)
                    if plz_city_match:
                        address_info['postal_code'] = plz_city_match.group(1)
                        address_info['city'] = plz_city_match.group(2).strip()
                    else:
                        # If no PLZ pattern, treat as city
                        address_info['city'] = second_line
                
                print(f"   🔧 USER ADDRESS (multi-line): Street: '{address_info['street']}', PLZ: '{address_info['postal_code']}', City: '{address_info['city']}'")
            
            address_present = True
        else:
            # Fallback to automatic address search
            if hasattr(self.bewerbungshelfer, "address_lookup"):
                address_info = self.bewerbungshelfer.address_lookup.find_address(
                    company,
                    job_description=job.get('description', ''),
                    job_data=job,
                )
            else:
                address_info = self.bewerbungshelfer.find_company_address(company, job.get('description', ''), job_data=job)
            
            # Ensure full_address is available for automatic search results
            if address_info and not address_info.get('full_address'):
                address_parts = []
                if address_info.get('street'):
                    address_parts.append(address_info['street'])
                if address_info.get('postal_code') and address_info.get('city'):
                    address_parts.append(f"{address_info['postal_code']} {address_info['city']}")
                elif address_info.get('city'):
                    address_parts.append(address_info['city'])
                if address_parts:
                    address_info['full_address'] = ', '.join(address_parts)
            
            address_present = self.bewerbungshelfer.should_create_pdf_with_address(address_info)

        try:
            # Wenn Adresse fehlt, belassen wir den Brieftext unverändert.
            # Die PDF-Generierungsroutine fügt später – abhängig von der vom Benutzer
            # eingegebenen Unternehmensanschrift – automatisch den Adressblock im Kopf ein.

            # Entscheide, ob wir ein PDF erzeugen - nur wenn eine gültige Adresse vorhanden ist
            pdf_path_str: Optional[str] = None
            should_generate_pdf = address_present  # PDF nur bei gültiger Adresse
            if should_generate_pdf:
                # Create enhanced job data with user addresses for PDF generation
                pdf_job_data = job.copy()
                if user_company_address:
                    pdf_job_data['user_company_address'] = user_company_address
                if user_sender_address:
                    pdf_job_data['user_sender_address'] = user_sender_address
                pdf_job_data['address_info'] = address_info
                
                ok = self.bewerbungshelfer.create_professional_pdf(
                    application_text,
                    str(pdf_file),
                    job.get('description'),
                    pdf_job_data
                )
                if ok:
                    pdf_path_str = str(pdf_file)

            # 📝 TXT-Datei mit Brief + Job-Übersicht speichern (inkl. Platzhalter)
            try:
                txt_content = self.bewerbungshelfer.create_job_overview_content(
                    application_text,
                    job,
                    job.get('description')
                )
                
                # 🎯 POST-PROCESSING: Fix address layout for user-provided addresses
                print(f"🔍 POST-PROCESS DEBUG: user_company_address = '{job.get('user_company_address')}'")
                print(f"🔍 POST-PROCESS DEBUG: address_info = {address_info}")
                print(f"🔍 POST-PROCESS DEBUG: address_info.get('street') = '{address_info.get('street') if address_info else 'No address_info'}'")
                print(f"🔍 POST-PROCESS DEBUG: address_info.get('city') = '{address_info.get('city') if address_info else 'No address_info'}'")
                
                if job.get('user_company_address') and job.get('user_company_address').strip():
                    print("🔍 POST-PROCESS DEBUG: User address found, proceeding with comprehensive parsing")
                    user_address_single_line = job.get('user_company_address').strip()
                    
                    # COMPREHENSIVE ADDRESS PARSING for post-processing
                    import re
                    street = ''
                    postal_code = ''
                    city = ''
                    
                    # Try to use already parsed components first
                    if address_info and address_info.get('street') and address_info.get('city'):
                        street = address_info.get('street')
                        postal_code = address_info.get('postal_code', '')
                        city = address_info.get('city')
                        print(f"🔍 POST-PROCESS DEBUG: Using pre-parsed components")
                    else:
                        # Parse address manually in post-processing
                        print(f"🔍 POST-PROCESS DEBUG: Parsing address manually: '{user_address_single_line}'")
                        
                        # FORMAT 1: "Street, PLZ City" (with comma)
                        if ',' in user_address_single_line:
                            parts = [part.strip() for part in user_address_single_line.split(',')]
                            if len(parts) >= 2:
                                street = parts[0].strip()
                                remaining = parts[1].strip()
                                # Extract PLZ and city from remaining part
                                plz_city_match = re.match(r'(\d{4,5})\s+(.+)', remaining)
                                if plz_city_match:
                                    postal_code = plz_city_match.group(1)
                                    city = plz_city_match.group(2).strip()
                                    print(f"🔍 POST-PROCESS DEBUG: Comma format parsed - Street: '{street}', PLZ: '{postal_code}', City: '{city}'")
                        
                        # FORMAT 2: "Street HouseNumber PLZ City" (without comma)
                        if not street and not city:
                            parts = user_address_single_line.split()
                            plz_index = None
                            for i, part in enumerate(parts):
                                if re.match(r'^\d{4,5}$', part):
                                    plz_index = i
                                    break
                            
                            if plz_index is not None and plz_index > 0:
                                street = ' '.join(parts[:plz_index])
                                postal_code = parts[plz_index]
                                city = ' '.join(parts[plz_index + 1:]) if plz_index + 1 < len(parts) else ''
                                print(f"🔍 POST-PROCESS DEBUG: No-comma format parsed - Street: '{street}', PLZ: '{postal_code}', City: '{city}'")
                    
                    # Create DIN 5008 replacement if we have the components
                    if street and (city or postal_code):
                        if postal_code and city:
                            address_replacement = f"{street}\n{postal_code} {city}"
                        elif city:
                            address_replacement = f"{street}\n{city}"
                        else:
                            address_replacement = f"{street}\n{postal_code}"
                        
                        print(f"🔍 POST-PROCESS DEBUG: Looking for '{user_address_single_line}' in txt_content")
                        print(f"🔍 POST-PROCESS DEBUG: Will replace with '{address_replacement}'")
                        print(f"🔍 POST-PROCESS DEBUG: txt_content length: {len(txt_content)}")
                        
                        # Replace in txt_content
                        if user_address_single_line in txt_content:
                            txt_content = txt_content.replace(user_address_single_line, address_replacement)
                            print(f"   🔧 POST-PROCESSING: Fixed address layout - '{user_address_single_line}' → DIN 5008 format")
                        else:
                            print(f"   ⚠️ POST-PROCESSING: Could not find '{user_address_single_line}' in txt_content")
                            # Try a partial search to see what's in the txt_content
                            lines = txt_content.split('\n')
                            for i, line in enumerate(lines[:20]):  # Check first 20 lines
                                if any(word in line for word in user_address_single_line.split()[:2]):  # Check first 2 words
                                    print(f"   🔍 POST-PROCESS DEBUG: Possible address line {i}: '{line}'")
                    else:
                        print("🔍 POST-PROCESS DEBUG: Could not parse address components, skipping post-processing")
                else:
                    print("🔍 POST-PROCESS DEBUG: No user address found, skipping post-processing")
                
                txt_file.write_text(txt_content, encoding='utf-8')
            except Exception as txt_err:
                print(f"❌ TXT-Schreibfehler: {txt_err}")
        except Exception as e:
            print(f"❌ Fehler bei PDF-Erstellung: {e}")
 
        # Create full_address from address_info components
        full_address = ''
        if address_info:
            address_parts = []
            if address_info.get('street'):
                address_parts.append(address_info['street'])
            if address_info.get('postal_code') and address_info.get('city'):
                address_parts.append(f"{address_info['postal_code']} {address_info['city']}")
            elif address_info.get('city'):
                address_parts.append(address_info['city'])
            full_address = ', '.join(address_parts)

        # 🛠️ FINAL FALLBACK FIX: Ensure TXT file has proper DIN 5008 address formatting
        # This runs regardless of which code path was used to create the TXT file
        if txt_file.exists() and job.get('user_company_address'):
            print(f"🔧 FINAL FALLBACK: Checking TXT file for address formatting")
            try:
                current_content = txt_file.read_text(encoding='utf-8')
                user_address = job.get('user_company_address').strip()
                
                # Check if the address is in single-line format and needs fixing
                if user_address in current_content:
                    print(f"🔧 FINAL FALLBACK: Found single-line address '{user_address}' in TXT file")
                    
                    # Parse and fix the address
                    import re
                    street = ''
                    postal_code = ''
                    city = ''
                    
                    # FORMAT 1: "Street, PLZ City" (with comma)
                    if ',' in user_address:
                        parts = [part.strip() for part in user_address.split(',')]
                        if len(parts) >= 2:
                            street = parts[0].strip()
                            remaining = parts[1].strip()
                            plz_city_match = re.match(r'(\d{4,5})\s+(.+)', remaining)
                            if plz_city_match:
                                postal_code = plz_city_match.group(1)
                                city = plz_city_match.group(2).strip()
                    
                    # FORMAT 2: "Street HouseNumber PLZ City" (without comma)
                    if not street and not city:
                        parts = user_address.split()
                        plz_index = None
                        for i, part in enumerate(parts):
                            if re.match(r'^\d{4,5}$', part):
                                plz_index = i
                                break
                        
                        if plz_index is not None and plz_index > 0:
                            street = ' '.join(parts[:plz_index])
                            postal_code = parts[plz_index]
                            city = ' '.join(parts[plz_index + 1:]) if plz_index + 1 < len(parts) else ''
                    
                    # Apply DIN 5008 formatting if we parsed successfully
                    if street and (city or postal_code):
                        if postal_code and city:
                            din5008_address = f"{street}\n{postal_code} {city}"
                        elif city:
                            din5008_address = f"{street}\n{city}"
                        else:
                            din5008_address = f"{street}\n{postal_code}"
                        
                        # Replace and save the fixed content
                        fixed_content = current_content.replace(user_address, din5008_address)
                        txt_file.write_text(fixed_content, encoding='utf-8')
                        print(f"🔧 FINAL FALLBACK: Fixed TXT file address format - '{user_address}' → DIN 5008")
                    else:
                        print(f"🔧 FINAL FALLBACK: Could not parse address '{user_address}'")
                else:
                    print(f"🔧 FINAL FALLBACK: Address '{user_address}' not found in TXT content")
            except Exception as fallback_err:
                print(f"🔧 FINAL FALLBACK: Error during TXT fix: {fallback_err}")

        # ✅ Return save information
        return {
            'txt_path': str(txt_file),
            'pdf_path': pdf_path_str,
            'address_info': address_info,
            'found_address': full_address,
            'address_available': address_present
        }

    def fetch_jobs_from_providers(self, keywords: str, max_total: int = 15, max_age_days: Optional[int] = None, location: Optional[str] = None, include_remote: bool = False, profile_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        🎯 Provider-übergreifendes Fetch-Limit System - REFACTORED to use JobSearchManager with Profile Cache
        
        Uses the new JobSearchManager module for better modularity and profile-specific caching
        """
        # Check for redundant search calls (prevent within 10 minutes for better UX)
        if self.profile_job_cache.prevent_redundant_search(keywords, location or "", profile_name, timeout_hours=0.167):
            print("🔄 Redundante Suche verhindert - letzte Suche war vor weniger als 10 Minuten")
            # Return empty list or cached results instead
            return []
        
        # Update processed jobs reference in search manager to use profile-specific cache
        profile_processed_jobs = self.profile_job_cache.get_processed_jobs(profile_name)
        self.job_search_manager.processed_jobs = profile_processed_jobs
        
        # 🎯 NEW: Use Smart Location Parser
        location_input = location or ""
        if include_remote and location_input:
            location_input = f"{location_input}, Remote"
        elif include_remote and not location_input:
            location_input = "Remote"
        
        # Parse location with smart parser
        location_data = self.job_search_manager.parse_location_input(location_input)
        print(f"🎯 Location parsed: {location_data}")
        
        # Use the new modular search system with location support
        all_jobs = self.job_search_manager.fetch_jobs_from_providers(keywords, max_total, max_age_days, location_data)
        
        # Get jobs that were new since last search before we update the timestamp
        new_jobs_since_last_search = self.profile_job_cache.get_jobs_since_last_search(profile_name)
        new_job_ids = {job.get('job_id', job.get('url', '')) for job in new_jobs_since_last_search}
        
        # Add jobs to profile-specific cache and mark date_posted/first_seen
        for job in all_jobs:
            # Ensure job has date_posted field from API data
            if 'job_posted_at_datetime_utc' in job and not job.get('date_posted'):
                job['date_posted'] = job['job_posted_at_datetime_utc']
            
            # Add first_seen timestamp
            if not job.get('first_seen'):
                job['first_seen'] = datetime.now().isoformat()
            
            # Mark if this job is new since last search
            job_id = job.get('id', job.get('url', ''))
            job['is_new_since_last_search'] = job_id in new_job_ids
            
            # Add to profile cache (this will prevent duplicates)
            self.profile_job_cache.add_processed_job(job, profile_name)
        
        # Update last search timestamp
        self.profile_job_cache.update_last_search(profile_name)
        
        return all_jobs

    def fetch_jobs_with_mapped_params(self, profile: 'SearchProfile', max_total: int = 15, providers: List[str] = None) -> Dict[str, Any]:
        """
        🎯 Fetch jobs using profile-based parameter mapping
        
        Uses ProfileApiMapper to validate and map profile parameters to provider-specific
        API parameters for more accurate job searches.
        
        Args:
            profile: SearchProfile object with search criteria
            max_total: Maximum number of jobs to fetch
            providers: List of providers to use ['adzuna', 'jsearch', 'stepstone']
            
        Returns:
            Dictionary with mapped parameters, validation results, and job results
        """
        try:
            from profile_api_mapper import ProfileApiMapper, MappedApiParams
            
            # Initialize mapper
            mapper = ProfileApiMapper()
            
            # Validate profile
            validation_result = mapper.validate_profile(profile)
            if not validation_result.is_valid:
                self.emit_json_event('profile_validation_failed', {
                    'errors': validation_result.errors,
                    'warnings': validation_result.warnings
                })
                return {
                    'success': False,
                    'validation': validation_result._asdict(),
                    'jobs': []
                }
            
            # Determine providers to use
            if providers is None:
                providers = ['adzuna', 'jsearch']  # Default providers
            
            all_jobs = []
            mapping_results = {}
            
            # Process each provider
            for provider in providers:
                try:
                    # Map profile to provider-specific parameters
                    mapped_params = mapper.map_profile_to_provider(profile, provider)
                    mapping_results[provider] = {
                        'mapped_params': mapped_params._asdict(),
                        'success': True
                    }
                    
                    # Fetch jobs using mapped parameters
                    if provider == 'adzuna':
                        provider_jobs = self._fetch_adzuna_with_mapped_params(mapped_params, max_total // len(providers))
                    elif provider == 'jsearch':
                        provider_jobs = self._fetch_jsearch_with_mapped_params(mapped_params, max_total // len(providers))
                    elif provider == 'stepstone':
                        provider_jobs = self._fetch_stepstone_with_mapped_params(mapped_params, max_total // len(providers))
                    else:
                        continue
                    
                    # Add provider info to jobs
                    for job in provider_jobs:
                        job['provider'] = provider
                        job['mapped_params_used'] = mapped_params._asdict()
                    
                    all_jobs.extend(provider_jobs)
                    mapping_results[provider]['jobs_found'] = len(provider_jobs)
                    
                except Exception as e:
                    mapping_results[provider] = {
                        'success': False,
                        'error': str(e),
                        'jobs_found': 0
                    }
                    self.emit_json_event('provider_mapping_error', {
                        'provider': provider,
                        'error': str(e)
                    })
            
            # Remove duplicates
            unique_jobs = self._remove_duplicate_jobs(all_jobs)
            
            # Emit success event
            self.emit_json_event('profile_mapped_search_completed', {
                'profile_name': profile.name,
                'providers_used': providers,
                'total_jobs_found': len(unique_jobs),
                'mapping_results': mapping_results
            })
            
            return {
                'success': True,
                'validation': validation_result._asdict(),
                'mapping_results': mapping_results,
                'jobs': unique_jobs[:max_total],
                'total_found': len(unique_jobs)
            }
            
        except ImportError:
            self.emit_json_event('error', {
                'message': 'ProfileApiMapper not available. Please ensure profile_api_mapper.py is present.',
                'type': 'missing_dependency'
            })
            return {
                'success': False,
                'error': 'ProfileApiMapper not available',
                'jobs': []
            }
        except Exception as e:
            self.emit_json_event('error', {
                'message': f'Profile mapped search failed: {str(e)}',
                'type': 'profile_mapped_search_error'
            })
            return {
                'success': False,
                'error': str(e),
                'jobs': []
            }

    def _fetch_adzuna_with_mapped_params(self, mapped_params: 'MappedApiParams', max_jobs: int) -> List[Dict[str, Any]]:
        """Fetch jobs from Adzuna using mapped parameters"""
        try:
            # Use existing Adzuna search but with mapped parameters
            jobs = self.search_adzuna_api(
                query=mapped_params.search_terms,
                max_results=max_jobs,
                max_age_days=mapped_params.max_age_days
            )
            
            # Apply additional filtering based on mapped params
            filtered_jobs = []
            for job in jobs:
                # Apply salary filtering if specified
                if mapped_params.min_salary or mapped_params.max_salary:
                    job_salary = self._extract_salary_from_job(job)
                    if job_salary:
                        if mapped_params.min_salary and job_salary < mapped_params.min_salary:
                            continue
                        if mapped_params.max_salary and job_salary > mapped_params.max_salary:
                            continue
                
                # Apply location filtering if specified
                if mapped_params.location:
                    job_location = job.get('location', {}).get('display_name', '')
                    if mapped_params.location.lower() not in job_location.lower():
                        continue
                
                filtered_jobs.append(job)
            
            return filtered_jobs
            
        except Exception as e:
            print(f"Error fetching Adzuna jobs with mapped params: {e}")
            return []

    def _fetch_jsearch_with_mapped_params(self, mapped_params: 'MappedApiParams', max_jobs: int) -> List[Dict[str, Any]]:
        """Fetch jobs from JSearch using mapped parameters"""
        try:
            # Use existing JSearch search but with mapped parameters
            jobs = self.search_jsearch_api(
                query=mapped_params.search_terms,
                max_results=max_jobs,
                max_age_days=mapped_params.max_age_days
            )
            
            # Apply additional filtering based on mapped params
            filtered_jobs = []
            for job in jobs:
                # Apply employment type filtering
                if mapped_params.employment_types:
                    job_type = job.get('job_employment_type', '').lower()
                    if not any(emp_type.lower() in job_type for emp_type in mapped_params.employment_types):
                        continue
                
                # Apply remote work filtering
                if mapped_params.remote_only:
                    job_remote = job.get('job_is_remote', False)
                    if not job_remote:
                        continue
                
                # Apply salary filtering if specified
                if mapped_params.min_salary or mapped_params.max_salary:
                    job_salary = self._extract_salary_from_job(job)
                    if job_salary:
                        if mapped_params.min_salary and job_salary < mapped_params.min_salary:
                            continue
                        if mapped_params.max_salary and job_salary > mapped_params.max_salary:
                            continue
                
                filtered_jobs.append(job)
            
            return filtered_jobs
            
        except Exception as e:
            print(f"Error fetching JSearch jobs with mapped params: {e}")
            return []

    def _fetch_stepstone_with_mapped_params(self, mapped_params: 'MappedApiParams', max_jobs: int) -> List[Dict[str, Any]]:
        """Fetch jobs from Stepstone using mapped parameters"""
        try:
            # Use existing Stepstone search with query from mapped params
            jobs = self.search_stepstone_stealth(mapped_params.search_terms, max_jobs)
            
            # Apply basic filtering (Stepstone has limited parameter support)
            filtered_jobs = []
            for job in jobs:
                # Apply location filtering if specified
                if mapped_params.location:
                    job_location = job.get('location', '')
                    if mapped_params.location.lower() not in job_location.lower():
                        continue
                
                filtered_jobs.append(job)
            
            return filtered_jobs
            
        except Exception as e:
            print(f"Error fetching Stepstone jobs with mapped params: {e}")
            return []

    def _extract_salary_from_job(self, job: Dict[str, Any]) -> Optional[float]:
        """Extract salary value from job data for filtering"""
        try:
            # Try different salary fields depending on provider
            salary_fields = [
                'salary_min', 'salary_max', 'job_min_salary', 'job_max_salary',
                'salary', 'compensation', 'job_salary'
            ]
            
            for field in salary_fields:
                if field in job and job[field]:
                    salary_value = job[field]
                    if isinstance(salary_value, (int, float)):
                        return float(salary_value)
                    elif isinstance(salary_value, str):
                        # Try to extract number from string
                        import re
                        numbers = re.findall(r'\d+', salary_value.replace(',', ''))
                        if numbers:
                            return float(numbers[0])
            
            return None
            
        except Exception:
            return None

    def _remove_duplicate_jobs(self, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate jobs based on URL and title similarity"""
        seen_urls = set()
        seen_titles = set()
        unique_jobs = []
        
        for job in jobs:
            # Check URL duplicates
            job_url = job.get('url', '').strip().lower()
            if job_url and job_url in seen_urls:
                continue
            
            # Check title duplicates (with same company)
            job_title = job.get('title', '').strip().lower()
            company = job.get('company', '').strip().lower()
            title_company_key = f"{job_title}_{company}"
            
            if title_company_key and title_company_key in seen_titles:
                continue
            
            # Add to unique list
            unique_jobs.append(job)
            if job_url:
                seen_urls.add(job_url)
            if title_company_key:
                seen_titles.add(title_company_key)
        
        return unique_jobs

    def hunt_with_profile(self, profile_id: str, max_jobs: Optional[int] = None) -> Dict[str, Any]:
        """
        🎯 Hunt jobs using a specific search profile
        
        Args:
            profile_id: ID of the profile to use for search
            max_jobs: Override max_jobs from profile settings
            
        Returns:
            Search results with profile information
        """
        try:
            from profile_job_integration import ProfileJobHunter
            
            # Create profile job hunter instance
            profile_hunter = ProfileJobHunter()
            
            # Perform profile-based search
            results = profile_hunter.search_with_profile(profile_id, max_jobs)
            
            # Emit profile search event
            self.emit_json_event('profile_search_completed', {
                'profile_id': profile_id,
                'profile_name': results['profile']['name'],
                'jobs_found': results['search_info']['final_jobs_count'],
                'filters_applied': results['filters_applied']
            })
            
            return results
            
        except ImportError:
            self.emit_json_event('error', {
                'message': 'Profile system not available. Please ensure search_profiles.py and profile_manager.py are present.',
                'type': 'missing_dependency'
            })
            return {'error': 'Profile system not available'}
        except Exception as e:
            self.emit_json_event('error', {
                'message': f'Profile search failed: {str(e)}',
                'type': 'profile_search_error'
            })
            return {'error': str(e)}
    
    def list_available_profiles(self) -> List[Dict[str, Any]]:
        """
        📋 List all available search profiles
        
        Returns:
            List of profile information dictionaries
        """
        try:
            from profile_manager import get_default_manager
            
            manager = get_default_manager()
            profiles = manager.list_profiles(include_templates=True)
            
            self.emit_json_event('profiles_listed', {
                'count': len(profiles),
                'profiles': profiles
            })
            
            return profiles
            
        except ImportError:
            self.emit_json_event('error', {
                'message': 'Profile system not available',
                'type': 'missing_dependency'
            })
            return []
        except Exception as e:
            self.emit_json_event('error', {
                'message': f'Failed to list profiles: {str(e)}',
                'type': 'profile_list_error'
            })
            return []

    def run_manual_preview(self, text_input: str) -> Dict[str, Any]:
        """
        🎯 Manual job processing function - PREVIEW ONLY (no file saving)
        
        Args:
            text_input: Job description text
            
        Returns:
            Dictionary with AI-generated application data for preview
        """
        import re
        import uuid
        from datetime import datetime
        
        try:
            self.emit_json_event('manual_processing_started', {
                'input_type': 'text',
                'input_preview': text_input[:100] + ('...' if len(text_input) > 100 else '')
            })
            
            # 🔍 Step 1: Direct text processing
            job_content = text_input.strip()
            
            # Validate minimum text length
            if len(job_content) < 30:  # 🔧 Reduced minimum length for testing
                self.emit_json_event('error', {
                    'message': 'Job description too short (minimum 30 characters)',
                    'type': 'text_validation_error',
                    'content_length': len(job_content)
                })
                return {'error': 'Job description too short', 'minimum_length': 30}
            
            # 📝 Step 2: Extract basic info from text content
            lines = [line.strip() for line in job_content.split('\n') if line.strip()]
            
            company_name = ""
            job_title = ""
            location = "Deutschland"
            company_address = ""
            
            # 🧠 Intelligente Extraktion für Job-Portal-Texte (Indeed, Stepstone, etc.)
            for line in lines[:20]:  # Check first 20 lines
                line_lower = line.lower()
                
                # Company detection patterns
                if any(word in line_lower for word in ['unternehmen:', 'company:', 'firma:', 'bei ', 'arbeitgeber:']):
                    # Special handling for "bei COMPANY:" pattern
                    if 'bei ' in line_lower and ':' in line:
                        # Extract company name between "bei " and ":"
                        start_idx = line_lower.find('bei ') + 4
                        end_idx = line.find(':', start_idx)
                        if end_idx > start_idx:
                            company_name = line[start_idx:end_idx].strip()
                            logger.info(f"🔍 Company extracted (bei pattern): '{company_name}' from line: '{line}'")
                        else:
                            company_name = line[start_idx:].strip()
                            logger.info(f"🔍 Company extracted (bei fallback): '{company_name}' from line: '{line}'")
                    elif ':' in line:
                        company_name = line.split(':', 1)[-1].strip()
                    else:
                        # Extract company name after "bei"
                        if 'bei ' in line_lower:
                            company_name = line[line_lower.find('bei ') + 4:].strip()
                        else:
                            company_name = line.strip()
                    break
                
                # Look for company indicators (GmbH, AG, etc.)
                elif any(indicator in line_lower for indicator in ['gmbh', ' ag ', ' kg', 'inc.', 'ltd.', 'corp.']):
                    # Skip if line is too long (likely not company name)
                    if len(line) < 80 and not any(skip in line_lower for skip in ['job-match', 'mehr info', 'erschienen', 'gehalt', 'bewerbung']):
                        company_name = line.strip()
                        break
                
                # Job title detection patterns
                elif any(word in line_lower for word in ['position:', 'stelle:', 'job:', 'als ', 'stellentitel:', 'beruf:']):
                    if ':' in line:
                        job_title = line.split(':', 1)[-1].strip()
                    else:
                        # Extract job title after "als"
                        if 'als ' in line_lower:
                            job_title = line[line_lower.find('als ') + 4:].strip()
                        else:
                            job_title = line.strip()
                    break
            
            # 🏢 Extract company address from text
            for line in lines:
                line_lower = line.lower()
                # Look for German address patterns (extended patterns)
                if any(pattern in line_lower for pattern in ['straße', 'str.', 'platz', 'weg', 'gasse', 'allee', 'ufer', 'ring', 'damm', 'berg', 'hof', 'feld']):
                    # Check if it looks like a complete address (contains numbers and city)
                    if any(char.isdigit() for char in line) and len(line) > 10:
                        company_address = line.strip()
                        break
                # Look for PLZ patterns (5-digit postal code + city)
                elif re.match(r'^\d{5}\s+\w+', line.strip()):
                    company_address = line.strip()
                    break
            
            # Fallback job title extraction
            if not job_title:
                # Look for job title patterns in first few lines
                for line in lines[:5]:
                    line_clean = line.strip()
                    if (len(line_clean) > 10 and len(line_clean) < 100 and 
                        any(indicator in line_clean.lower() for indicator in ['(m/w/d)', '(m/w)', 'techniker', 'entwickler', 'manager', 'specialist', 'support', 'engineer', 'developer'])):
                        job_title = line_clean
                        break
            
            # Fallback company name extraction
            if not company_name:
                # Look for company name patterns in first few lines
                for line in lines[:10]:
                    line_clean = line.strip()
                    if (len(line_clean) > 3 and len(line_clean) < 50 and 
                        any(indicator in line_clean.lower() for indicator in ['gmbh', 'ag', 'kg', 'inc', 'ltd', 'corp']) and
                        not any(skip in line_clean.lower() for skip in ['job-match', 'mehr info', 'erschienen', 'gehalt', 'bewerbung'])):
                        company_name = line_clean
                        break
            
            # Set defaults if extraction failed
            if not job_title:
                job_title = "Interessante Position"
            if not company_name:
                company_name = "Unbekanntes Unternehmen"
            
            # 🔍 DEBUG: Log extraction results
            logger.info(f"🔍 Extraction results: company='{company_name}', job_title='{job_title}'")
            logger.info(f"🔍 Processing text: {text_input[:100]}...")
            
            self.emit_json_event('manual_text_processed', {
                'content_length': len(job_content),
                'extracted_title': job_title,
                'extracted_company': company_name,
                'extracted_location': location,
                'extracted_address': company_address
            })
            
            # 📝 Step 3: Generate AI application (NO FILE SAVING)
            job_id = str(uuid.uuid4())
            
            self.emit_json_event('application_generation_started', {
                'job_id': job_id,
                'company': company_name,
                'title': job_title
            })
            
            # Generate application text using AI
            job_data = {
                'title': job_title,
                'company': company_name,
                'location': location,
                'company_address': company_address
            }
            application_text = self.bewerbungshelfer.generate_anschreiben(job_content, job_data=job_data)
            
            if not application_text:
                self.emit_json_event('application_generation_error', {
                    'message': 'Application generation failed'
                })
                return {'error': 'Application generation failed'}
            
            # Prepare filename (but don't save)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"Bewerbung als {job_title.replace('/', '_')}_{timestamp}.txt"
            
            self.emit_json_event('manual_processing_completed', {
                'job_id': job_id,
                'company': company_name,
                'title': job_title,
                'application_length': len(application_text),
                'input_type': 'text',
                'ready_for_review': True
            })
            
            # Return preview data (NO FILE SAVING)
            return {
                'success': True,
                'application': {
                    'job_id': job_id,
                    'job_title': job_title,
                    'company': company_name,
                    'application_text': application_text,
                    'filename': filename,
                    'file_path': None,  # No file saved yet
                    'pdf_path': None,   # No PDF created yet
                    'company_address': company_address,
                    'found_address': company_address,
                    'address_available': bool(company_address)
                },
                'metadata': {
                    'input_type': 'text',
                    'location': location,
                    'timestamp': timestamp,
                    'url': None
                }
            }
            
        except Exception as e:
            self.emit_json_event('application_generation_error', {
                'message': f'Application generation error: {str(e)}'
            })
            return {'error': 'Application generation failed', 'details': str(e)}

    def run_manual(self, text_input: str) -> Dict[str, Any]:
        """
        🎯 Manual job processing function - TEXT-ONLY for reliability
        
        Args:
            text_input: Job description text (URLs no longer supported)
            
        Returns:
            Dictionary with processing results and application data
        """
        import re
        import uuid
        from datetime import datetime
        
        try:
            self.emit_json_event('manual_processing_started', {
                'input_type': 'text',
                'input_preview': text_input[:100] + ('...' if len(text_input) > 100 else '')
            })
            
            # 🔍 Step 1: Direct text processing (URL support removed)
            job_content = text_input.strip()
            
            # Validate minimum text length
            if len(job_content) < 30:  # 🔧 Reduced minimum length for testing
                self.emit_json_event('error', {
                    'message': 'Job description too short (minimum 30 characters)',
                    'type': 'text_validation_error',
                    'content_length': len(job_content)
                })
                return {'error': 'Job description too short', 'minimum_length': 30}
            
            # 📝 Step 2: Extract basic info from text content
            lines = [line.strip() for line in job_content.split('\n') if line.strip()]
            
            company_name = ""
            job_title = ""
            location = ""
            
            # 🧠 Intelligente Extraktion für Job-Portal-Texte (Indeed, Stepstone, etc.)
            
            # Extract company name - look for patterns like "Business4HR GmbH & Co.KG"
            for line in lines[:20]:  # Check first 20 lines
                line_lower = line.lower()
                
                # Company detection patterns
                if any(word in line_lower for word in ['unternehmen:', 'company:', 'firma:', 'bei ', 'arbeitgeber:']):
                    # Special handling for "bei COMPANY:" pattern
                    if 'bei ' in line_lower and ':' in line:
                        # Extract company name between "bei " and ":"
                        start_idx = line_lower.find('bei ') + 4
                        end_idx = line.find(':', start_idx)
                        if end_idx > start_idx:
                            company_name = line[start_idx:end_idx].strip()
                            logger.info(f"🔍 Company extracted (bei pattern): '{company_name}' from line: '{line}'")
                        else:
                            company_name = line[start_idx:].strip()
                            logger.info(f"🔍 Company extracted (bei fallback): '{company_name}' from line: '{line}'")
                    elif ':' in line:
                        company_name = line.split(':', 1)[-1].strip()
                    else:
                        # Extract company name after "bei"
                        if 'bei ' in line_lower:
                            company_name = line[line_lower.find('bei ') + 4:].strip()
                        else:
                            company_name = line.strip()
                    break
                
                # Look for company indicators (GmbH, AG, etc.)
                elif any(indicator in line_lower for indicator in ['gmbh', ' ag ', ' kg', 'inc.', 'ltd.', 'corp.']):
                    # Skip if line is too long (likely not company name)
                    if len(line) < 80 and not any(skip in line_lower for skip in ['job-match', 'mehr info', 'erschienen', 'gehalt', 'bewerbung']):
                        company_name = line.strip()
                        break
                
                # Job title detection patterns
                elif any(word in line_lower for word in ['position:', 'stelle:', 'job:', 'als ', 'stellentitel:', 'beruf:']):
                    if ':' in line:
                        job_title = line.split(':', 1)[-1].strip()
                    else:
                        # Extract job title after "als"
                        if 'als ' in line_lower:
                            job_title = line[line_lower.find('als ') + 4:].strip()
                        else:
                            job_title = line.strip()
                    break
                
                # Location detection patterns
                elif any(word in line_lower for word in ['standort:', 'ort:', 'location:', 'arbeitsort:']):
                    if ':' in line:
                        location = line.split(':', 1)[-1].strip()
                    else:
                        location = line.strip()
            
            # 🏢 Extract company address from text
            company_address = ""
            for line in lines:
                line_lower = line.lower()
                # Look for German address patterns (extended patterns)
                if any(pattern in line_lower for pattern in ['straße', 'str.', 'platz', 'weg', 'gasse', 'allee', 'ufer', 'ring', 'damm', 'berg', 'hof', 'feld']):
                    # Check if it looks like a complete address (contains numbers and city)
                    if any(char.isdigit() for char in line) and len(line) > 10:
                        company_address = line.strip()
                        break
                # Look for PLZ patterns (5-digit postal code + city)
                elif re.match(r'^\d{5}\s+\w+', line.strip()):
                    company_address = line.strip()
                    break
                # Look for explicit address patterns
                elif any(pattern in line_lower for pattern in ['adresse:', 'anschrift:', 'standort:', 'unser standort:', 'address:']):
                    # Try to extract address from the next few lines
                    current_idx = lines.index(line)
                    for next_line in lines[current_idx:current_idx+3]:
                        if any(char.isdigit() for char in next_line) and len(next_line) > 10:
                            # Check if it contains street indicators or PLZ
                            if any(pattern in next_line.lower() for pattern in ['straße', 'str.', 'platz', 'weg', 'gasse', 'allee', 'ufer', 'ring', 'damm']) or re.match(r'.*\d{5}\s+\w+', next_line):
                                company_address = next_line.strip()
                                break
                    if company_address:
                        break
            
            # Smart fallbacks - try to extract from first meaningful lines
            if not company_name:
                # Look for company patterns in first few lines
                for line in lines[:5]:
                    if len(line) > 5 and len(line) < 100:
                        if any(indicator in line.lower() for indicator in ['gmbh', 'ag', 'kg', 'inc', 'ltd', 'corp']):
                            company_name = line.strip()
                            break
                
                if not company_name:
                    company_name = "Unbekanntes Unternehmen"
            
            if not job_title:
                # Look for job title patterns in first few lines
                for line in lines[:10]:
                    line_clean = line.strip()
                    if len(line_clean) > 5 and len(line_clean) < 80:
                        # Skip lines that are clearly not job titles
                        if not any(skip in line_clean.lower() for skip in ['wir suchen', 'stellenausschreibung', 'bewerbung', 'jobbeschreibung', 'logo', 'standort:', 'abteilung:', 'die ', 'unser']):
                            # Look for job title patterns
                            if any(pattern in line_clean.lower() for pattern in ['administrator', 'manager', 'entwickler', 'developer', 'specialist', 'engineer', 'analyst', 'coordinator', 'assistant', 'support', 'consultant', 'director', 'lead', 'senior', 'junior', '(m/w/d)', '(w/m/d)', '(m/w/x)', '(w/m/x)']):
                                job_title = line_clean.replace('logo', '').strip()
                                break
                        # If it's the second line after company name, it's likely the job title
                        elif lines.index(line) == 1 and company_name:
                            job_title = line_clean.replace('logo', '').strip()
                            break
                
                if not job_title:
                    job_title = "Interessante Position"
            
            if not location:
                location = "Deutschland"
            
            # Clean extracted data
            company_name = company_name.replace('Unternehmen:', '').replace('Company:', '').replace('logo', '').strip()
            job_title = job_title.replace('Position:', '').replace('Stelle:', '').replace('logo', '').strip()
            location = location.replace('Standort:', '').replace('Ort:', '').strip()
            
            self.emit_json_event('manual_text_processed', {
                'content_length': len(job_content),
                'extracted_title': job_title,
                'extracted_company': company_name,
                'extracted_location': location,
                'extracted_address': company_address
            })
            
            # 🏗️ Step 3: Create job object structure similar to normal search results
            job_data = {
                'job_id': str(uuid.uuid4()),
                'title': job_title,
                'company': company_name,
                'location': location,
                'url': 'manual_input',
                'description': job_content,
                'platform': 'Manual Input',
                'created': datetime.now().isoformat(),
                'manual_input': True,
                'input_type': 'text',
                'content_length': len(job_content)
            }
            
            # 🤖 Step 4: Generate application using existing LLM functionality
            # This uses TurboBewerbungsHelfer which automatically includes Career Profile!
            self.emit_json_event('application_generation_started', {
                'job_id': job_data['job_id'],
                'company': company_name,
                'title': job_title
            })
            
            try:
                # Use existing application generation logic (includes Career Profile)
                application_text = self.generate_application(job_data)
                
                if not application_text:
                    self.emit_json_event('error', {
                        'message': 'Failed to generate application letter',
                        'type': 'application_generation_error'
                    })
                    return {'error': 'Application generation failed'}
                
            except Exception as e:
                self.emit_json_event('error', {
                    'message': f'Application generation error: {str(e)}',
                    'type': 'application_generation_error'
                })
                return {'error': 'Application generation failed', 'details': str(e)}
            
            # 📄 Step 5: Prepare application for review and approval
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Clean filename
            from job_utils import clean_job_title_string, clean_company_name_string
            position_clean = clean_job_title_string(job_title)
            company_clean = clean_company_name_string(company_name)
            
            # 📁 Create application folder structure (like normal job processing)
            from pathlib import Path
            folder_name = company_clean if company_clean else f"ManualJob_{timestamp}"
            folder_path = Path("applications") / f"{folder_name}_{datetime.now().strftime('%Y-%m-%d')}"
            folder_path.mkdir(parents=True, exist_ok=True)
            
            # File paths - sanitize filename for filesystem compatibility
            from job_utils import clean_filename_string
            position_safe = clean_filename_string(position_clean)  # Use proper sanitization function
            txt_file = folder_path / f"Bewerbung als {position_safe}_{timestamp}.txt"
            pdf_file = folder_path / f"Bewerbung als {position_safe}_{timestamp}.pdf"
            
            # Save application text immediately with proper DIN 5008 address formatting
            print(f"🔧 MANUAL JOB DEBUG: Creating TXT file with address formatting")
            print(f"🔧 MANUAL JOB DEBUG: company_address = '{company_address}'")
            
            # Apply DIN 5008 address formatting if company address is available
            formatted_application_text = application_text
            if company_address and company_address.strip():
                print(f"🔧 MANUAL JOB DEBUG: Applying address formatting to manual job TXT")
                
                # Parse the address for proper DIN 5008 formatting
                import re
                street = ''
                postal_code = ''
                city = ''
                
                address_line = company_address.strip()
                
                # FORMAT 1: "Street, PLZ City" (with comma)
                if ',' in address_line:
                    parts = [part.strip() for part in address_line.split(',')]
                    if len(parts) >= 2:
                        street = parts[0].strip()
                        remaining = parts[1].strip()
                        # Extract PLZ and city from remaining part
                        plz_city_match = re.match(r'(\d{4,5})\s+(.+)', remaining)
                        if plz_city_match:
                            postal_code = plz_city_match.group(1)
                            city = plz_city_match.group(2).strip()
                            print(f"🔧 MANUAL JOB DEBUG: Comma format - Street: '{street}', PLZ: '{postal_code}', City: '{city}'")
                
                # FORMAT 2: "Street HouseNumber PLZ City" (without comma)
                if not street and not city:
                    parts = address_line.split()
                    plz_index = None
                    for i, part in enumerate(parts):
                        if re.match(r'^\d{4,5}$', part):
                            plz_index = i
                            break
                    
                    if plz_index is not None and plz_index > 0:
                        street = ' '.join(parts[:plz_index])
                        postal_code = parts[plz_index]
                        city = ' '.join(parts[plz_index + 1:]) if plz_index + 1 < len(parts) else ''
                        print(f"🔧 MANUAL JOB DEBUG: No-comma format - Street: '{street}', PLZ: '{postal_code}', City: '{city}'")
                
                # Apply DIN 5008 formatting if we successfully parsed the address
                if street and (city or postal_code):
                    if postal_code and city:
                        din5008_address = f"{street}\n{postal_code} {city}"
                    elif city:
                        din5008_address = f"{street}\n{city}"
                    else:
                        din5008_address = f"{street}\n{postal_code}"
                    
                    # Replace the single-line address with DIN 5008 format
                    formatted_application_text = application_text.replace(address_line, din5008_address)
                    print(f"🔧 MANUAL JOB DEBUG: Replaced '{address_line}' with DIN 5008 format")
                else:
                    print(f"🔧 MANUAL JOB DEBUG: Could not parse address '{address_line}', using original")
            
            with open(txt_file, 'w', encoding='utf-8') as f:
                f.write(formatted_application_text)
            
            application_data = {
                'job_id': job_data['job_id'],
                'job_data': job_data,
                'application_text': application_text,
                'company': company_name,
                'company_name': company_name,  # 🔧 DUPLICATE for API compatibility
                'job_title': job_title,
                'location': location,
                'company_address': company_address,
                'filename': f"Bewerbung als {position_safe}_{timestamp}.txt",
                'pdf_path': str(pdf_file) if pdf_file.exists() else None,
                'file_path': str(txt_file),
                'folder_path': str(folder_path),
                'manual_input': True,
                'input_type': 'text',
                'ready_for_approval': True
            }
            
            # 📁 Save application data to temp file for finalization endpoint
            import json
            temp_file = Path(f"/tmp/manual_job_{job_data['job_id']}.json")
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(application_data, f, ensure_ascii=False, indent=2)
            
            self.emit_json_event('manual_processing_completed', {
                'job_id': job_data['job_id'],
                'company': company_name,
                'title': job_title,
                'application_length': len(application_text),
                'input_type': 'text',
                'ready_for_review': True
            })
            
            return {
                'success': True,
                'application': application_data,
                'message': 'Application draft successfully generated',
                'metadata': {
                    'input_type': 'text',
                    'timestamp': timestamp,
                    'location': location
                }
            }
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Manual processing failed: {str(e)}")
            logger.error(f"Full traceback: {error_details}")
            self.emit_json_event('error', {
                'message': f'Manual processing failed: {str(e)}',
                'type': 'manual_processing_error'
            })
            return {'error': 'Manual processing failed', 'details': str(e), 'traceback': error_details}
    
    def check_cancellation(self) -> bool:
        """Check if process should be cancelled (call this periodically in long operations)"""
        if self.cancel_event.is_set():
            print("🛑 Process cancellation detected - stopping gracefully...")
            return True
        return False


def main():
    parser = argparse.ArgumentParser(description='🚀 Ultimate Job Hunter v3.0')
    parser.add_argument('--max-jobs', type=int, default=15, help='Maximum number of jobs to process')
    parser.add_argument('--auto-process', type=int, default=0, help='Auto-process top N jobs without confirmation')
    parser.add_argument('--json-output', action='store_true', help='Enable JSON output for GUI integration')
    parser.add_argument('--interactive', action='store_true', help='🎯 Enable interactive mode with user selection')
    parser.add_argument('--keywords', type=str, default='', help='Komma-getrennte Suchbegriffe für Interactive Mode')
    parser.add_argument('--location', type=str, help='Location filter for job search')
    parser.add_argument('--remote', action='store_true', help='Include remote jobs')
    parser.add_argument('--skip-stepstone', action='store_true', help='Stepstone Scraper deaktivieren')
    parser.add_argument('--job-age-days', type=int, default=30, help='Maximum age of jobs in days (default: 30)')
    parser.add_argument('--profile', type=str, help='🎯 Use specific search profile ID for job hunting')
    parser.add_argument('--list-profiles', action='store_true', help='📋 List all available search profiles')
    parser.add_argument('--automated', action='store_true', help='🤖 Fully automated mode - no user interaction required')
    parser.add_argument('--no-interaction', action='store_true', help='🔄 Skip all user prompts and confirmations')
    parser.add_argument('--auto-address', action='store_true', help='📍 Automatically use best guess for missing addresses')
    
    args = parser.parse_args()
    
    try:
        # Skip Stepstone für alle Modi
        skip_stepstone = True  # IMMER Stepstone deaktivieren
        hunter = UltimateJobHunter(skip_stepstone=(skip_stepstone or args.skip_stepstone), json_output=args.json_output)
        
        # 🎯 Wähle den richtigen Modus
        if args.list_profiles:
            # List available profiles
            profiles = hunter.list_available_profiles()
            if profiles:
                print(f"\n📋 Available Search Profiles ({len(profiles)}):")
                for profile in profiles:
                    status = "📁 Template" if profile.get('is_template', False) else "🎯 Active"
                    print(f"   • {profile['id']} - {profile['name']} ({status})")
                    if profile.get('description'):
                        print(f"     {profile['description']}")
            else:
                print("📋 No search profiles found. Create some profiles first!")
        elif args.automated or args.no_interaction:
            # 🤖 Fully automated mode - no user interaction
            print("🤖 Starting fully automated job search...")
            hunter.automated_mode = True
            hunter.auto_address = args.auto_address
            
            if args.profile:
                print(f"🎯 Using profile: {args.profile}")
                results = hunter.hunt_with_profile_automated(args.profile, args.max_jobs)
            else:
                # Use default automated search
                results = hunter.hunt_ultimate_automated(args.max_jobs, keywords=args.keywords if args.keywords else None)
            
            print(f"✅ Automated search completed: {results}")
        elif args.profile:
            # Use specific profile for search
            print(f"🎯 Searching with profile: {args.profile}")
            results = hunter.hunt_with_profile(args.profile, args.max_jobs)
            if 'error' not in results:
                jobs = results.get('jobs', [])
                print(f"✅ Found {len(jobs)} jobs using profile '{results['profile']['name']}'")
                # If in interactive mode, could show job selection here
                # For now, just display summary
                if jobs:
                    print("\n🏆 Top 3 Results:")
                    for i, job in enumerate(jobs[:3], 1):
                        score = job.get('profile_relevance_score', 0)
                        print(f"   {i}. {job['title']} at {job['company']} (Score: {score:.2f})")
            else:
                print(f"❌ Profile search failed: {results['error']}")
        elif args.interactive:
            hunter.hunt_interactive(keyword_str=args.keywords, max_jobs=args.max_jobs, max_age_days=args.job_age_days, location=args.location, include_remote=args.remote)
        else:
            hunter.hunt_ultimate(args.max_jobs, args.auto_process, keywords=args.keywords if args.keywords else None)
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Programm wurde vom Benutzer gestoppt")
    except Exception as e:
        print(f"\n❌ Unerwarteter Fehler: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()