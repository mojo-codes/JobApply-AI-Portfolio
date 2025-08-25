"""draft_api.py – FastAPI application exposing Draft storage endpoints.

Run locally:
    uvicorn draft_api:app --reload --port 8000

Endpoints:
    GET    /drafts               → list drafts
    GET    /drafts/{id}          → get single draft
    POST   /drafts               → create draft (company, title, letter_text)
    PUT    /drafts/{id}          → update fields
    DELETE /drafts/{id}          → delete draft
    POST   /drafts/export        → export selected drafts to PDF
"""

from __future__ import annotations

import os
import tempfile
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from draft_storage import (
    create_draft, get_draft, list_drafts, update_draft, delete_draft
)

# Global variables to store communication data
job_selection_data = None
application_approval_data = None

app = FastAPI(title="Bewerbungshelfer Draft API", version="0.1.0")

# Add CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "http://127.0.0.1:1420"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DraftIn(BaseModel):
    company: str = Field(..., example="ACME GmbH")
    title: str = Field(..., example="Marketing Manager")
    letter_text: str = Field(..., example="Sehr geehrte …")


class DraftUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    letter_text: Optional[str] = None


class ExportRequest(BaseModel):
    ids: List[int]
    export_path: Optional[str] = None
    custom_filename: Optional[str] = None  # Custom filename for single exports
    custom_addresses: Optional[Dict[int, Dict[str, Any]]] = None  # draft_id -> editableData
    custom_letter_text: Optional[Dict[int, str]] = None  # draft_id -> edited letter text

class JobSelectionRequest(BaseModel):
    type: str = Field(..., example="job_selection")
    selected_job_ids: List[int] = Field(..., example=[1, 2, 3])

class ApplicationApprovalRequest(BaseModel):
    type: str = Field(..., example="application_approval")
    approved_applications: List[Dict[str, Any]] = Field(..., example=[{"job_id": 1, "application_text": "..."}])


def generate_pdf_from_draft(draft_data: Dict[str, Any], output_path: str, custom_addresses: Optional[Dict[str, Any]] = None, custom_letter_text: Optional[str] = None) -> bool:
    """Generate PDF from draft data using existing PDF generation logic."""
    try:
        # Import the existing PDF generation class
        from booster_turbo import TurboBewerbungsHelfer
        
        # Create instance of the PDF generator
        turbo = TurboBewerbungsHelfer()
        
        # Prepare user-provided addresses if available
        user_sender_address = None
        user_company_address = None
        
        if custom_addresses:
            print(f"📄 PDF Export: Using custom addresses for draft {draft_data.get('id', 'unknown')}")
            
            # Format personal data for PDF system
            if custom_addresses.get('personalData'):
                personal = custom_addresses['personalData']
                user_sender_address = f"{personal.get('name', '')}\n{personal.get('street', '')}\n{personal.get('city', '')}\n{personal.get('phone', '')}\n{personal.get('email', '')}"
                print(f"📍 Custom sender address: {user_sender_address[:50]}...")
            
            # Format company address for PDF system  
            if custom_addresses.get('companyAddress'):
                company_addr = custom_addresses['companyAddress']
                print(f"🔍 DEBUG: Received company address: '{company_addr}'")
                
                # 🔧 FIX: Ignore placeholder text - trigger automatic resolution instead
                # Enhanced detection for various placeholder patterns
                placeholder_patterns = [
                    '[Adresse wird wie beim PDF-Export ermittelt]',
                    'Adresse wird wie beim PDF-Export ermittelt',
                    'Klicken zum Bearbeiten',
                    'wird automatisch ermittelt',
                    'Bei PDF-Export'
                ]
                
                is_placeholder = any(pattern in company_addr for pattern in placeholder_patterns)
                
                if is_placeholder:
                    print(f"🔧 Detected placeholder text - using automatic address resolution")
                    user_company_address = None  # Trigger automatic resolution
                else:
                    user_company_address = company_addr
                    print(f"🏢 Custom company address: {user_company_address[:50]}...")
        else:
            print(f"📄 PDF Export: Using automatic address detection for draft {draft_data.get('id', 'unknown')}")
        
        # Get custom date if provided
        user_custom_date = None
        if custom_addresses and custom_addresses.get('currentDate'):
            user_custom_date = custom_addresses['currentDate']
            print(f"📅 Custom date: {user_custom_date}")
        
        # Create job_data structure for PDF generation
        job_data = {
            'company': draft_data['company'],
            'title': draft_data['job_title'],
            'user_sender_address': user_sender_address,  # Use custom or None for default
            'user_company_address': user_company_address,  # Use custom or None for automatic
            'user_custom_date': user_custom_date,  # Use custom date or None for auto
            'address_info': None,  # Let it auto-detect if no custom addresses
            'draft_export_mode': True  # Flag to indicate this is a draft export (no auto-additions)
        }
        
        # Use custom letter text if provided, otherwise use draft letter text
        letter_text_to_use = custom_letter_text if custom_letter_text else draft_data['letter_text']
        print(f"📝 Using letter text: {'custom edited' if custom_letter_text else 'from database'}")
        
        # Generate PDF using existing function
        success = turbo.create_professional_pdf(
            anschreiben_text=letter_text_to_use,
            output_file=output_path,
            job_description=f"Position: {draft_data['job_title']} bei {draft_data['company']}",
            job_data=job_data
        )
        
        return success
        
    except Exception as e:
        print(f"PDF generation error: {e}")
        return False


