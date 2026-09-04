import { describe, it, expect } from 'vitest';
import {
  buildFieldPrompt,
  buildExtractionPrompt,
  buildFormSchema,
  SYSTEM_PROMPTS,
} from '../../lib/prompt/build';
import type { FieldInfo } from '../../lib/core/types';

// Prompt building works on FieldInfo alone; no live DOM reads.
const mockElement = {} as HTMLElement;

function field(partial: Partial<FieldInfo> & { key: string }): FieldInfo {
  return { element: mockElement, type: 'text', ...partial };
}

describe('buildFieldPrompt', () => {
  it('includes field label in prompt', () => {
    const prompt = buildFieldPrompt(field({ key: 'fullName', label: 'Full Name' }));

    expect(prompt).toContain('Field Label: Full Name');
  });

  it('includes field type in prompt', () => {
    const prompt = buildFieldPrompt(field({ key: 'userEmail', type: 'email', name: 'userEmail' }));

    expect(prompt).toContain('Field Type: email');
  });

  it('includes placeholder when present', () => {
    const prompt = buildFieldPrompt(field({ key: 'name', placeholder: 'Enter your name' }));

    expect(prompt).toContain('Placeholder: Enter your name');
  });

  it('includes additional context when provided', () => {
    const prompt = buildFieldPrompt(
      field({ key: 'bio', type: 'textarea', label: 'Bio' }),
      'Make it professional',
    );

    expect(prompt).toContain('Additional Context: Make it professional');
  });

  it('generates checkbox-specific prompt', () => {
    const prompt = buildFieldPrompt(field({ key: 'newsletter', type: 'checkbox' }));

    expect(prompt).toContain('true');
    expect(prompt).toContain('false');
  });
});

describe('buildExtractionPrompt', () => {
  it('lists all field keys in prompt', () => {
    const fields = [
      field({ key: 'firstName', name: 'firstName' }),
      field({ key: 'email', type: 'email', name: 'email' }),
    ];

    const prompt = buildExtractionPrompt(fields, 'John Doe, john@example.com');

    expect(prompt).toContain('firstName');
    expect(prompt).toContain('email');
  });

  it('uses the field key even for unnamed fields', () => {
    const prompt = buildExtractionPrompt([field({ key: 'field_1' })], 'text');

    expect(prompt).toContain('- field_1 (type: text)');
  });

  it('includes field types and date format hints', () => {
    const prompt = buildExtractionPrompt(
      [field({ key: 'birthDate', type: 'date', name: 'birthDate' })],
      'Born on 1990-01-15',
    );

    expect(prompt).toContain('type: date');
    expect(prompt).toContain('Format: YYYY-MM-DD');
  });

  it('lists option values from FieldInfo without touching the DOM', () => {
    const prompt = buildExtractionPrompt(
      [
        field({
          key: 'gender',
          type: 'select',
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ],
        }),
      ],
      'text',
    );

    expect(prompt).toContain('"male" (Male)');
    expect(prompt).toContain('"female" (Female)');
    expect(prompt).toContain('exactly');
  });

  it('marks multi-value fields', () => {
    const prompt = buildExtractionPrompt(
      [
        field({
          key: 'interests',
          type: 'checkbox',
          multiple: true,
          options: [{ value: 'tech', label: 'Technology' }],
        }),
      ],
      'text',
    );

    expect(prompt).toContain('multiple values allowed');
  });

  it('includes unstructured text and requests JSON output', () => {
    const text = 'My name is Alice and I work at Acme Corp';
    const prompt = buildExtractionPrompt([field({ key: 'name', name: 'name' })], text);

    expect(prompt).toContain(text);
    expect(prompt).toContain('JSON');
  });
});

describe('SYSTEM_PROMPTS', () => {
  it('has FIELD_FILL prompt defined', () => {
    expect(SYSTEM_PROMPTS.FIELD_FILL).toBeDefined();
    expect(typeof SYSTEM_PROMPTS.FIELD_FILL).toBe('string');
  });

  it('has EXTRACT prompt defined and requesting JSON', () => {
    expect(SYSTEM_PROMPTS.EXTRACT).toBeDefined();
    expect(SYSTEM_PROMPTS.EXTRACT).toContain('JSON');
  });
});

describe('buildFormSchema', () => {
  it('keys properties by field key', () => {
    const schema = buildFormSchema([field({ key: 'email_2', name: 'email' })]);

    expect((schema.properties as Record<string, unknown>)['email_2']).toEqual({ type: 'string' });
  });

  it('adds enum values for select/radio fields', () => {
    const schema = buildFormSchema([
      field({
        key: 'gender',
        type: 'radio',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ],
      }),
    ]);

    expect((schema.properties as Record<string, unknown>)['gender']).toEqual({
      type: 'string',
      enum: ['male', 'female'],
    });
  });

  it('uses an array schema with enum items for multi-value fields', () => {
    const schema = buildFormSchema([
      field({
        key: 'interests',
        type: 'checkbox',
        multiple: true,
        options: [
          { value: 'tech', label: 'Technology' },
          { value: 'music', label: 'Music' },
        ],
      }),
    ]);

    expect((schema.properties as Record<string, unknown>)['interests']).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['tech', 'music'] },
    });
  });

  it('maps primitive field types', () => {
    const schema = buildFormSchema([
      field({ key: 'age', type: 'number' }),
      field({ key: 'newsletter', type: 'checkbox' }),
      field({ key: 'birthDate', type: 'date' }),
    ]);
    const properties = schema.properties as Record<string, Record<string, unknown>>;

    expect(properties.age).toEqual({ type: 'number' });
    expect(properties.newsletter).toEqual({ type: 'boolean' });
    expect(properties.birthDate).toEqual({ type: 'string', format: 'date' });
  });

  it('is a non-strict object schema (no required, no extra properties)', () => {
    const schema = buildFormSchema([field({ key: 'name' })]);

    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toBeUndefined();
  });
});
