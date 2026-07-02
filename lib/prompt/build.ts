/**
 * Helpers for building the prompts and JSON schema sent to providers.
 */

import type { FieldInfo } from '../core/types';

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
  if (field.options?.length) {
    prompt += `Allowed values: ${field.options.map((option) => option.value).join(', ')}\n`;
  }
  if (context) prompt += `\nAdditional Context: ${context}\n`;

  if (field.type === 'checkbox') {
    prompt += '\nReturn only "true" or "false" for this checkbox, no explanations.';
  } else {
    prompt +=
      '\nProvide a realistic and appropriate value for this field. Only return the value itself, no explanations.';
  }

  return prompt;
}

/** Describe a field's options as `value ("label")` pairs for the prompt. */
function describeOptions(field: FieldInfo): string {
  const options = field.options ?? [];
  const rendered = options
    .map((option) =>
      option.label && option.label !== option.value
        ? `"${option.value}" (${option.label})`
        : `"${option.value}"`,
    )
    .join(', ');
  return ` - Allowed values: [${rendered}] (return the value exactly as written)`;
}

/**
 * Build a prompt that asks the AI to extract data from unstructured text and
 * map it onto the given form fields, returning a JSON object keyed by
 * {@link FieldInfo.key}.
 */
export function buildExtractionPrompt(fields: FieldInfo[], unstructuredText: string): string {
  let prompt =
    'Extract structured data from the following unstructured text and match it to the form fields.\n\n';
  prompt += 'Form fields:\n';

  for (const field of fields) {
    const typeText = field.multiple ? `${field.type}, multiple values allowed` : field.type;
    prompt += `- ${field.key} (type: ${typeText})`;
    if (field.label) prompt += ` - Label: "${field.label}"`;
    if (field.placeholder) prompt += ` - Placeholder: "${field.placeholder}"`;
    if (field.options?.length) prompt += describeOptions(field);
    if (field.type === 'date') prompt += ' - Format: YYYY-MM-DD';
    else if (field.type === 'datetime-local') prompt += ' - Format: YYYY-MM-DDTHH:MM';
    else if (field.type === 'time') prompt += ' - Format: HH:MM (24h)';
    else if (field.type === 'month') prompt += ' - Format: YYYY-MM';
    else if (field.type === 'week') prompt += ' - Format: YYYY-Www';
    if (field.hint) prompt += ` - Additional info: ${field.hint}`;
    prompt += '\n';
  }

  prompt += `\nUnstructured text:\n${unstructuredText}\n\n`;
  prompt +=
    'Extract the relevant information and return it as a JSON object whose keys match the field keys exactly.\n' +
    'Only include fields where you found relevant data.\n' +
    'For checkbox fields, return true if the text indicates the option should be checked, false or omit otherwise.\n' +
    'For fields with allowed values, return one of the allowed values exactly as written.\n' +
    'For fields that allow multiple values, return an array of allowed values.\n' +
    'Dates and times must use the stated ISO format.\n' +
    'Return ONLY the JSON object, no explanations or markdown formatting.\n';

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
  EXTRACT:
    'You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If a field is a checkbox, return true if it should be checked, otherwise return false or omit the field.',
} as const;

/**
 * Build a JSON Schema from form fields for structured AI output. Property
 * names are the fields' {@link FieldInfo.key | keys} so they line up with the
 * fill step; option-based fields carry `enum` so structured-output providers
 * return exact option values.
 *
 * The schema is intentionally non-strict (no `required`): extraction is
 * optional per field.
 */
export function buildFormSchema(fields: FieldInfo[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const field of fields) {
    const optionValues = field.options?.map((option) => option.value) ?? [];

    let schema: Record<string, unknown>;
    if (field.multiple && optionValues.length > 0) {
      schema = { type: 'array', items: { type: 'string', enum: optionValues } };
    } else if (optionValues.length > 0) {
      schema = { type: 'string', enum: optionValues };
    } else {
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
        // Date/time fields use regex patterns matching exactly what the HTML
        // inputs accept. JSON-schema `format: 'time'`/`'date-time'` would be
        // wrong here: providers that enforce formats (e.g. Ollama) generate
        // RFC 3339 values with seconds and UTC offset, which date/time inputs
        // reject. `[0-9]` instead of `\d` because grammar-based enforcers
        // (llama.cpp) only support a regex subset.
        case 'date':
          schema = { type: 'string', format: 'date' };
          break;
        case 'datetime-local':
          schema = {
            type: 'string',
            pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$',
          };
          break;
        case 'time':
          schema = { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' };
          break;
        case 'month':
          schema = { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' };
          break;
        case 'week':
          schema = { type: 'string', pattern: '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$' };
          break;
        default:
          schema = { type: 'string' };
          break;
      }
    }

    if (field.pattern) schema.pattern = field.pattern;

    if (field.placeholder || field.hint) {
      schema.description = [field.placeholder, field.hint].filter(Boolean).join(' - ');
    }

    properties[field.key] = schema;
  }

  return { type: 'object', properties, additionalProperties: false };
}
