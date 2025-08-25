/**
 * Interactive Job Selection API Service
 * Handles all API calls for the interactive job search, ranking, and selection workflow
 */

const API_BASE_URL = 'http://localhost:5002/api';

// TypeScript Interfaces
export interface JobSearchConfig {
  search_terms: string;
  max_jobs: number;
  job_age_days: number;
  providers: {
    jsearch: boolean;
    adzuna: boolean;
    stepstone: boolean;
  };
}

export interface JobFilters {
  location?: string;
  salary_min?: number;
  salary_max?: number;
  employment_type?: string[];
  remote_preference?: string;
  company_size?: string[];
  industries?: string[];
  experience_level?: string;
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

export interface Pagination {
  page: number;
  limit: number;
}

export interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary_info: string;
  platform: string;
  url: string;
  relevance_score: number;
  date_posted?: string;
  employment_type?: string;
  remote_option: boolean;
  company_size?: string;
  experience_level?: string;
  ranking_details: Record<string, any>;
}

export interface InteractiveSearchRequest {
  search_config: JobSearchConfig;
  profile_id?: string;
  ranking_weights?: RankingWeights;
  filters?: JobFilters;
  pagination?: Pagination;
}

export interface InteractiveSearchResponse {
  success: boolean;
  jobs: JobItem[];
  total_count: number;
  filtered_count: number;
  current_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  search_params: {
    keywords: string;
    max_jobs: number;
    max_age_days: number;
    providers: Record<string, boolean>;
    filters_applied: JobFilters;
    profile_used?: string;
    weights_used?: RankingWeights;
  };
  error?: string;
}

export interface FilterOptions {
  employment_types: string[];
  experience_levels: string[];
  company_sizes: string[];
  remote_options: string[];
  industries: string[];
}

export interface JobSelection {
  selected_jobs: string[];
  session_id?: string;
}

export interface JobSelectionResponse {
  success: boolean;
  selected_count: number;
  selected_jobs: string[];
  session_id?: string;
  next_step: string;
  message: string;
  error?: string;
}

export interface BatchRankingRequest {
  job_sets: JobItem[][];
  weight_configs: RankingWeights[];
}

export interface BatchRankingResult {
  set_index: number;
  ranked_jobs?: JobItem[];
  job_count?: number;
  weights_used: RankingWeights;
  error?: string;
}

export interface BatchRankingResponse {
  success: boolean;
  batch_results: BatchRankingResult[];
  processed_sets: number;
  error?: string;
}

class InteractiveJobApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Perform interactive job search with ranking and filtering
   */
  async searchJobs(request: InteractiveSearchRequest): Promise<InteractiveSearchResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/interactive/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      return await this.handleResponse<InteractiveSearchResponse>(response);
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw error;
    }
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(): Promise<FilterOptions> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/interactive/filters`);
      const data = await this.handleResponse<{ success: boolean; filter_options: FilterOptions }>(response);
      return data.filter_options;
    } catch (error) {
      console.error('Error getting filter options:', error);
      throw error;
    }
  }

  /**
   * Process job selection for application generation
   */
  async processJobSelection(selection: JobSelection): Promise<JobSelectionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/interactive/selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selection)
      });
      
      return await this.handleResponse<JobSelectionResponse>(response);
    } catch (error) {
      console.error('Error processing job selection:', error);
      throw error;
    }
  }

  /**
   * Rank jobs with specific weights
   */
  async rankJobs(jobs: JobItem[], weights?: RankingWeights, profileId?: string): Promise<{
    success: boolean;
    ranked_jobs: JobItem[];
    count: number;
    profile_used?: string;
    weights_used?: RankingWeights;
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobs,
          weights,
          profile_id: profileId
        })
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error ranking jobs:', error);
      throw error;
    }
  }

  /**
   * Perform batch ranking with multiple weight configurations
   */
  async batchRankJobs(request: BatchRankingRequest): Promise<BatchRankingResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/interactive/batch-rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      return await this.handleResponse<BatchRankingResponse>(response);
    } catch (error) {
      console.error('Error in batch ranking:', error);
      throw error;
    }
  }

  /**
   * Get default ranking weights
   */
  async getDefaultWeights(): Promise<RankingWeights> {
    try {
      const response = await fetch(`${API_BASE_URL}/ranking/weights/default`);
      const data = await this.handleResponse<{ success: boolean; weights: RankingWeights }>(response);
      return data.weights;
    } catch (error) {
      console.error('Error getting default weights:', error);
      throw error;
    }
  }

  /**
   * Validate ranking weights configuration
   */
  async validateWeights(weights: RankingWeights): Promise<{
    success: boolean;
    valid: boolean;
    weights?: RankingWeights;
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ranking/weights/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ weights })
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error validating weights:', error);
      throw error;
    }
  }

  /**
   * Test ranking system with sample jobs
   */
  async testRanking(
    profileId?: string, 
    customWeights?: RankingWeights, 
    sampleSize: number = 5
  ): Promise<{
    success: boolean;
    test_results: JobItem[];
    sample_count: number;
    profile_used?: string;
    weights_used?: RankingWeights;
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/ranking/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile_id: profileId,
          weights: customWeights,
          sample_size: sampleSize
        })
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error testing ranking:', error);
      throw error;
    }
  }

  /**
   * Check API health
   */
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

  /**
   * Create a search session ID
   */
  generateSessionId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Build pagination object for requests
   */
  createPagination(page: number = 1, limit: number = 20): Pagination {
    return { page, limit };
  }

  /**
   * Create default job search config
   */
  createDefaultSearchConfig(): JobSearchConfig {
    return {
      search_terms: '',
      max_jobs: 15,
      job_age_days: 30,
      providers: {
        jsearch: true,
        adzuna: true,
        stepstone: false
      }
    };
  }

  /**
   * Create default filters object
   */
  createDefaultFilters(): JobFilters {
    return {
      location: '',
      salary_min: undefined,
      salary_max: undefined,
      employment_type: [],
      remote_preference: '',
      company_size: [],
      industries: [],
      experience_level: ''
    };
  }
}

// Export singleton instance
const interactiveJobApiService = new InteractiveJobApiService();
export default interactiveJobApiService;

// Export helper functions
export const InteractiveJobAPI = interactiveJobApiService; 