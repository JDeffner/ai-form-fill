import { describe, it, expect } from 'vitest';
import { parseModelResponse, isValidJson } from '../../lib/prompt/parse-response';
import { ResponseParseError } from '../../lib/core/errors';

describe('parseModelResponse', () => {
  it('parses valid JSON object', () => {
    const input = '{"name": "John", "email": "john@example.com"}';
    const result = parseModelResponse(input);

    expect(result).toEqual({ name: 'John', email: 'john@example.com' });
  });

  it('handles JSON wrapped in markdown code blocks', () => {
    const input = '```json\n{"firstName": "Jane", "age": "25"}\n```';
    const result = parseModelResponse(input);

    expect(result).toEqual({ firstName: 'Jane', age: '25' });
  });

  it('handles plain markdown code blocks without language specifier', () => {
    const input = '```\n{"city": "Berlin"}\n```';
    const result = parseModelResponse(input);

    expect(result).toEqual({ city: 'Berlin' });
  });

  it('preserves JSON value types instead of flattening to strings', () => {
    const input = '{"count": 42, "active": true, "score": 3.14, "tags": ["a", "b"]}';
    const result = parseModelResponse(input);

    expect(result).toEqual({ count: 42, active: true, score: 3.14, tags: ['a', 'b'] });
  });

  it('throws ResponseParseError for malformed JSON, carrying the raw output', () => {
    const input = '{ invalid json }';

    expect(() => parseModelResponse(input)).toThrow(ResponseParseError);
    try {
      parseModelResponse(input);
    } catch (error) {
      expect((error as ResponseParseError).raw).toBe(input);
    }
  });

  it('throws ResponseParseError for an empty string', () => {
    expect(() => parseModelResponse('')).toThrow(ResponseParseError);
  });

  it('throws ResponseParseError for non-object JSON (arrays, scalars)', () => {
    expect(() => parseModelResponse('[1, 2, 3]')).toThrow(ResponseParseError);
    expect(() => parseModelResponse('"just a string"')).toThrow(ResponseParseError);
    expect(() => parseModelResponse('null')).toThrow(ResponseParseError);
  });

  it('handles whitespace around JSON', () => {
    const input = '   \n  {"trimmed": "value"}  \n  ';
    const result = parseModelResponse(input);

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
