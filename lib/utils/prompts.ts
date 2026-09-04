/**
 * Utility functions for building AI prompts
 */

import type { FieldInfo } from '../core/types';

/**
 * Build a prompt for filling a single form field
 * 
 * Constructs a detailed prompt that describes the field's purpose, type,
 * validation rules, and any additional context. Used by fillSingleField().
 * 
 * @param field - The FieldInfo object describing the field
 * @param context - Optional additional context or instructions for the AI
 * @returns A formatted prompt string ready for the AI
 * 
 * @example
 * ```typescript
 * const field = {
 *   label: 'Professional Bio',
 *   type: 'textarea',
 *   placeholder: 'Tell us about yourself...',
 *   required: true
 * };
 * 
 * const prompt = buildFieldPrompt(field, 'Make it friendly and professional');
 * // Returns detailed prompt including label, type, requirements, and context
 * ```
 */
export function buildFieldPrompt(field: FieldInfo, context?: string): string {
  let prompt = 'Generate appropriate content for the following form field:\n\n';

  if (field.label) {
    prompt += `Field Label: ${field.label}\n`;
  }

  if (field.name) {
    prompt += `Field Name: ${field.name}\n`;
  }

  prompt += `Field Type: ${field.type}\n`;

  if (field.placeholder) {
    prompt += `Placeholder: ${field.placeholder}\n`;
  }

  if (field.pattern) {
    prompt += `Pattern/Format: ${field.pattern}\n`;
  }

  if (context) {
    prompt += `\nAdditional Context: ${context}\n`;
  }

  if (field.type === 'checkbox') {
    prompt = `${context}\nRandomly return "true" or "false", no explanations. Dont repeat your choice too often.`;
  } else {
    prompt += '\nProvide a realistic and appropriate value for this field. Only return the value itself, no explanations.';
  }

  return prompt;
}

/**
 * Builds a prompt for AI to extract data from unstructured text into form fields.
 */
export function buildParsePrompt(
  clientFieldInfos: FieldInfo[],
  unstructuredText: string
): string {
  let prompt = 'Extract structured data from the following unstructured text and match it to the form fields.\n\n';
  prompt += 'Form fields:\n';

  for (const field of clientFieldInfos) {
    const fieldName = field.name || field.label || field.placeholder || 'unknown';
    prompt += `- ${fieldName} (type: ${field.type})`;
    if (field.label) prompt += ` - Label: "${field.label}"`;
    if (field.placeholder) prompt += ` - Placeholder: "${field.placeholder}"`;
    if (field.type === 'select' && field.element instanceof HTMLSelectElement) {
      const options = Array.from(field.element.options).map(opt => opt.textContent?.trim() || '').filter(opt => opt);
      prompt += ` - Options: [${options.join(', ')}]`;
    }
    // Include radio button options
    if (field.type === 'radio' && field.options) {
      const optionLabels = field.options.map(opt => opt.label || opt.value);
      prompt += ` - Options: [${optionLabels.join(', ')}]`;
    }
    // Add format hints for date/time fields
    if (field.type === 'date') {
      prompt += ' - Format: YYYY-MM-DD';
    } else if (field.type === 'datetime-local') {
      prompt += ' - Format: YYYY-MM-DDTHH:MM';
    } else if (field.type === 'time') {
      prompt += ' - Format: HH:MM';
    }
    if (field.hint) prompt += ` - Additional info: ${field.hint}`;
    prompt += '\n';
  }

  prompt += `\nUnstructured text:\n${unstructuredText}\n\n
    Extract the relevant information and return it as a JSON object where keys match the field names exactly.
    \n
    Only include fields where you found relevant data.
    \n
    For checkbox fields, return "true" if the text indicates the option should be checked, "false" or omit otherwise.
    \n
    For radio fields, return the value (preferred) or label of the selected option.
    \n
    Return ONLY the JSON object, no explanations or markdown formatting.
  `;

  return prompt;
}

/**
 * System prompts for different AI tasks
 * 
 * Predefined system messages that set the AI's behavior for specific tasks.
 * These are sent as the first message in every conversation to establish
 * the AI's role and response format.
 * 
 * @property FIELD_FILL - For single field generation tasks
 *   - Instructs AI to return only the value, no explanations
 *   - Used by fillSingleField()
 * 
 * @property PARSE_EXTRACT - For data extraction from unstructured text
 *   - Instructs AI to return only valid JSON
 *   - Prevents markdown code blocks and explanations
 *   - Used by parseAndFillForm()
 * 
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'system', content: SYSTEM_PROMPTS.PARSE_EXTRACT },
 *   { role: 'user', content: userPrompt }
 * ];
 * ```
 */
export const SYSTEM_PROMPTS = {
  FIELD_FILL: 'You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.',
  
  PARSE_EXTRACT: 'You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If its a checkbox field, return "true" if it should be checked, otherwise return "false" or omit the field.',
} as const;

/**
 * Generates a JSON Schema from form fields for structured AI output.
 */
export function generateFormSchema(fields: FieldInfo[]): Record<string, any> {
  const properties: Record<string, any> = {};

  for (const fieldElement of fields) {
    const fieldName = fieldElement.name || fieldElement.label;
    if (!fieldName) continue;

    let schema: Record<string, any>;
    
    switch (fieldElement.type) {
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

    if (fieldElement.pattern) {
      schema.pattern = fieldElement.pattern;
    }

    if (fieldElement.placeholder || fieldElement.hint) {
      const parts = [] as string[];
      if (fieldElement.placeholder) parts.push(fieldElement.placeholder);
      if (fieldElement.hint) parts.push(fieldElement.hint);
      schema.description = parts.join(' - ');
    }

    properties[fieldName] = schema;
  }

  return {
    type: 'object',
    properties,
    additionalProperties: false,
  };
}
