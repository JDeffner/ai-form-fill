/**
 * Utility functions for parsing JSON responses from AI providers
 */

import { affConfig } from '../core/config';

/**
 * Parses JSON from AI responses, handling markdown code blocks and formatting issues.
 * Returns empty object if parsing fails.
 */
export function parseJsonResponse(aiResponse: string): Record<string, string> {
  try {
    // Clean up the response
    let cleanedResponse = aiResponse.trim();
    
    // Remove a surrounding markdown code fence, anchored so that backticks
    // inside a value survive.
    const fenced = cleanedResponse.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (fenced) {
      cleanedResponse = fenced[1].trim();
    }
    
    // Parse JSON
    const responseAsJson: JSON = JSON.parse(cleanedResponse);
    
    // Convert all values to strings
    const result: Record<string, string> = {};
    for (const [fieldName, fieldValue] of Object.entries(responseAsJson)) {
      if (fieldValue === null || fieldValue === undefined) continue;
      // Nested objects and arrays used to stringify to "[object Object]".
      result[fieldName] = typeof fieldValue === 'object'
        ? JSON.stringify(fieldValue)
        : String(fieldValue);
    }
    
    return result;
  } catch (error) {
    if (affConfig.formFillDebug) {
      console.error('Failed to parse JSON response:', error);
      console.error('Response was:', aiResponse);
    }
    return {};
  }
}

/**
 * Returns true if the string is valid JSON.
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