@app.get("/drafts")
def api_list_drafts(limit: int = 1000, offset: int = 0):
    """List drafts with higher default limit and newest-first sorting"""
    return list_drafts(limit=limit, offset=offset)


@app.get("/drafts/{draft_id}")
def api_get_draft(draft_id: int):
    draft = get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@app.post("/drafts", status_code=201)
def api_create_draft(payload: DraftIn):
    return create_draft({"company": payload.company, "title": payload.title}, payload.letter_text)


@app.put("/drafts/{draft_id}")
def api_update_draft(draft_id: int, payload: DraftUpdate):
    ok = update_draft(draft_id,
                      company=payload.company,
                      job_title=payload.title,  # payload.title maps to job_title in storage
                      letter_text=payload.letter_text)
    if not ok:
        raise HTTPException(status_code=404, detail="Draft not found or no fields updated")
    return {"success": True}


@app.delete("/drafts/{draft_id}")
def api_delete_draft(draft_id: int):
    ok = delete_draft(draft_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"success": True}


@app.post("/drafts/export")
def api_export_drafts(req: ExportRequest):
    """Export selected drafts to PDF files."""
    if not req.ids:
        return {"status": "error", "message": "No draft IDs provided"}
    
    exported_files = []
    errors = []
    
    # Create export directory with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Use custom export path if provided, otherwise use default
    if req.export_path:
        export_dir = req.export_path
        # Create directory if it doesn't exist
        try:
            os.makedirs(export_dir, exist_ok=True)
        except Exception as e:
            return {"status": "error", "message": f"Konnte Export-Pfad nicht erstellen: {str(e)}"}
    else:
        export_dir = f"applications/Draft_Export_{timestamp}"
        os.makedirs(export_dir, exist_ok=True)
    
    for draft_id in req.ids:
        try:
            # Get draft data
            draft = get_draft(draft_id)
            if not draft:
                errors.append(f"Draft {draft_id} not found")
                continue
            
            # Generate filename - use custom filename if provided and single export
            if req.custom_filename and len(req.ids) == 1:
                # Use custom filename, ensure .pdf extension
                filename = req.custom_filename if req.custom_filename.endswith('.pdf') else f"{req.custom_filename}.pdf"
                print(f"📝 Using custom filename: {filename}")
            else:
                # Generate automatic filename
                safe_company = "".join(c for c in draft['company'] if c.isalnum() or c in (' ', '-', '_')).strip()
                safe_title = "".join(c for c in draft['job_title'] if c.isalnum() or c in (' ', '-', '_')).strip()
                filename = f"Bewerbung_{safe_company}_{safe_title}_{timestamp}.pdf"
                print(f"📝 Using auto-generated filename: {filename}")
            
            output_path = os.path.join(export_dir, filename)
            
            # Get custom addresses for this draft if provided
            custom_addresses = None
            if req.custom_addresses:
                # Try both integer and string keys (frontend might send strings)
                if draft_id in req.custom_addresses:
                    custom_addresses = req.custom_addresses[draft_id]
                    print(f"🎯 Using custom addresses for draft {draft_id} (int key): {custom_addresses}")
                elif str(draft_id) in req.custom_addresses:
                    custom_addresses = req.custom_addresses[str(draft_id)]
                    print(f"🎯 Using custom addresses for draft {draft_id} (str key): {custom_addresses}")
                else:
                    print(f"❌ No custom addresses found for draft {draft_id}")
                    print(f"   Available custom_addresses keys: {list(req.custom_addresses.keys())}")
            else:
                print(f"❌ No custom_addresses in request at all")
            
            # Get custom letter text for this draft if provided
            custom_letter_text = None
            if req.custom_letter_text:
                # Try both integer and string keys (frontend might send strings)
                if draft_id in req.custom_letter_text:
                    custom_letter_text = req.custom_letter_text[draft_id]
                    print(f"📝 Using custom letter text for draft {draft_id} (int key): {custom_letter_text[:100]}...")
                elif str(draft_id) in req.custom_letter_text:
                    custom_letter_text = req.custom_letter_text[str(draft_id)]
                    print(f"📝 Using custom letter text for draft {draft_id} (str key): {custom_letter_text[:100]}...")
                else:
                    print(f"❌ No custom letter text found for draft {draft_id}")
            else:
                print(f"❌ No custom_letter_text in request at all")
            
            # Generate PDF
            success = generate_pdf_from_draft(draft, output_path, custom_addresses, custom_letter_text)
            
            if success and os.path.exists(output_path):
                exported_files.append({
                    "draft_id": draft_id,
                    "filename": filename,
                    "path": output_path
                })
                
                # 🔧 FIX: Only create Applications copy if user didn't already choose Applications folder
                try:
                    # Check if user already exported to applications folder
                    export_dir_norm = os.path.normpath(export_dir).lower()
                    is_already_in_applications = 'applications' in export_dir_norm
                    
                    if not is_already_in_applications:
                        print(f"📂 Creating additional copy in Applications folder (user chose: {export_dir})")
                        # Create company-specific applications folder
                        company_clean = "".join(c for c in draft['company'] if c.isalnum() or c in (' ', '-', '_')).strip()[:40] or "Company"
                        date_str = datetime.now().strftime("%Y-%m-%d")
                        apps_dir = f"applications/{company_clean}_{date_str}"
                        os.makedirs(apps_dir, exist_ok=True)
                        
                        # Copy PDF to applications folder
                        apps_pdf_path = os.path.join(apps_dir, filename)
                        import shutil
                        shutil.copy2(output_path, apps_pdf_path)
                        
                        # Also create TXT version in applications folder (for consistency)
                        txt_filename = filename.replace('.pdf', '.txt')
                        apps_txt_path = os.path.join(apps_dir, txt_filename)
                        with open(apps_txt_path, 'w', encoding='utf-8') as f:
                            letter_text = custom_letter_text if custom_letter_text else draft['letter_text']
                            f.write(letter_text)
                        
                        print(f"📂 Additional copy created in applications folder: {apps_dir}")
                    else:
                        print(f"✅ User already chose Applications folder - skipping duplicate copy")
                    
                except Exception as e:
                    print(f"⚠️  Warning: Could not create applications folder copy: {e}")
                    # Don't fail the export if applications folder creation fails
                    
            else:
                errors.append(f"Failed to generate PDF for draft {draft_id}")
                
        except Exception as e:
            errors.append(f"Error processing draft {draft_id}: {str(e)}")
    
    # Return results
    result = {
        "status": "success" if exported_files else "error",
        "exported_count": len(exported_files),
        "files": exported_files,
        "export_directory": export_dir
    }
    
    if errors:
        result["errors"] = errors
    
    return result


