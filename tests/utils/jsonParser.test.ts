import { describe, it, expect } from 'vitest';
import { parseJsonResponse, isValidJson } from '../../lib/utils/jsonParser';

describe('parseJsonResponse', () => {
  it('parses valid JSON object', () => {
    const input = '{"name": "John", "email": "john@example.com"}';
    const result = parseJsonResponse(input);
    
    expect(result).toEqual({ name: 'John', email: 'john@example.com' });
  });

  it('handles JSON wrapped in markdown code blocks', () => {
    const input = '```json\n{"firstName": "Jane", "age": "25"}\n```';
    const result = parseJsonResponse(input);
    
    expect(result).toEqual({ firstName: 'Jane', age: '25' });
  });

  it('handles plain markdown code blocks without language specifier', () => {
    const input = '```\n{"city": "Berlin"}\n```';
    const result = parseJsonResponse(input);
    
    expect(result).toEqual({ city: 'Berlin' });
  });

  it('converts non-string values to strings', () => {
    const input = '{"count": 42, "active": true, "score": 3.14}';
    const result = parseJsonResponse(input);
    
    expect(result).toEqual({ count: '42', active: 'true', score: '3.14' });
  });

  it('returns empty object for malformed JSON', () => {
    const input = '{ invalid json }';
    const result = parseJsonResponse(input);
    
    expect(result).toEqual({});
  });

  it('returns empty object for empty string', () => {
    const result = parseJsonResponse('');
    
    expect(result).toEqual({});
  });

  it('handles whitespace around JSON', () => {
    const input = '   \n  {"trimmed": "value"}  \n  ';
    const result = parseJsonResponse(input);
    
    expect(result).toEqual({ trimmed: 'value' });
  });
});

describe('isValidJson', () => {
  it('returns true for valid JSON object', () => {
    expect(isValidJson('{"key": "value"}')).toBe(true);
  });

  it('returns true for valid JSON array', () => {
    expect(isValidJson('[1, 2, 3]')).toBe(true);
  });

  it('returns false for invalid JSON', () => {
    expect(isValidJson('not json')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidJson('')).toBe(false);
  });
});
