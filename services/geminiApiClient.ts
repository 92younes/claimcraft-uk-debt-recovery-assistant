/**
 * Gemini API Client
 *
 * Thin wrapper around the backend Gemini proxy endpoint.
 * This keeps the API key secure on the server side.
 */

import { Type } from "@google/genai";

// Re-export Type for schema definitions
export { Type };

// Types for API requests/responses
export interface GeminiPart {
  text?: string;
  inlineData?: {
    data: string;  // base64
    mimeType: string;
  };
}

export interface GeminiContents {
  parts: GeminiPart[];
}

export interface GeminiConfig {
  responseMimeType?: string;
  responseSchema?: object;
}

export interface GeminiRequest {
  model: string;
  contents: string | GeminiContents;
  config?: GeminiConfig;
}

export interface GeminiResponse {
  text: string;
  candidates?: any[];
}

// API base URL (defaults to current origin in production, localhost in dev)
const getApiBaseUrl = (): string => {
  // In development, use the explicit server port
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  // In production, use same origin
  return '';
};

/**
 * Make a request to the Gemini API via backend proxy
 */
export const generateContent = async (request: GeminiRequest): Promise<GeminiResponse> => {
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/gemini/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Gemini API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Helper to create multimodal content with files
 */
export const createMultimodalContent = (
  files: Array<{ data: string; type: string }>,
  prompt: string
): GeminiContents => {
  const parts: GeminiPart[] = files.map(f => ({
    inlineData: {
      data: f.data,
      mimeType: f.type
    }
  }));
  parts.push({ text: prompt });
  return { parts };
};

/**
 * Convenience wrapper for text-only requests
 */
export const generateText = async (
  prompt: string,
  model: string = 'gemini-2.5-flash'
): Promise<string> => {
  const response = await generateContent({
    model,
    contents: prompt
  });
  return response.text;
};

/**
 * Convenience wrapper for JSON-mode requests
 */
export const generateJson = async <T>(
  prompt: string,
  schema: object,
  model: string = 'gemini-2.5-flash'
): Promise<T> => {
  const response = await generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  });

  // Parse the JSON response
  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  // Clean the response (handle markdown code blocks)
  const cleaned = cleanJson(text);
  return JSON.parse(cleaned);
};

/**
 * Convenience wrapper for multimodal requests with files
 */
export const generateFromFiles = async <T>(
  files: Array<{ data: string; type: string }>,
  prompt: string,
  schema?: object,
  model: string = 'gemini-2.5-flash'
): Promise<T> => {
  const contents = createMultimodalContent(files, prompt);

  const request: GeminiRequest = {
    model,
    contents
  };

  if (schema) {
    request.config = {
      responseMimeType: 'application/json',
      responseSchema: schema
    };
  }

  const response = await generateContent(request);

  if (schema) {
    const cleaned = cleanJson(response.text);
    return JSON.parse(cleaned);
  }

  return response.text as unknown as T;
};

/**
 * Helper to clean AI response text (strip markdown) before JSON parsing
 */
const cleanJson = (text: string): string => {
  if (!text) return '{}';

  // 1. Try to find markdown code block
  const match = text.match(/```(?:json)?([\s\S]*?)```/);
  if (match) return match[1].trim();

  // 2. Fallback: Try to find the first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  return text.trim();
};

// Default export for convenience
export default {
  generateContent,
  generateText,
  generateJson,
  generateFromFiles,
  createMultimodalContent,
  Type
};
