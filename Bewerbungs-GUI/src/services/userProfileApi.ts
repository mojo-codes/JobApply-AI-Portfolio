/**
 * User Profile Management API Service
 * Handles all API calls for personal user profiles (profile.yaml)
 * Including CV upload and skill extraction functionality
 */

const API_BASE_URL = 'http://localhost:5001/api';

export interface PersonalContact {
  phone: string;
  email: string;
  street: string;
  city: string;
  postal_code?: string;
  country?: string;
}

export interface PersonalProfile {
  name: string;
  contact: PersonalContact;
  summary?: string;
  position?: string;
  skills?: {
    technical_skills: string[];
    soft_skills: string[];
    languages: string[];
    certifications: string[];
    tools_and_software: string[];
  };
  metadata?: {
    last_updated: string;
    cv_files: CVFileInfo[];
  };
}

export interface CVFileInfo {
  file_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  upload_timestamp: string;
  skills_extracted: boolean;
  extraction_timestamp?: string;
}

export interface SkillExtractionResult {
  success: boolean;
  error?: string;
  skills: {
    technical_skills: string[];
    soft_skills: string[];
    languages: string[];
    certifications: string[];
    tools_and_software: string[];
  };
  file_info: {
    file_path: string;
    file_type: string;
    file_size: number;
    character_count: number;
    word_count: number;
  };
  extraction_metadata: {
    raw_response: string;
    tokens_used: number;
    model_used: string;
    extraction_timestamp: string;
  };
}

export interface CVUploadResponse {
  success: boolean;
  message: string;
  file_metadata: {
    file_id: string;
    original_filename: string;
    secure_filename: string;
    file_path: string;
    file_size: number;
    upload_timestamp: string;
    profile_id: string;
    file_extension: string;
    status: string;
  };
}

export interface SupportedFormatsResponse {
  success: boolean;
  supported_formats: string[];
  dependencies: {
    openai: boolean;
    PyPDF2: boolean;
    docx: boolean;
    docx2txt: boolean;
    striprtf: boolean;
  };
  openai_enabled: boolean;
}

class UserProfileApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // ===== PERSONAL PROFILE MANAGEMENT =====

  async getPersonalProfile(): Promise<PersonalProfile> {
    try {
      // For now, we'll read from the profile.yaml file directly
      // In the future, this could be extended to support multiple profiles
      const response = await fetch('/profile.yaml');
      if (!response.ok) {
        throw new Error('Profile file not found');
      }
      
      // const yamlText = await response.text(); // unused
      throw new Error('YAML parsing not implemented yet - needs backend endpoint');
      
    } catch (error) {
      console.error('Error getting personal profile:', error);
      throw error;
    }
  }

  async updatePersonalProfile(_profile: PersonalProfile): Promise<PersonalProfile> {
    try {
      // This would need a backend endpoint to update profile.yaml
      throw new Error('Profile update not implemented yet - needs backend endpoint');
      
    } catch (error) {
      console.error('Error updating personal profile:', error);
      throw error;
    }
  }

  // ===== CV UPLOAD FUNCTIONALITY =====

  async uploadCV(file: File, profileId = 'default'): Promise<CVUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('cv_file', file);
      formData.append('profile_id', profileId);

      const response = await fetch(`${API_BASE_URL}/profiles/cv/upload`, {
        method: 'POST',
        body: formData
      });

      return await this.handleResponse<CVUploadResponse>(response);
    } catch (error) {
      console.error('Error uploading CV:', error);
      throw error;
    }
  }

  async listUploadedCVs(profileId = 'default'): Promise<CVFileInfo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/cv/list/${profileId}`);
      const data = await this.handleResponse<{ cv_files: CVFileInfo[] }>(response);
      return data.cv_files;
    } catch (error) {
      console.error('Error listing CVs:', error);
      throw error;
    }
  }

  async downloadCV(profileId: string, fileId: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/cv/download/${profileId}/${fileId}`);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error downloading CV:', error);
      throw error;
    }
  }

  async deleteCV(profileId: string, fileId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/cv/delete/${profileId}/${fileId}`, {
        method: 'DELETE'
      });

      await this.handleResponse<{ success: boolean }>(response);
    } catch (error) {
      console.error('Error deleting CV:', error);
      throw error;
    }
  }

  // ===== SKILL EXTRACTION =====

  async extractSkillsFromCV(
    profileId: string, 
    fileId: string, 
    additionalContext = ''
  ): Promise<SkillExtractionResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/cv/extract-skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile_id: profileId,
          file_id: fileId,
          additional_context: additionalContext
        })
      });

      return await this.handleResponse<SkillExtractionResult>(response);
    } catch (error) {
      console.error('Error extracting skills from CV:', error);
      throw error;
    }
  }

  async parseCVFile(profileId: string, fileId: string): Promise<{
    success: boolean;
    error?: string;
    text: string;
    file_type: string;
    file_size: number;
    character_count: number;
    word_count: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/cv/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile_id: profileId,
          file_id: fileId
        })
      });

      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error parsing CV file:', error);
      throw error;
    }
  }

  async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/cv/supported-formats`);
      return await this.handleResponse<SupportedFormatsResponse>(response);
    } catch (error) {
      console.error('Error getting supported formats:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  async validateProfile(profile: Partial<PersonalProfile>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/personal-profiles/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      const data = await this.handleResponse<{ valid: boolean }>(response);
      return data.valid;
    } catch (error) {
      console.error('Error validating profile:', error);
      return false;
    }
  }

  async validateContact(contact: Partial<PersonalContact>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/personal-profiles/validate-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contact)
      });

      const data = await this.handleResponse<{ valid: boolean; errors: string[] }>(response);
      return {
        valid: data.valid,
        errors: data.errors
      };
    } catch (error) {
      console.error('Error validating contact:', error);
      return {
        valid: false,
        errors: ['Validation service error']
      };
    }
  }

  async validateSkills(skills: Partial<PersonalProfile['skills']>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/personal-profiles/validate-skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(skills)
      });

      const data = await this.handleResponse<{ valid: boolean; errors: string[] }>(response);
      return {
        valid: data.valid,
        errors: data.errors
      };
    } catch (error) {
      console.error('Error validating skills:', error);
      return {
        valid: false,
        errors: ['Validation service error']
      };
    }
  }

  async getProfileCompleteness(profile: PersonalProfile): Promise<{
    completeness_percentage: number;
    is_valid: boolean;
    contact_valid: boolean;
    skills_count: number;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/personal-profiles/completeness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      const data = await this.handleResponse<any>(response);
      return {
        completeness_percentage: data.completeness_percentage,
        is_valid: data.is_valid,
        contact_valid: data.contact_valid,
        skills_count: data.skills_count,
        errors: data.errors || [],
        warnings: data.warnings || [],
        recommendations: data.recommendations || []
      };
    } catch (error) {
      console.error('Error getting profile completeness:', error);
      return {
        completeness_percentage: 0,
        is_valid: false,
        contact_valid: false,
        skills_count: 0,
        errors: ['Service error'],
        warnings: [],
        recommendations: []
      };
    }
  }

  async getPersonalProfileSchema(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/personal-profiles/schema`);
      const data = await this.handleResponse<{ schema: any }>(response);
      return data.schema;
    } catch (error) {
      console.error('Error getting personal profile schema:', error);
      throw error;
    }
  }

  // Enhanced validation with detailed feedback
  async validateProfileWithDetails(profile: Partial<PersonalProfile>): Promise<{
    valid: boolean;
    validation_summary?: {
      is_valid: boolean;
      errors: string[];
      warnings: string[];
      profile_completeness: number;
      contact_valid: boolean;
      skills_count: number;
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/personal-profiles/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });

      const data = await this.handleResponse<any>(response);
      return {
        valid: data.valid,
        validation_summary: data.validation_summary
      };
    } catch (error) {
      console.error('Error validating profile with details:', error);
      return {
        valid: false
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await this.handleResponse<{ status: string }>(response);
      return data.status === 'healthy';
    } catch (error) {
      console.error('Error checking API health:', error);
      return false;
    }
  }

  // ===== HELPER METHODS =====

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case '.pdf': return '📄';
      case '.doc':
      case '.docx': return '📝';
      case '.txt': return '📃';
      case '.rtf': return '📄';
      default: return '📁';
    }
  }

  isFileTypeSupported(fileName: string): boolean {
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return supportedExtensions.includes(extension);
  }
}

// Export singleton instance
export const userProfileApi = new UserProfileApiService(); 