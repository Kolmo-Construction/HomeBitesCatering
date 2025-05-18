import { QueryClient } from '@tanstack/react-query';

// Create a QueryClient for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Helper function for API requests
export async function apiRequest(
  method: string, 
  endpoint: string, 
  data?: any, 
  customHeaders?: Record<string, string>
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include', // Include cookies for auth
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, config);
  
  if (!response.ok && response.status !== 401) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'An error occurred');
  }
  
  return response;
}