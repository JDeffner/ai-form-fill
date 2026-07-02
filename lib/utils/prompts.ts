/**
 * Helpers for building the prompts and JSON schema sent to providers.
 */

import type { FieldInfo } from '../core/types';
import { getFieldIdentifier } from './fieldUtils';

/**
 * Build a prompt for generating content for a single field, based on its label,
 * name, type, placeholder and pattern.
 *
 * @param field - The field to describe.
 * @param context - Optional extra instructions for the AI.
 */
export function buildFieldPrompt(field: FieldInfo, context?: string): string {
  let prompt = 'Generate appropriate content for the following form field:\n\n';

  if (field.label) prompt += `Field Label: ${field.label}\n`;
  if (field.name) prompt += `Field Name: ${field.name}\n`;
  prompt += `Field Type: ${field.type}\n`;
  if (field.placeholder) prompt += `Placeholder: ${field.placeholder}\n`;
  if (field.pattern) prompt += `Pattern/Format: ${field.pattern}\n`;
  if (context) prompt += `\nAdditional Context: ${context}\n`;

  if (field.type === 'checkbox') {
    prompt += '\nReturn only "true" or "false" for this checkbox, no explanations.';
  } else {
    prompt +=
      '\nProvide a realistic and appropriate value for this field. Only return the value itself, no explanations.';
  }

  return prompt;
}

/**
 * Build a prompt that asks the AI to extract data from unstructured text and map
 * it onto the given form fields, returning a JSON object keyed by field name.
 */
export function buildParsePrompt(clientFieldInfos: FieldInfo[], unstructuredText: string): string {
  let prompt =
    'Extract structured data from the following unstructured text and match it to the form fields.\n\n';
  prompt += 'Form fields:\n';

  for (const field of clientFieldInfos) {
    prompt += `- ${getFieldIdentifier(field)} (type: ${field.type})`;
    if (field.label) prompt += ` - Label: "${field.label}"`;
    if (field.placeholder) prompt += ` - Placeholder: "${field.placeholder}"`;
    if (field.type === 'select' && field.element instanceof HTMLSelectElement) {
      const options = Array.from(field.element.options)
        .map((opt) => opt.textContent?.trim() || '')
        .filter((opt) => opt);
      prompt += ` - Options: [${options.join(', ')}]`;
    }
    if (field.type === 'radio' && field.options) {
      const optionLabels = field.options.map((opt) => opt.label || opt.value);
      prompt += ` - Options: [${optionLabels.join(', ')}]`;
    }
    if (field.type === 'date') prompt += ' - Format: YYYY-MM-DD';
    else if (field.type === 'datetime-local') prompt += ' - Format: YYYY-MM-DDTHH:MM';
    else if (field.type === 'time') prompt += ' - Format: HH:MM';
    if (field.hint) prompt += ` - Additional info: ${field.hint}`;
    prompt += '\n';
  }

  prompt += `\nUnstructured text:\n${unstructuredText}\n\n
    Extract the relevant information and return it as a JSON object where keys match the field names exactly.
    Only include fields where you found relevant data.
    For checkbox fields, return "true" if the text indicates the option should be checked, "false" or omit otherwise.
    For radio fields, return the value (preferred) or label of the selected option.
    Return ONLY the JSON object, no explanations or markdown formatting.
  `;

  return prompt;
}

/**
 * System prompts that set the AI's behaviour for each task.
 */
export const SYSTEM_PROMPTS = {
  /** Single-field generation: return only the value. */
  FIELD_FILL:
    'You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.',
  /** Data extraction: return only valid JSON. */
  PARSE_EXTRACT:
    'You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If its a checkbox field, return "true" if it should be checked, otherwise return "false" or omit the field.',
} as const;

/**
 * Build a JSON Schema from form fields for structured AI output. Keys match
 * {@link getFieldIdentifier} so they line up with the fill step.
 */
export function generateFormSchema(fields: FieldInfo[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const field of fields) {
    const fieldName = getFieldIdentifier(field);
    if (!fieldName || fieldName === 'unknown') continue;

    let schema: Record<string, unknown>;
    switch (field.type) {
      case 'number':
      case 'range':
        schema = { type: 'number' };
        break;
      case 'boolean':
      case 'checkbox':
        schema = { type: 'boolean' };
        break;
      case 'url':
        schema = { type: 'string', format: 'uri' };
        break;
      case 'date':
        schema = { type: 'string', format: 'date' };
        break;
      case 'datetime-local':
        schema = { type: 'string', format: 'date-time' };
        break;
      case 'time':
        schema = { type: 'string', format: 'time' };
        break;
      default:
        schema = { type: 'string' };
        break;
    }

    if (field.pattern) schema.pattern = field.pattern;

    if (field.placeholder || field.hint) {
      schema.description = [field.placeholder, field.hint].filter(Boolean).join(' - ');
    }

    properties[fieldName] = schema;
  }

  return { type: 'object', properties, additionalProperties: false };
}
