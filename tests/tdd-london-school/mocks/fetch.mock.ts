/**
 * London School TDD: Fetch Mock for API Testing
 * Provides controlled mock responses for API behavior verification
 */

import { vi } from 'vitest';

export interface MockFetchResponse {
  response: Response;
  mockSuccessResponse: (data: any) => void;
  mockErrorResponse: (status: number, error: string) => void;
}

export const createMockFetch = (): MockFetchResponse => {
  let mockResponseData: any = {};
  let mockStatus = 200;
  let mockOk = true;

  const mockResponse = {
    ok: mockOk,
    status: mockStatus,
    statusText: mockStatus === 200 ? 'OK' : 'Error',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return 'application/json';
        }
        return null;
      }
    },
    json: vi.fn().mockResolvedValue(mockResponseData)
  } as unknown as Response;

  return {
    response: mockResponse,
    mockSuccessResponse: (data: any) => {
      mockResponseData = data;
      mockStatus = 200;
      mockOk = true;
      (mockResponse as any).status = 200;
      (mockResponse as any).ok = true;
      (mockResponse as any).json = vi.fn().mockResolvedValue(data);
    },
    mockErrorResponse: (status: number, error: string) => {
      mockResponseData = { success: false, error };
      mockStatus = status;
      mockOk = false;
      (mockResponse as any).status = status;
      (mockResponse as any).ok = false;
      (mockResponse as any).json = vi.fn().mockResolvedValue({ success: false, error });
    }
  };
};