@app.post("/job-selection")
def api_job_selection(req: JobSelectionRequest):
    """Receive job selection from frontend and store it for the Python process."""
    global job_selection_data
    
    job_selection_data = {
        "type": req.type,
        "selected_job_ids": req.selected_job_ids,
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"📡 Received job selection via HTTP: {req.selected_job_ids}")
    
    return {"status": "success", "message": f"Job selection received: {len(req.selected_job_ids)} jobs"}


@app.get("/job-selection")
def api_get_job_selection():
    """Get stored job selection data for the Python process."""
    global job_selection_data
    
    if job_selection_data:
        # Return and clear the data (one-time use)
        data = job_selection_data
        job_selection_data = None
        return data
    else:
        raise HTTPException(status_code=404, detail="No job selection data available")


@app.post("/application-approval")
def api_application_approval(req: ApplicationApprovalRequest):
    """Receive application approval from frontend and store it for the Python process."""
    global application_approval_data
    
    application_approval_data = {
        "type": req.type,
        "approved_applications": req.approved_applications,
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"📡 Received application approval via HTTP: {len(req.approved_applications)} applications")
    
    return {"status": "success", "message": f"Application approval received: {len(req.approved_applications)} applications"}


@app.get("/application-approval")
def api_get_application_approval():
    """Get stored application approval data for the Python process."""
    global application_approval_data
    
    if application_approval_data:
        # Return and clear the data (one-time use)
        data = application_approval_data
        application_approval_data = None
        return data
    else:
        raise HTTPException(status_code=404, detail="No application approval data available")


@app.post("/debug-log")
def api_debug_log(data: dict):
    """Debug endpoint to log frontend data."""
    import json
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n=== DEBUG LOG {timestamp} ===")
    print(f"Message: {data.get('message', 'No message')}")
    print(f"Data: {json.dumps(data.get('data', {}), indent=2)}")
    print(f"Draft ID: {data.get('draftId', 'No ID')}")
    print("=" * 50)
    return {"status": "logged"}


