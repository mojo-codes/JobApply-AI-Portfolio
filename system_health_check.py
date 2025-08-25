#!/usr/bin/env python3
"""
🏥 System Health Check - Automatische Diagnose aller Features
Läuft automatisch und zeigt sofort was funktioniert und was kaputt ist
"""

import requests
import json
import os
from datetime import datetime

def check_service(name, url, timeout=3):
    """Check if a service is running and healthy"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            return {"status": "✅ OK", "details": "Service läuft normal"}
        else:
            return {"status": "⚠️ Problem", "details": f"HTTP {response.status_code}"}
    except requests.exceptions.ConnectionError:
        return {"status": "❌ Offline", "details": "Service nicht erreichbar"}
    except Exception as e:
        return {"status": "❌ Fehler", "details": str(e)}

def check_file_exists(name, filepath):
    """Check if important files exist"""
    if os.path.exists(filepath):
        return {"status": "✅ OK", "details": f"Datei vorhanden"}
    else:
        return {"status": "❌ Fehlt", "details": f"Datei nicht gefunden: {filepath}"}

def check_api_functionality():
    """Test core API functions"""
    results = {}
    
    # Test personal data loading (das Problem was gerade war)
    try:
        response = requests.get("http://localhost:5001/api/settings/personal", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                results["personal_data"] = {"status": "✅ OK", "details": "Persönliche Daten laden funktioniert"}
            else:
                results["personal_data"] = {"status": "⚠️ Problem", "details": "API antwortet aber Daten fehlerhaft"}
        else:
            results["personal_data"] = {"status": "❌ Fehler", "details": f"HTTP {response.status_code}"}
    except Exception as e:
        results["personal_data"] = {"status": "❌ Offline", "details": "Personal Data API nicht erreichbar"}
    
    # Test career profile creation (das andere Problem)
    try:
        test_profile = {
            "profile_name": "Health_Check_Test", 
            "description": "Test", 
            "skills": [], 
            "experiences": []
        }
        response = requests.post("http://localhost:5001/api/career-profiles", 
                               json=test_profile, timeout=5)
        if response.status_code == 201:
            # Clean up test profile immediately
            requests.delete(f"http://localhost:5001/api/career-profiles/Health_Check_Test")
            results["career_profile_save"] = {"status": "✅ OK", "details": "Career Profile speichern funktioniert"}
        else:
            results["career_profile_save"] = {"status": "❌ Fehler", "details": f"Speichern fehlgeschlagen: HTTP {response.status_code}"}
    except Exception as e:
        results["career_profile_save"] = {"status": "❌ Offline", "details": "Career Profile API nicht erreichbar"}
    
    return results

def run_full_health_check():
    """Run complete system health check"""
    print("🏥 SYSTEM HEALTH CHECK - Automatische Diagnose")
    print("=" * 50)
    print(f"⏰ Zeitpunkt: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check all services
    services = {
        "Profile API": "http://localhost:5001/api/health",
        "Career Profile API": "http://localhost:5003/health",
        "Job API": "http://localhost:5002/api/health", 
        "Draft API": "http://localhost:8000/docs"  # FastAPI docs endpoint
    }
    
    print("🔌 SERVICE STATUS:")
    all_services_ok = True
    for name, url in services.items():
        result = check_service(name, url)
        print(f"  {name:15} {result['status']} - {result['details']}")
        if "❌" in result['status']:
            all_services_ok = False
    
    print()
    
    # Check important files
    files = {
        "Global Settings": "global_settings.yaml",
        "Job Cache": "processed_jobs.json", 
        "Draft Database": "drafts.db",
        "CLAUDE Instructions": "CLAUDE.md"
    }
    
    print("📁 WICHTIGE DATEIEN:")
    for name, filepath in files.items():
        result = check_file_exists(name, filepath)
        print(f"  {name:15} {result['status']} - {result['details']}")
    
    print()
    
    # Test core functionality
    print("🧪 FEATURE TESTS:")
    api_results = check_api_functionality()
    
    critical_issues = []
    for feature, result in api_results.items():
        print(f"  {feature:15} {result['status']} - {result['details']}")
        if "❌" in result['status']:
            critical_issues.append(feature)
    
    print()
    print("📊 ZUSAMMENFASSUNG:")
    
    if not critical_issues and all_services_ok:
        print("🎉 SYSTEM GESUND - Alle Features funktionieren normal!")
        return True
    else:
        print("⚠️ PROBLEME GEFUNDEN:")
        if not all_services_ok:
            print("  - Ein oder mehrere Services sind offline")
        for issue in critical_issues:
            print(f"  - {issue} funktioniert nicht korrekt")
        
        print()
        print("💡 NÄCHSTE SCHRITTE:")
        print("  1. Services starten die offline sind")
        print("  2. Fehlende API Endpunkte implementieren") 
        print("  3. Datenbank/Dateien überprüfen")
        
        return False

if __name__ == "__main__":
    run_full_health_check()