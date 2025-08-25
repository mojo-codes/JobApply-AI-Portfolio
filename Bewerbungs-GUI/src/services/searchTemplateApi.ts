/**
 * Profile Management API Service
 * Handles all API calls to the backend profile management system
 */

const API_BASE_URL = 'http://localhost:5001/api';

export interface SearchKeyword {
  term: string;
  keyword?: string; // Keep for compatibility
  weight: number;
  required: boolean;
  variations?: string[];
}

export interface RankingWeights {
  title_keyword_match: number;
  description_keyword_match: number;
  location_preference: number;
  remote_work_bonus: number;
  salary_range_match: number;
  company_size_preference: number;
  recency_bonus: number;
  exclusion_penalty: number;
}

export interface SearchTemplate {
  id: string;
  name: string;
  job_type: string;
  description: string;
  keywords: SearchKeyword[];
  filters: {
    location?: string | string[]; // Support both string and array for compatibility
    salary_min?: number;
    salary_max?: number;
    experience_level?: string;
    employment_type?: string[];
    remote_preference?: string;
    company_size?: string[];
    industries?: string[];
  };
  search_settings: {
    max_jobs: number;
    auto_process: boolean;
    providers: {
      jsearch: boolean;
      adzuna: boolean;
      stepstone: boolean;
    };
  };
  ranking_weights?: RankingWeights;
  metadata?: {
    created_at: string;
    updated_at: string;
    version: string;
    author?: string;
  };
}

export interface SearchTemplateListItem {
  id: string;
  name: string;
  job_type: string;
  description: string;
  keyword_count: number;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'template';
  file_path: string;
}

class SearchTemplateApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async listProfiles(includeArchived = false, includeTemplates = true): Promise<SearchTemplateListItem[]> {
    try {
      const params = new URLSearchParams({
        include_archived: includeArchived.toString(),
        include_templates: includeTemplates.toString()
      });
      
      const response = await fetch(`${API_BASE_URL}/profiles?${params}`);
      const data = await this.handleResponse<{ profiles: SearchTemplateListItem[] }>(response);
      return data.profiles;
    } catch (error) {
      console.error('Error listing profiles:', error);
      throw error;
    }
  }

  async getProfile(profileId: string): Promise<SearchTemplate> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${profileId}`);
      const data = await this.handleResponse<{ profile: SearchTemplate }>(response);
      return data.profile;
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }

  async createProfile(profile: SearchTemplate, overwrite = false): Promise<SearchTemplate> {
    try {
      const params = new URLSearchParams({ overwrite: overwrite.toString() });
      const response = await fetch(`${API_BASE_URL}/profiles?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });
      
      const data = await this.handleResponse<{ profile: SearchTemplate }>(response);
      return data.profile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async updateProfile(profileId: string, profile: SearchTemplate): Promise<SearchTemplate> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });
      
      const data = await this.handleResponse<{ profile: SearchTemplate }>(response);
      return data.profile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async deleteProfile(profileId: string, archive = true): Promise<void> {
    try {
      const params = new URLSearchParams({ archive: archive.toString() });
      const response = await fetch(`${API_BASE_URL}/profiles/${profileId}?${params}`, {
        method: 'DELETE'
      });
      
      await this.handleResponse<{ success: boolean }>(response);
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  async duplicateProfile(profileId: string, newId?: string, newName?: string): Promise<SearchTemplate> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${profileId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_id: newId, new_name: newName })
      });
      
      const data = await this.handleResponse<{ profile: SearchTemplate }>(response);
      return data.profile;
    } catch (error) {
      console.error('Error duplicating profile:', error);
      throw error;
    }
  }

  async getTemplates(): Promise<SearchTemplateListItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/templates`);
      const data = await this.handleResponse<{ templates: SearchTemplateListItem[] }>(response);
      return data.templates;
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  async validateProfile(profile: Partial<SearchTemplate>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles/validate`, {
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

  async exportProfiles(includeArchived = false): Promise<Blob> {
    try {
      const params = new URLSearchParams({ include_archived: includeArchived.toString() });
      const response = await fetch(`${API_BASE_URL}/profiles/export?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.blob();
    } catch (error) {
      console.error('Error exporting profiles:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await this.handleResponse<{ status: string }>(response);
      return data.status === 'healthy';
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

export const searchTemplateApi = new SearchTemplateApiService(); 