/**
 * Utility functions for parsing JSON responses from AI providers
 */

/**
 * Parses JSON from AI responses, handling markdown code blocks and formatting issues.
 * Returns empty object if parsing fails.
 */
export function parseJsonResponse(aiResponse: string): Record<string, string> {
  try {
    // Clean up the response
    let cleanedResponse = aiResponse.trim();
    
    // Remove markdown code blocks
    cleanedResponse = cleanedResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Parse JSON
    const responseAsJson: JSON = JSON.parse(cleanedResponse);
    
    // Convert all values to strings
    const result: Record<string, string> = {};
    for (const [fieldName, fieldValue] of Object.entries(responseAsJson)) {
      result[fieldName] = String(fieldValue);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.error('Response was:', aiResponse);
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
