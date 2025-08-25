"""
🌐 Profile Management API
RESTful API endpoints for search profile management
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from profile_manager import ProfileManager
from search_profiles import SearchProfile
from cv_skill_extractor import CVSkillExtractor
from personal_profile_schema import (
    get_personal_profile_schema,
    validate_personal_profile_data,
    PersonalProfileValidator,
    PersonalProfile,
    PERSONAL_PROFILE_SCHEMA
)
import logging
import os
import time
import random
import string
from datetime import datetime
from werkzeug.utils import secure_filename
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Initialize ProfileManager
profile_manager = ProfileManager()

# Initialize CV Skill Extractor
cv_skill_extractor = CVSkillExtractor()

# CV Upload Configuration
UPLOAD_FOLDER = 'uploads/cvs'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# API Routes
@app.route('/api/profiles', methods=['GET'])
def list_profiles():
    """List all available profiles"""
    try:
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        include_templates = request.args.get('include_templates', 'false').lower() == 'true'
        
        profiles = profile_manager.list_profiles(
            include_archived=include_archived,
            include_templates=include_templates
        )
        
        return jsonify({
            'success': True,
            'profiles': profiles,
            'count': len(profiles)
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing profiles: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/<profile_id>', methods=['GET'])
def get_profile(profile_id):
    """Get a specific profile by ID"""
    try:
        profile = profile_manager.load_profile(profile_id)
        
        if not profile:
            return jsonify({'error': 'Profile not found'}), 404
        
        return jsonify({
            'success': True,
            'profile': profile.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error loading profile {profile_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles', methods=['POST'])
def create_profile():
    """Create a new profile"""
    try:
        data = request.get_json()
        
        if not data:
            logger.error("No data provided in profile creation request")
            return jsonify({'error': 'No data provided'}), 400
        
        logger.info(f"Creating profile with data: {data}")
        
        # Generate ID if not provided
        if 'id' not in data or not data['id']:
            data['id'] = 'profile_' + str(int(time.time() * 1000)) + '_' + ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(9))
        
        # Create profile from data
        profile = SearchProfile.from_dict(data)
        
        # Save profile
        overwrite = request.args.get('overwrite', 'false').lower() == 'true'
        profile_manager.save_profile(profile, overwrite=overwrite)
        
        logger.info(f"Profile created successfully: {profile.id}")
        
        return jsonify({
            'success': True,
            'profile': profile.to_dict(),
            'message': 'Profile created successfully'
        }), 201
        
    except ValueError as e:
        logger.error(f"Profile validation error: {e}")
        logger.error(f"Request data was: {data}")
        return jsonify({'error': f'Invalid profile data: {str(e)}'}), 400
    except FileExistsError as e:
        logger.error(f"Profile already exists: {e}")
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        logger.error(f"Unexpected error creating profile: {e}")
        logger.error(f"Request data was: {data}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/<profile_id>', methods=['PUT'])
def update_profile(profile_id):
    """Update an existing profile"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Ensure ID matches
        data['id'] = profile_id
        
        # Create profile from data
        profile = SearchProfile.from_dict(data)
        
        # Save profile (overwrite=True for updates)
        profile_manager.save_profile(profile, overwrite=True)
        
        return jsonify({
            'success': True,
            'profile': profile.to_dict(),
            'message': 'Profile updated successfully'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid profile data: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error updating profile {profile_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/active', methods=['GET'])
def get_active_profile():
    """Get the active profile (returns first available profile as fallback)"""
    try:
        # For now, return the first available profile as active
        # In the future, this could be stored in a config file or database
        profiles = profile_manager.list_profiles(include_archived=False, include_templates=False)
        
        if not profiles:
            return jsonify({'error': 'No profiles available'}), 404
        
        # Return the first profile as active
        active_profile = profiles[0]
        
        return jsonify({
            'success': True,
            'profile': active_profile.to_dict() if hasattr(active_profile, 'to_dict') else active_profile,
            'id': active_profile.id if hasattr(active_profile, 'id') else active_profile.get('id'),
            'name': active_profile.name if hasattr(active_profile, 'name') else active_profile.get('name', 'Unknown'),
            'is_active': True
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting active profile: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/active', methods=['POST'])
def set_active_profile():
    """Set a profile as active"""
    try:
        data = request.get_json()
        profile_id = data.get('profile_id')
        
        if not profile_id:
            return jsonify({'error': 'profile_id is required'}), 400
        
        # Verify profile exists
        profile = profile_manager.load_profile(profile_id)
        if not profile:
            return jsonify({'error': 'Profile not found'}), 404
        
        # For now, just return success - in the future this could store active profile
        return jsonify({
            'success': True,
            'message': f'Profile {profile_id} set as active',
            'active_profile_id': profile_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error setting active profile: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/<profile_id>', methods=['DELETE'])
def delete_profile(profile_id):
    """Delete a profile"""
    try:
        archive = request.args.get('archive', 'true').lower() == 'true'
        
        success = profile_manager.delete_profile(profile_id, archive=archive)
        
        if not success:
            return jsonify({'error': 'Profile not found'}), 404
        
        action = 'archived' if archive else 'deleted'
        return jsonify({
            'success': True,
            'message': f'Profile {action} successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting profile {profile_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/<profile_id>/duplicate', methods=['POST'])
def duplicate_profile(profile_id):
    """Duplicate a profile"""
    try:
        data = request.get_json() or {}
        
        new_id = data.get('new_id', f"{profile_id}_copy_{int(datetime.now().timestamp())}")
        new_name = data.get('new_name')
        
        new_profile = profile_manager.duplicate_profile(
            source_id=profile_id,
            new_id=new_id,
            new_name=new_name
        )
        
        return jsonify({
            'success': True,
            'profile': new_profile.to_dict(),
            'message': 'Profile duplicated successfully'
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error duplicating profile {profile_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/templates', methods=['GET'])
def get_templates():
    """Get available profile templates"""
    try:
        profiles = profile_manager.list_profiles(
            include_archived=False,
            include_templates=True
        )
        
        # Filter only templates
        templates = [p for p in profiles if p.get('status') == 'template']
        
        return jsonify({
            'success': True,
            'templates': templates,
            'count': len(templates)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/schema', methods=['GET'])
def get_schema():
    """Get the JSON schema for profiles"""
    try:
        schema = profile_manager.get_schema()
        
        return jsonify({
            'success': True,
            'schema': schema
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting schema: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/validate', methods=['POST'])
def validate_profile():
    """Validate profile data against schema"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        is_valid = profile_manager.validate_profile_data(data)
        
        return jsonify({
            'success': True,
            'valid': is_valid
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'valid': False,
            'error': str(e)
        }), 200

@app.route('/api/profiles/export', methods=['GET'])
def export_profiles():
    """Export all profiles"""
    try:
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        
        # Create temporary export file
        export_file = f"profiles_export_{int(datetime.now().timestamp())}.json"
        profile_manager.export_profiles(export_file, include_archived=include_archived)
        
        # Read the file content
        with open(export_file, 'r', encoding='utf-8') as f:
            export_data = f.read()
        
        # Clean up temporary file
        os.remove(export_file)
        
        return export_data, 200, {
            'Content-Type': 'application/json',
            'Content-Disposition': f'attachment; filename="{export_file}"'
        }
        
    except Exception as e:
        logger.error(f"Error exporting profiles: {e}")
        return jsonify({'error': str(e)}), 500

# ===== CV UPLOAD ENDPOINTS =====

@app.route('/api/profiles/cv/upload', methods=['POST'])
def upload_cv():
    """Upload a CV file for a user profile"""
    try:
        logger.info(f"CV upload request received. Content-Type: {request.content_type}")
        
        # Check if file is in request
        if 'cv_file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['cv_file']
        profile_id = request.form.get('profile_id', 'default')
        
        # Check if file was selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Check file size (Flask doesn't handle this automatically for form data)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        # Generate secure filename
        original_filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        secure_name = f"{profile_id}_{file_id}.{file_extension}"
        
        # Save file
        file_path = os.path.join(UPLOAD_FOLDER, secure_name)
        file.save(file_path)
        
        # Store file metadata
        file_metadata = {
            'file_id': file_id,
            'original_filename': original_filename,
            'secure_filename': secure_name,
            'file_path': file_path,
            'file_size': file_size,
            'upload_timestamp': datetime.now().isoformat(),
            'profile_id': profile_id,
            'file_extension': file_extension,
            'status': 'uploaded'
        }
        
        logger.info(f"CV uploaded successfully: {secure_name} ({file_size} bytes)")
        
        return jsonify({
            'success': True,
            'message': 'CV uploaded successfully',
            'file_metadata': file_metadata
        }), 200
        
    except Exception as e:
        logger.error(f"Error uploading CV: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/cv/list/<profile_id>', methods=['GET'])
def list_uploaded_cvs(profile_id):
    """List all uploaded CVs for a profile"""
    try:
        cv_files = []
        
        # Scan upload directory for files belonging to this profile
        if os.path.exists(UPLOAD_FOLDER):
            for filename in os.listdir(UPLOAD_FOLDER):
                if filename.startswith(f"{profile_id}_"):
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    if os.path.isfile(file_path):
                        stat = os.stat(file_path)
                        
                        # Extract file_id from filename
                        parts = filename.split('_', 1)
                        if len(parts) > 1:
                            file_id_part = parts[1].rsplit('.', 1)[0]
                        else:
                            file_id_part = filename.rsplit('.', 1)[0]
                        
                        cv_files.append({
                            'file_id': file_id_part,
                            'filename': filename,
                            'file_size': stat.st_size,
                            'upload_timestamp': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            'profile_id': profile_id
                        })
        
        return jsonify({
            'success': True,
            'profile_id': profile_id,
            'cv_files': cv_files,
            'count': len(cv_files)
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing CVs for profile {profile_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/cv/download/<profile_id>/<file_id>', methods=['GET'])
def download_cv(profile_id, file_id):
    """Download a specific CV file"""
    try:
        # Find the file with matching profile_id and file_id
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.startswith(f"{profile_id}_{file_id}"):
                return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
        
        return jsonify({'error': 'File not found'}), 404
        
    except Exception as e:
        logger.error(f"Error downloading CV {file_id} for profile {profile_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profiles/cv/delete/<profile_id>/<file_id>', methods=['DELETE'])
def delete_cv(profile_id, file_id):
    """Delete a CV file for a user profile"""
    try:
        cv_dir = os.path.join(UPLOAD_FOLDER, profile_id)
        
        if not os.path.exists(cv_dir):
            return jsonify({
                'success': False,
                'error': 'Profile directory not found'
            }), 404
        
        # Find and delete the file
        deleted = False
        for filename in os.listdir(cv_dir):
            if filename.startswith(file_id):
                file_path = os.path.join(cv_dir, filename)
                os.remove(file_path)
                deleted = True
                logger.info(f"Deleted CV file: {file_path}")
                break
        
        if not deleted:
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'CV file deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting CV file: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===== CV SKILL EXTRACTION ENDPOINTS =====

@app.route('/api/profiles/cv/extract-skills', methods=['POST'])
def extract_skills_from_cv():
    """Extract skills from an uploaded CV using OpenAI"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        profile_id = data.get('profile_id')
        file_id = data.get('file_id')
        additional_context = data.get('additional_context', '')
        
        if not profile_id or not file_id:
            return jsonify({
                'success': False,
                'error': 'profile_id and file_id are required'
            }), 400
        
        # Find the CV file
        cv_dir = os.path.join(UPLOAD_FOLDER, profile_id)
        
        if not os.path.exists(cv_dir):
            return jsonify({
                'success': False,
                'error': 'Profile directory not found'
            }), 404
        
        file_path = None
        for filename in os.listdir(cv_dir):
            if filename.startswith(file_id):
                file_path = os.path.join(cv_dir, filename)
                break
        
        if not file_path:
            return jsonify({
                'success': False,
                'error': 'CV file not found'
            }), 404
        
        # Extract skills
        logger.info(f"Extracting skills from CV: {file_path}")
        extraction_result = cv_skill_extractor.extract_skills_from_file(
            file_path, 
            additional_context
        )
        
        return jsonify({
            'success': extraction_result['success'],
            'error': extraction_result.get('error'),
            'skills': extraction_result['skills'],
            'file_info': extraction_result['file_info'],
            'extraction_metadata': extraction_result.get('extraction_metadata', {})
        }), 200 if extraction_result['success'] else 400
        
    except Exception as e:
        logger.error(f"Error extracting skills from CV: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/profiles/cv/parse', methods=['POST'])
def parse_cv_file():
    """Parse a CV file and extract text content without skill extraction"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        profile_id = data.get('profile_id')
        file_id = data.get('file_id')
        
        if not profile_id or not file_id:
            return jsonify({
                'success': False,
                'error': 'profile_id and file_id are required'
            }), 400
        
        # Find the CV file
        cv_dir = os.path.join(UPLOAD_FOLDER, profile_id)
        
        if not os.path.exists(cv_dir):
            return jsonify({
                'success': False,
                'error': 'Profile directory not found'
            }), 404
        
        file_path = None
        for filename in os.listdir(cv_dir):
            if filename.startswith(file_id):
                file_path = os.path.join(cv_dir, filename)
                break
        
        if not file_path:
            return jsonify({
                'success': False,
                'error': 'CV file not found'
            }), 404
        
        # Parse the file
        logger.info(f"Parsing CV file: {file_path}")
        parse_result = cv_skill_extractor.parse_cv_file(file_path)
        
        return jsonify({
            'success': parse_result['success'],
            'error': parse_result.get('error'),
            'text': parse_result.get('text', ''),
            'file_type': parse_result.get('file_type', ''),
            'file_size': parse_result.get('file_size', 0),
            'character_count': parse_result.get('character_count', 0),
            'word_count': parse_result.get('word_count', 0)
        }), 200 if parse_result['success'] else 400
        
    except Exception as e:
        logger.error(f"Error parsing CV file: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/profiles/cv/supported-formats', methods=['GET'])
def get_supported_formats():
    """Get information about supported CV file formats and dependencies"""
    try:
        formats_info = cv_skill_extractor.get_supported_formats()
        
        return jsonify({
            'success': True,
            **formats_info
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting supported formats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===== PERSONAL PROFILE VALIDATION ENDPOINTS =====

@app.route('/api/personal-profiles/schema', methods=['GET'])
def get_personal_profile_schema_endpoint():
    """Get the JSON schema for personal profiles"""
    try:
        schema = get_personal_profile_schema()
        
        return jsonify({
            'success': True,
            'schema': schema,
            'schema_version': '1.0',
            'description': 'JSON Schema for personal user profiles including contact information, skills, and metadata'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting personal profile schema: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/personal-profiles/validate', methods=['POST'])
def validate_personal_profile():
    """Validate personal profile data against schema"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'valid': False,
                'error': 'No data provided'
            }), 400
        
        # Basic schema validation
        try:
            is_valid = validate_personal_profile_data(data)
            validation_summary = None
            
            # If basic validation passes, get detailed summary
            if is_valid:
                try:
                    profile = PersonalProfile.from_dict(data)
                    validation_summary = PersonalProfileValidator.get_validation_summary(profile)
                except Exception as summary_error:
                    logger.warning(f"Could not generate validation summary: {summary_error}")
            
            response_data = {
                'success': True,
                'valid': is_valid,
                'timestamp': datetime.now().isoformat()
            }
            
            if validation_summary:
                response_data['validation_summary'] = validation_summary
            
            return jsonify(response_data), 200
            
        except ValueError as validation_error:
            return jsonify({
                'success': True,
                'valid': False,
                'error': str(validation_error),
                'timestamp': datetime.now().isoformat()
            }), 200
        
    except Exception as e:
        logger.error(f"Error validating personal profile: {e}")
        return jsonify({
            'success': False,
            'valid': False,
            'error': f'Validation service error: {str(e)}'
        }), 500

@app.route('/api/personal-profiles/validate-contact', methods=['POST'])
def validate_contact_info():
    """Validate contact information separately"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'valid': False,
                'error': 'No contact data provided'
            }), 400
        
        is_valid, errors = PersonalProfileValidator.validate_contact(data)
        
        return jsonify({
            'success': True,
            'valid': is_valid,
            'errors': errors,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error validating contact info: {e}")
        return jsonify({
            'success': False,
            'valid': False,
            'error': str(e)
        }), 500

@app.route('/api/personal-profiles/validate-skills', methods=['POST'])
def validate_skills_data():
    """Validate skills information separately"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'valid': False,
                'error': 'No skills data provided'
            }), 400
        
        is_valid, errors = PersonalProfileValidator.validate_skills(data)
        
        return jsonify({
            'success': True,
            'valid': is_valid,
            'errors': errors,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error validating skills data: {e}")
        return jsonify({
            'success': False,
            'valid': False,
            'error': str(e)
        }), 500

@app.route('/api/personal-profiles/completeness', methods=['POST'])
def get_profile_completeness():
    """Get detailed completeness analysis for a personal profile"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No profile data provided'
            }), 400
        
        try:
            profile = PersonalProfile.from_dict(data)
            validation_summary = PersonalProfileValidator.get_validation_summary(profile)
            
            return jsonify({
                'success': True,
                'completeness_percentage': validation_summary['profile_completeness'],
                'is_valid': validation_summary['is_valid'],
                'contact_valid': validation_summary['contact_valid'],
                'skills_count': validation_summary['skills_count'],
                'errors': validation_summary['errors'],
                'warnings': validation_summary['warnings'],
                'recommendations': _generate_completeness_recommendations(validation_summary),
                'timestamp': datetime.now().isoformat()
            }), 200
            
        except Exception as profile_error:
            return jsonify({
                'success': False,
                'error': f'Could not analyze profile: {str(profile_error)}'
            }), 400
        
    except Exception as e:
        logger.error(f"Error analyzing profile completeness: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def _generate_completeness_recommendations(validation_summary):
    """Generate recommendations to improve profile completeness"""
    recommendations = []
    
    completeness = validation_summary['profile_completeness']
    
    if completeness < 20:
        recommendations.append("Add your full name to get started")
    
    if not validation_summary['contact_valid']:
        recommendations.append("Complete and verify your contact information")
    
    if validation_summary['skills_count'] == 0:
        recommendations.append("Add your skills - both technical and soft skills help employers find you")
    elif validation_summary['skills_count'] < 5:
        recommendations.append("Add more skills to better showcase your abilities")
    
    if 'Professional summary is empty' in validation_summary['warnings']:
        recommendations.append("Write a professional summary to highlight your experience and goals")
    
    if 'Position/job title is empty' in validation_summary['warnings']:
        recommendations.append("Add your current or desired job title")
    
    if completeness >= 80:
        recommendations.append("Great job! Your profile is nearly complete")
    elif completeness >= 60:
        recommendations.append("You're on the right track - just a few more details needed")
    elif completeness >= 40:
        recommendations.append("Good start! Adding more information will make your profile stand out")
    
    return recommendations

# ===== CAREER PROFILE ENDPOINTS =====

@app.route('/api/career-profiles', methods=['GET'])
def list_career_profiles():
    """List all career profiles"""
    try:
        # Load career profiles from career_profile_api_server.py if available
        # For now, return empty list - this should be connected to the career profile system
        return jsonify({
            'success': True,
            'data': [],
            'count': 0
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing career profiles: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/career-profiles', methods=['POST'])
def create_career_profile():
    """Create a new career profile"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields for career profile
        required_fields = ['profile_name', 'description']
        for field in required_fields:
            if field not in data or not data[field].strip():
                return jsonify({'error': f'{field} is required'}), 400
        
        # Set defaults
        career_profile = {
            'profile_name': data['profile_name'].strip(),
            'description': data['description'].strip(),
            'skills': data.get('skills', []),
            'experiences': data.get('experiences', []),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # TODO: Save to proper career profile storage
        # For now, just return success - this should integrate with career_profile_api_server.py
        
        logger.info(f"Career profile created: {career_profile['profile_name']}")
        
        return jsonify({
            'success': True,
            'data': career_profile,
            'message': 'Career profile created successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating career profile: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/career-profiles/<profile_name>', methods=['PUT'])
def update_career_profile(profile_name):
    """Update an existing career profile"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['profile_name', 'description']
        for field in required_fields:
            if field not in data or not data[field].strip():
                return jsonify({'error': f'{field} is required'}), 400
        
        # Update career profile
        career_profile = {
            'profile_name': data['profile_name'].strip(),
            'description': data['description'].strip(),
            'skills': data.get('skills', []),
            'experiences': data.get('experiences', []),
            'updated_at': datetime.now().isoformat()
        }
        
        # TODO: Update in proper career profile storage
        
        logger.info(f"Career profile updated: {profile_name}")
        
        return jsonify({
            'success': True,
            'data': career_profile,
            'message': 'Career profile updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating career profile: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/career-profiles/<profile_name>', methods=['DELETE'])
def delete_career_profile(profile_name):
    """Delete a career profile"""
    try:
        # TODO: Delete from proper career profile storage
        
        logger.info(f"Career profile deleted: {profile_name}")
        
        return jsonify({
            'success': True,
            'message': 'Career profile deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting career profile: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/career-profiles/active', methods=['GET'])
def get_active_career_profile():
    """Get the active career profile"""
    try:
        # TODO: Get from proper career profile storage
        # For now, return no active profile
        
        return jsonify({
            'success': True,
            'data': None,
            'message': 'No active career profile'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting active career profile: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/career-profiles/active', methods=['POST'])
def set_active_career_profile():
    """Set a career profile as active"""
    try:
        data = request.get_json()
        profile_name = data.get('profile_name')
        
        if not profile_name:
            return jsonify({'error': 'profile_name is required'}), 400
        
        # TODO: Set active in proper career profile storage
        
        logger.info(f"Career profile set as active: {profile_name}")
        
        return jsonify({
            'success': True,
            'message': f'Career profile {profile_name} set as active'
        }), 200
        
    except Exception as e:
        logger.error(f"Error setting active career profile: {e}")
        return jsonify({'error': str(e)}), 500

# ===== PERSONAL SETTINGS ENDPOINTS =====

@app.route('/api/settings/personal', methods=['GET'])
def get_personal_settings():
    """Get personal settings/data"""
    try:
        # Load personal data from global_settings.yaml if exists
        import yaml
        settings_file = 'global_settings.yaml'
        
        personal_data = {
            'name': '',
            'address': '',
            'city': '',
            'phone': '',
            'email': ''
        }
        
        if os.path.exists(settings_file):
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    settings = yaml.safe_load(f) or {}
                    personal_section = settings.get('personal_data', {})
                    personal_data.update(personal_section)
            except Exception as e:
                logger.warning(f"Could not load personal settings: {e}")
        
        return jsonify({
            'success': True,
            'data': personal_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting personal settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings/personal', methods=['PUT'])
def update_personal_settings():
    """Update personal settings/data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Load existing settings
        import yaml
        settings_file = 'global_settings.yaml'
        settings = {}
        
        if os.path.exists(settings_file):
            try:
                with open(settings_file, 'r', encoding='utf-8') as f:
                    settings = yaml.safe_load(f) or {}
            except Exception as e:
                logger.warning(f"Could not load existing settings: {e}")
        
        # Update personal data section
        settings['personal_data'] = {
            'name': data.get('name', '').strip(),
            'address': data.get('address', '').strip(),
            'city': data.get('city', '').strip(),
            'phone': data.get('phone', '').strip(),
            'email': data.get('email', '').strip()
        }
        
        # Save back to file
        with open(settings_file, 'w', encoding='utf-8') as f:
            yaml.dump(settings, f, default_flow_style=False, allow_unicode=True)
        
        logger.info(f"Personal settings updated successfully")
        
        return jsonify({
            'success': True,
            'message': 'Personal settings updated successfully',
            'data': settings['personal_data']
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating personal settings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Profile Management API',
        'version': '1.0.0'
    }), 200

# Run the app
if __name__ == '__main__':
    port = int(os.getenv('PROFILE_API_PORT', 5001))
    debug = False  # Always disable debug mode for production
    
    logger.info(f"Starting Profile Management API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug) 