@app.post("/drafts/application-status")
def api_get_application_status(data: dict):
    """Check application status for multiple jobs by company + job title matching"""
    try:
        jobs = data.get('jobs', [])
        
        if not jobs:
            return {"success": False, "error": "jobs array is required"}
        
        # Get all existing drafts
        drafts = list_drafts(limit=1000)  # Get up to 1000 drafts for matching
        
        # Create mapping of job_id -> application status
        application_status = {}
        
        for job in jobs:
            job_id = str(job.get('id', ''))
            company = job.get('company', '').strip()
            title = job.get('title', '').strip()
            
            # Look for matching applications by company + job title (fuzzy matching)
            has_application = False
            application_date = None
            draft_id = None
            
            for draft in drafts:
                draft_company = draft.get('company', '').strip()
                draft_title = draft.get('job_title', '').strip()
                
                # Simple fuzzy matching (case-insensitive, partial match)
                company_match = company.lower() in draft_company.lower() or draft_company.lower() in company.lower()
                title_match = any(word.lower() in draft_title.lower() for word in title.split() if len(word) > 3)
                
                if company_match and title_match:
                    has_application = True
                    application_date = draft.get('created_at')
                    draft_id = draft.get('id')
                    break
            
            application_status[job_id] = {
                'has_application': has_application,
                'application_date': application_date,
                'draft_id': draft_id,
                'company': company,
                'title': title
            }
        
        return {
            'success': True,
            'application_status': application_status,
            'total_jobs': len(jobs),
            'total_applications': sum(1 for status in application_status.values() if status['has_application'])
        }
        
    except Exception as e:
        print(f"Error checking application status: {e}")
        return {"success": False, "error": str(e)}


@app.post("/manual-job-finalization")
def api_manual_job_finalization(data: dict):
    """Handle manual job finalization - create PDF from approved applications"""
    try:
        approved_applications = data.get('approved_applications', [])
        
        if not approved_applications:
            return {"success": False, "error": "No approved applications provided"}
        
        # Simplified approach: Call the job API to trigger PDF creation
        import requests
        from pathlib import Path
        import json
        
        processed_applications = []
        
        for app_data in approved_applications:
            job_id = app_data.get('job_id')
            application_text = app_data.get('application_text', '')
            company_address = app_data.get('company_address', '')
            
            if not job_id or not application_text:
                continue
            
            # Look for existing application data in temp storage
            temp_file = Path(f"/tmp/manual_job_{job_id}.json")
            if temp_file.exists():
                with open(temp_file, 'r', encoding='utf-8') as f:
                    job_data = json.load(f)
                
                # Update job data with user-provided address
                if company_address and company_address.strip():
                    job_data['user_company_address'] = company_address.strip()
                
                # Update application text if modified
                if application_text != job_data.get('application_text', ''):
                    job_data['application_text'] = application_text
                
                # Create PDF by calling job API finalize endpoint
                try:
                    finalize_response = requests.post('http://localhost:5002/api/finalize-manual-job', 
                        json={
                            'job_id': job_id,
                            'application_text': application_text,
                            'company_address': company_address
                        }, 
                        timeout=30
                    )
                    
                    if finalize_response.status_code == 200:
                        result = finalize_response.json()
                        if result.get('success'):
                            # Create draft for future editing
                            job_info = {
                                'company': job_data.get('company', 'Unknown Company'),
                                'title': job_data.get('job_title', 'Unknown Position')
                            }
                            create_draft(job_info, application_text)
                            
                            # Update the temp file with save info
                            job_data.update(result.get('save_info', {}))
                            with open(temp_file, 'w', encoding='utf-8') as f:
                                json.dump(job_data, f, ensure_ascii=False, indent=2)
                            
                            processed_applications.append({
                                'job_id': job_id,
                                'company': job_data.get('company'),
                                'job_title': job_data.get('job_title'),
                                'pdf_path': result.get('save_info', {}).get('pdf_path'),
                                'txt_path': result.get('save_info', {}).get('txt_path'),
                                'address_available': result.get('save_info', {}).get('address_available', False)
                            })
                            
                            print(f"✅ Manual job finalized: {job_data.get('company')} - {job_data.get('job_title')}")
                            if result.get('save_info', {}).get('pdf_path'):
                                print(f"   📄 PDF created: {result['save_info']['pdf_path']}")
                        else:
                            print(f"❌ Job API finalization failed: {result.get('error', 'Unknown error')}")
                    else:
                        print(f"❌ Job API finalization request failed: {finalize_response.status_code}")
                        
                except requests.exceptions.RequestException as e:
                    print(f"❌ Error communicating with job API: {e}")
                    continue
                except Exception as e:
                    print(f"❌ Error processing manual job {job_id}: {e}")
                    continue
        
        return {
            "success": True,
            "message": f"Successfully processed {len(processed_applications)} applications",
            "processed_applications": processed_applications
        }
        
    except Exception as e:
        print(f"❌ Error in manual job finalization: {e}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000) 