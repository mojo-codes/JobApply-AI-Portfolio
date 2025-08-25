/**
 * Career Profile API Service
 * Handles Dynamic Multi-Profile System API calls
 */

const API_BASE_URL = 'http://localhost:5003/api';

export interface Skill {
  name: string;
  level: 'Grundlagen' | 'Fortgeschritten' | 'Experte';
  examples: string[];
}

export interface Experience {
  title: string;
  description: string;
  examples: string[];
}

export interface CareerProfile {
  profile_name: string;
  description: string;
  skills: Skill[];
  experiences: Experience[];
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface PersonalData {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface GlobalSettings {
  personal_data: PersonalData;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

class CareerProfileApiService {
  // ==================== GLOBAL SETTINGS ====================

  async getGlobalSettings(): Promise<ApiResponse<GlobalSettings>> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/global`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get global settings:', error);
      return {
        success: false,
        message: 'Network error while fetching global settings'
      };
    }
  }

  async updateGlobalSettings(settings: GlobalSettings): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/global`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to update global settings:', error);
      return {
        success: false,
        message: 'Network error while updating global settings'
      };
    }
  }

  async getPersonalData(): Promise<ApiResponse<PersonalData>> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/personal`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get personal data:', error);
      return {
        success: false,
        message: 'Network error while fetching personal data'
      };
    }
  }

  async updatePersonalData(personalData: PersonalData): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/personal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(personalData),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to update personal data:', error);
      return {
        success: false,
        message: 'Network error while updating personal data'
      };
    }
  }

  // ==================== CAREER PROFILES ====================

  async listProfiles(): Promise<ApiResponse<CareerProfile[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles`);
      return await response.json();
    } catch (error) {
      console.error('Failed to list profiles:', error);
      return {
        success: false,
        message: 'Network error while fetching profiles'
      };
    }
  }

  async getProfile(profileName: string): Promise<ApiResponse<CareerProfile>> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles/${encodeURIComponent(profileName)}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get profile:', error);
      return {
        success: false,
        message: 'Network error while fetching profile'
      };
    }
  }

  async createProfile(profile: CareerProfile): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to create profile:', error);
      return {
        success: false,
        message: 'Network error while creating profile'
      };
    }
  }

  async updateProfile(profileName: string, profile: CareerProfile): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles/${encodeURIComponent(profileName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to update profile:', error);
      return {
        success: false,
        message: 'Network error while updating profile'
      };
    }
  }

  async deleteProfile(profileName: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles/${encodeURIComponent(profileName)}`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to delete profile:', error);
      return {
        success: false,
        message: 'Network error while deleting profile'
      };
    }
  }

  async setActiveProfile(profileName: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles/${encodeURIComponent(profileName)}/activate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to set active profile:', error);
      return {
        success: false,
        message: 'Network error while setting active profile'
      };
    }
  }

  async deactivateProfile(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles/active`, {
        method: 'DELETE',
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to deactivate profile:', error);
      return {
        success: false,
        message: 'Network error while deactivating profile'
      };
    }
  }

  async getActiveProfile(): Promise<ApiResponse<CareerProfile>> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles/active`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get active profile:', error);
      return {
        success: false,
        message: 'Network error while fetching active profile'
      };
    }
  }

  async getProfileTemplate(): Promise<ApiResponse<CareerProfile>> {
    try {
      const response = await fetch(`${API_BASE_URL}/career-profiles/template`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get profile template:', error);
      return {
        success: false,
        message: 'Network error while fetching profile template'
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  validateProfile(profile: CareerProfile): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.profile_name?.trim()) {
      errors.push('Profil-Name ist erforderlich');
    }

    if (!profile.description?.trim()) {
      errors.push('Beschreibung ist erforderlich');
    }

    if (profile.skills.length === 0) {
      errors.push('Mindestens eine Fähigkeit ist erforderlich');
    }

    // Validate skills
    profile.skills.forEach((skill, index) => {
      if (!skill.name?.trim()) {
        errors.push(`Fähigkeit ${index + 1}: Name ist erforderlich`);
      }
      if (!['Grundlagen', 'Fortgeschritten', 'Experte'].includes(skill.level)) {
        errors.push(`Fähigkeit ${index + 1}: Ungültiges Level`);
      }
    });

    // Validate experiences
    profile.experiences.forEach((exp, index) => {
      if (!exp.title?.trim()) {
        errors.push(`Erfahrung ${index + 1}: Titel ist erforderlich`);
      }
      if (!exp.description?.trim()) {
        errors.push(`Erfahrung ${index + 1}: Beschreibung ist erforderlich`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validatePersonalData(personalData: PersonalData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!personalData.name?.trim()) {
      errors.push('Name ist erforderlich');
    }

    if (!personalData.email?.trim()) {
      errors.push('E-Mail ist erforderlich');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.email)) {
      errors.push('E-Mail-Adresse ist ungültig');
    }

    if (!personalData.city?.trim()) {
      errors.push('Stadt ist erforderlich');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
const careerProfileApi = new CareerProfileApiService();
export default careerProfileApi;