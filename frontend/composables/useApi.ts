import { useErrorHandler } from './useErrorHandler';

export interface ApiConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export const useApi = () => {
  const config = useRuntimeConfig();
  const apiBaseUrl = config.public.apiBaseUrl;
  const { handleApiError } = useErrorHandler();

  const defaultConfig: ApiConfig = {
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 1000 // 1 second
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const apiRequest = async <T>(
    endpoint: string,
    options: RequestInit = {},
    apiConfig: ApiConfig = {}
  ): Promise<T> => {
    const mergedConfig = { ...defaultConfig, ...apiConfig };
    const url = `${apiBaseUrl}${endpoint}`;
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= mergedConfig.retries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), mergedConfig.timeout);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error || `HTTP ${response.status}`);
          (error as any).response = {
            status: response.status,
            data: errorData
          };
          throw error;
        }
        
        const text = await response.text();
        try {
          return text ? JSON.parse(text) : {};
        } catch (e) {
          console.error('Failed to parse JSON response:', text);
          throw new Error('Invalid JSON response from server');
        }
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on validation errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }
        
        // Don't retry on abort (timeout)
        if (error.name === 'AbortError') {
          break;
        }
        
        // Retry on network errors and server errors
        if (attempt < mergedConfig.retries!) {
          console.log(`API request failed (attempt ${attempt}/${mergedConfig.retries}), retrying in ${mergedConfig.retryDelay}ms...`);
          await sleep(mergedConfig.retryDelay!);
        }
      }
    }
    
    throw lastError;
  };

  const get = <T>(endpoint: string, config?: ApiConfig): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'GET' }, config);
  };

  const post = <T>(endpoint: string, data?: any, config?: ApiConfig): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  };

  const put = <T>(endpoint: string, data?: any, config?: ApiConfig): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, config);
  };

  const del = <T>(endpoint: string, config?: ApiConfig): Promise<T> => {
    return apiRequest<T>(endpoint, { method: 'DELETE' }, config);
  };

  return {
    get,
    post,
    put,
    delete: del,
    apiRequest
  };
};