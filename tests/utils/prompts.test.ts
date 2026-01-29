import { describe, it, expect } from 'vitest';
import { buildFieldPrompt, buildParsePrompt, SYSTEM_PROMPTS } from '../../lib/utils/prompts';
import type { FieldInfo } from '../../lib/core/types';

// Mock HTMLElement for tests
const mockElement = {} as HTMLElement;

describe('buildFieldPrompt', () => {
  it('includes field label in prompt', () => {
    const field: FieldInfo = {
      element: mockElement,
      type: 'text',
      label: 'Full Name',
    };
    
    const prompt = buildFieldPrompt(field);
    
    expect(prompt).toContain('Field Label: Full Name');
  });

  it('includes field type in prompt', () => {
    const field: FieldInfo = {
      element: mockElement,
      type: 'email',
      name: 'userEmail',
    };
    
    const prompt = buildFieldPrompt(field);
    
    expect(prompt).toContain('Field Type: email');
  });

  it('includes placeholder when present', () => {
    const field: FieldInfo = {
      element: mockElement,
      type: 'text',
      placeholder: 'Enter your name',
    };
    
    const prompt = buildFieldPrompt(field);
    
    expect(prompt).toContain('Placeholder: Enter your name');
  });

  it('includes additional context when provided', () => {
    const field: FieldInfo = {
      element: mockElement,
      type: 'textarea',
      label: 'Bio',
    };
    
    const prompt = buildFieldPrompt(field, 'Make it professional');
    
    expect(prompt).toContain('Additional Context: Make it professional');
  });

  it('generates checkbox-specific prompt', () => {
    const field: FieldInfo = {
      element: mockElement,
      type: 'checkbox',
      name: 'newsletter',
    };
    
    const prompt = buildFieldPrompt(field, 'Subscribe to newsletter');
    
    expect(prompt).toContain('true');
    expect(prompt).toContain('false');
  });
});

describe('buildParsePrompt', () => {
  it('lists all field names in prompt', () => {
    const fields: FieldInfo[] = [
      { element: mockElement, type: 'text', name: 'firstName' },
      { element: mockElement, type: 'email', name: 'email' },
    ];
    
    const prompt = buildParsePrompt(fields, 'John Doe, john@example.com');
    
    expect(prompt).toContain('firstName');
    expect(prompt).toContain('email');
  });

  it('includes field types in prompt', () => {
    const fields: FieldInfo[] = [
      { element: mockElement, type: 'date', name: 'birthDate' },
    ];
    
    const prompt = buildParsePrompt(fields, 'Born on 1990-01-15');
    
    expect(prompt).toContain('type: date');
    expect(prompt).toContain('Format: YYYY-MM-DD');
  });

  it('includes unstructured text in prompt', () => {
    const fields: FieldInfo[] = [
      { element: mockElement, type: 'text', name: 'name' },
    ];
    const text = 'My name is Alice and I work at Acme Corp';
    
    const prompt = buildParsePrompt(fields, text);
    
    expect(prompt).toContain(text);
  });

  it('requests JSON output format', () => {
    const fields: FieldInfo[] = [
      { element: mockElement, type: 'text', name: 'field1' },
    ];
    
    const prompt = buildParsePrompt(fields, 'test');
    
    expect(prompt).toContain('JSON');
  });
});

describe('SYSTEM_PROMPTS', () => {
  it('has FIELD_FILL prompt defined', () => {
    expect(SYSTEM_PROMPTS.FIELD_FILL).toBeDefined();
    expect(typeof SYSTEM_PROMPTS.FIELD_FILL).toBe('string');
  });

  it('has PARSE_EXTRACT prompt defined', () => {
    expect(SYSTEM_PROMPTS.PARSE_EXTRACT).toBeDefined();
    expect(SYSTEM_PROMPTS.PARSE_EXTRACT).toContain('JSON');
  });
});
