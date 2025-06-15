export interface ApiError {
  error: string;
  timestamp?: string;
  path?: string;
  statusCode?: number;
}

export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorType: 'network' | 'validation' | 'server' | 'unknown';
  isRetryable: boolean;
}

export const useErrorHandler = () => {
  const errorState = ref<ErrorState>({
    hasError: false,
    errorMessage: '',
    errorType: 'unknown',
    isRetryable: false
  });

  const clearError = () => {
    errorState.value = {
      hasError: false,
      errorMessage: '',
      errorType: 'unknown',
      isRetryable: false
    };
  };

  const handleApiError = (error: any): ErrorState => {
    console.error('API Error:', error);
    
    let errorMessage = 'An unexpected error occurred';
    let errorType: ErrorState['errorType'] = 'unknown';
    let isRetryable = false;

    if (error.response) {
      // HTTP error response
      const status = error.response.status;
      const data = error.response.data as ApiError;
      
      errorMessage = data.error || 'Server error occurred';
      
      if (status >= 400 && status < 500) {
        errorType = 'validation';
        isRetryable = false;
      } else if (status >= 500) {
        errorType = 'server';
        isRetryable = true;
      }
    } else if (error.request) {
      // Network error
      errorMessage = 'Network connection error. Please check your internet connection.';
      errorType = 'network';
      isRetryable = true;
    } else if (error.message) {
      // Other error
      errorMessage = error.message;
      
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        errorType = 'network';
        isRetryable = true;
      }
    }

    const newErrorState: ErrorState = {
      hasError: true,
      errorMessage,
      errorType,
      isRetryable
    };

    errorState.value = newErrorState;
    return newErrorState;
  };

  const handleError = (error: any, context?: string): ErrorState => {
    console.error(`Error ${context ? `in ${context}` : ''}:`, error);
    
    // For API errors, use the specific handler
    if (error.response || error.request) {
      return handleApiError(error);
    }

    // For other errors
    let errorMessage = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    const newErrorState: ErrorState = {
      hasError: true,
      errorMessage: context ? `${context}: ${errorMessage}` : errorMessage,
      errorType: 'unknown',
      isRetryable: false
    };

    errorState.value = newErrorState;
    return newErrorState;
  };

  const showUserFriendlyError = (error: ErrorState): string => {
    switch (error.errorType) {
      case 'network':
        return 'インターネット接続を確認してください。';
      case 'validation':
        return error.errorMessage;
      case 'server':
        return 'サーバーで問題が発生しました。しばらく後にもう一度お試しください。';
      default:
        return '予期しないエラーが発生しました。';
    }
  };

  return {
    errorState: readonly(errorState),
    clearError,
    handleError,
    handleApiError,
    showUserFriendlyError
  };
};