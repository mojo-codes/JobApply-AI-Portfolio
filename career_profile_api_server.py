#!/usr/bin/env python3
"""
Career Profile API Server
Provides REST API endpoints for the Dynamic Multi-Profile System
"""

import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from profile_data_manager import ProfileDataManager, ProfileAPI
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize Profile API
profile_api = ProfileAPI()

@app.route('/api/settings/global', methods=['GET'])
def get_global_settings():
    """GET /api/settings/global"""
    try:
        result = profile_api.get_global_settings()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_global_settings: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/settings/global', methods=['PUT'])
def update_global_settings():
    """PUT /api/settings/global"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        result = profile_api.update_global_settings(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in update_global_settings: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/settings/personal', methods=['GET'])
def get_personal_data():
    """GET /api/settings/personal"""
    try:
        result = profile_api.get_personal_data()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_personal_data: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/settings/personal', methods=['PUT'])
def update_personal_data():
    """PUT /api/settings/personal"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        result = profile_api.update_personal_data(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in update_personal_data: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles', methods=['GET'])
def list_profiles():
    """GET /api/profiles"""
    try:
        result = profile_api.list_profiles()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in list_profiles: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles/<profile_name>', methods=['GET'])
def get_profile(profile_name):
    """GET /api/profiles/{profile_name}"""
    try:
        result = profile_api.get_profile(profile_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles', methods=['POST'])
def create_profile():
    """POST /api/profiles"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        result = profile_api.create_profile(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in create_profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles/<profile_name>', methods=['PUT'])
def update_profile(profile_name):
    """PUT /api/profiles/{profile_name}"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        result = profile_api.update_profile(profile_name, data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in update_profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles/<profile_name>', methods=['DELETE'])
def delete_profile(profile_name):
    """DELETE /api/profiles/{profile_name}"""
    try:
        result = profile_api.delete_profile(profile_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in delete_profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles/<profile_name>/activate', methods=['PUT'])
def set_active_profile(profile_name):
    """PUT /api/profiles/{profile_name}/activate"""
    try:
        result = profile_api.set_active_profile(profile_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in set_active_profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles/active', methods=['GET'])
def get_active_profile():
    """GET /api/profiles/active"""
    try:
        result = profile_api.get_active_profile()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_active_profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles/active', methods=['DELETE'])
def deactivate_profile():
    """DELETE /api/profiles/active"""
    try:
        result = profile_api.deactivate_profile()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in deactivate_profile: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/career-profiles/template', methods=['GET'])
def get_profile_template():
    """GET /api/profiles/template"""
    try:
        result = profile_api.get_profile_template()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_profile_template: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Career Profile API",
        "version": "1.0.0"
    })

if __name__ == '__main__':
    print("🚀 Starting Career Profile API Server...")
    print("📋 Available endpoints:")
    print("  GET  /api/settings/global")
    print("  PUT  /api/settings/global")
    print("  GET  /api/settings/personal")
    print("  PUT  /api/settings/personal")
    print("  GET  /api/profiles")
    print("  POST /api/profiles")
    print("  GET  /api/profiles/{name}")
    print("  PUT  /api/profiles/{name}")
    print("  DELETE /api/profiles/{name}")
    print("  PUT  /api/profiles/{name}/activate")
    print("  GET  /api/profiles/active")
    print("  GET  /api/profiles/template")
    print("  GET  /health")
    print()
    print("💻 Server running on http://localhost:5003")
    print("🌐 CORS enabled for frontend integration")
    print("📁 Profile data stored in current directory")
    
    app.run(host='0.0.0.0', port=5003, debug=False)