/**
 * Parsing of model output into a field-value map.
 */

import { ResponseParseError } from '../core/errors';

/**
 * Parse a model response into a key → value map, tolerating markdown code
 * fences around the JSON. Values keep their JSON types (string, number,
 * boolean, array) — coercion happens at fill time, per field type.
 *
 * @throws ResponseParseError when the response is not valid JSON or not a
 *   JSON object; the error carries the raw model output.
 */
export function parseModelResponse(rawResponse: string): Record<string, unknown> {
  const cleaned = rawResponse
    .trim()
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new ResponseParseError('Model response is not valid JSON', {
      raw: rawResponse,
      cause: error,
    });
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ResponseParseError('Model response is not a JSON object', { raw: rawResponse });
  }

  return parsed as Record<string, unknown>;
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
