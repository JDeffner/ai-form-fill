/**
 * Utility functions for parsing JSON responses from AI providers
 */

/**
 * Parses JSON from AI responses, handling common formatting issues
 * 
 * @param aiResponse - The raw response text from the AI
 * @returns Object mapping field names to their extracted values (all strings)
 *   - Returns empty object {} if parsing fails (error logged to console)
 * 
 * @example Success case
 * ```typescript
 * const response = '```json\n{"name": "John", "age": 25}\n```';
 * const data = parseJsonResponse(response);
 * console.log(data);
 * // { name: 'John', age: '25' }
 * ```
 * 
 * @example Malformed JSON
 * ```typescript
 * const response = 'Here is the data: {invalid json}';
 * const data = parseJsonResponse(response);
 * console.log(data);
 * // {} (empty object, error logged)
 * ```
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
 * Validate that a string contains valid JSON
 * 
 * Attempts to parse the string as JSON and returns whether it succeeded.
 * Does not throw errors - returns false instead.
 * 
 * @param str - The string to validate
 * @returns `true` if the string is valid JSON, `false` otherwise
 * 
 * @example
 * ```typescript
 * console.log(isValidJson('{"key": "value"}')); // true
 * console.log(isValidJson('{invalid}')); // false
 * console.log(isValidJson('just text')); // false
 * console.log(isValidJson('123')); // true (valid JSON)
 * console.log(isValidJson('null')); // true (valid JSON)
 * ```
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
