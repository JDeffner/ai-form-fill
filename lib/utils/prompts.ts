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

  // if (field.required) {
  //   prompt += 'This field is required.\n';
  // }

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
 * Build a prompt for parsing unstructured text and extracting field data
 * 
 * Creates a comprehensive prompt that lists all form fields with their metadata,
 * provides the unstructured text, and instructs the AI to extract matching data
 * as JSON. Used by parseAndFillForm().
 * 
 * @param clientFieldInfos - Array of FieldInfo objects for all target fields
 * @param unstructuredText - The source text to extract data from
 * @returns A formatted prompt string that requests JSON extraction
 * 
 * @remarks
 * The AI is instructed to:
 * - Match field names exactly
 * - Return valid JSON only (no markdown)
 * - Include only fields where data was found
 * - Use field labels and placeholders as context clues
 * 
 * @example
 * ```typescript
 * const fields = getFillTargets(form);
 * const text = 'John Doe, john@example.com, (555) 123-4567';
 * const prompt = buildParsePrompt(fields, text);
 * // Returns prompt with field list + extraction instructions
 * ```
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
    // if (field.required) prompt += ' - REQUIRED';
    prompt += '\n';
  }

  prompt += `\nUnstructured text:\n${unstructuredText}\n\n
    Extract the relevant information and return it as a JSON object where keys match the field names exactly.
    \n
    Only include fields where you found relevant data.
    \n
    For checkbox fields, return "true" if the text indicates the option should be checked, "false" or omit otherwise.
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
