/**
 * Utility functions for working with form fields
 */

import type { FieldInfo } from '../core/types';
import { affConfig } from '../config';

/**
 * Analyze a form field to extract relevant information
 * 
 * Inspects a form element to gather all available metadata including
 * type, name, label, placeholder, validation rules, etc. This information
 * helps the AI understand what content is appropriate for the field.
 * 
 * @param element - The form field element to analyze (input, textarea, or select)
 * @returns FieldInfo object containing all extracted metadata
 * 
 * @example
 * ```ts
 * const input = document.querySelector('#email');
 * const info = analyzeField(input);
 * console.log(info);
 * // {
 * //   element: input,
 * //   type: 'email',
 * //   name: 'userEmail',
 * //   label: 'Email Address',
 * //   placeholder: 'you@example.com',
 * //   required: true,
 * //   pattern: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$'
 * // }
 * ```
 */
export function analyzeField(element: HTMLElement): FieldInfo {
  const fieldInfo: FieldInfo = {
    element,
    type: 'text',
  };

  if (element instanceof HTMLInputElement) {
    fieldInfo.type = element.type;
    fieldInfo.name = element.name;
    fieldInfo.placeholder = element.placeholder;
    fieldInfo.required = element.required;
    fieldInfo.pattern = element.pattern;
    
    // For checkboxes, include the value attribute as context
    if (element.type === 'checkbox') {
      fieldInfo.placeholder = element.value || 'checkbox option';
    }
  } else if (element instanceof HTMLTextAreaElement) {
    fieldInfo.type = 'textarea';
    fieldInfo.name = element.name;
    fieldInfo.placeholder = element.placeholder;
    fieldInfo.required = element.required;
  } else if (element instanceof HTMLSelectElement) {
    fieldInfo.type = 'select';
    fieldInfo.name = element.name;
    fieldInfo.required = element.required;
  }

  // Try to find associated label
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      fieldInfo.label = label.textContent?.trim();
    }
  }
  
  if (!fieldInfo.label) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      fieldInfo.label = parentLabel.textContent?.trim();
    }
  }

  return fieldInfo;
}

/**
 * Get all fillable fields from a form
 * 
 * Queries the form for all input, textarea, and select elements, excluding
 * buttons and submit inputs. Returns analyzed metadata for each field.
 * 
 * @param formElement - The HTML form element to scan
 * @returns Array of FieldInfo objects, one for each fillable field
 * 
 * @remarks
 * Excludes: submit buttons, reset buttons, regular buttons
 * Includes: text inputs, textareas, selects, email inputs, etc.
 * 
 * @example
 * ```ts
 * const form = document.querySelector('form');
 * const fields = getFillTargets(form);
 * console.log(`Found ${fields.length} fillable fields`);
 * 
 * fields.forEach(field => {
 *   console.log(`${field.label}: ${field.type}`);
 * });
 * ```
 */
export function getFillTargets(formElement: HTMLFormElement): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const elements = formElement.querySelectorAll(
    'input:not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select'
  );

  elements.forEach((element) => {
    if (element instanceof HTMLElement) {
      fields.push(analyzeField(element));
    }
  });

  return fields;
}

/**
 * Set the value of a form field and trigger appropriate events
 * 
 * Updates the field value and dispatches 'input' and 'change' events to
 * ensure framework reactivity (React, Vue, Angular) works correctly.
 * For select elements, attempts to match by value or display text.
 * 
 * @param element - The form field element to update
 * @param value - The value to set (string)
 * 
 * @remarks
 * Triggers events with `bubbles: true` to ensure parent listeners are notified.
 * This is crucial for framework integration and form validation libraries.
 */
export function setFieldValue(element: HTMLElement, value: string): void {
  const normalizedValue = value.trim().toLowerCase();
  // If the ai did not give a proper value, dont fill
  if (normalizedValue == 'null' ||
    normalizedValue === '' ||
    normalizedValue === 'n/a' ||
    normalizedValue === 'none' ||
    normalizedValue === 'no value' ||
    normalizedValue === 'empty' ||
    normalizedValue === 'undefined' ||
    normalizedValue === 'unknown'
  ) return;
  if (element instanceof HTMLInputElement) {
    // Handle checkbox inputs
    if (element.type === 'checkbox') {
      // Check if value indicates true/checked state
      const shouldCheck = 
      normalizedValue === 'true' || 
      normalizedValue === 'yes' || 
      normalizedValue === '1' || 
      normalizedValue === 'checked' ||
      normalizedValue === 'on';
      element.checked = shouldCheck;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Handle regular text inputs
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (element instanceof HTMLTextAreaElement) {
    element.value = value;
    // Trigger input and change events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element instanceof HTMLSelectElement) {
    
    // Try exact match first (value or text)
    let option = Array.from(element.options).find(
      (opt: HTMLOptionElement) => 
        opt.value.toLowerCase() === normalizedValue || 
        opt.text.toLowerCase() === normalizedValue
    );
    
    // If no exact match, try partial match
    if (!option) {
      option = Array.from(element.options).find(
        (opt: HTMLOptionElement) => 
          opt.value.toLowerCase().includes(normalizedValue) || 
          opt.text.toLowerCase().includes(normalizedValue) ||
          normalizedValue.includes(opt.value.toLowerCase()) ||
          normalizedValue.includes(opt.text.toLowerCase())
      );
    }
    
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      if( affConfig.defaults.debug ) {
      console.warn(`No matching option found for select element. Value: "${value}", Available options:`, 
        Array.from(element.options).map(opt => `${opt.value} (${opt.text})`));
      }
    }
  }
}

/**
 * Get field identifier for AI context and logging
 * 
 * Returns the most descriptive identifier available for a field,
 * prioritizing: name > label > placeholder > 'unknown'.
 * 
 * @param field - The FieldInfo object to extract identifier from
 * @returns The best available identifier string
 * 
 * @example
 * ```typescript
 * const field = { name: 'email', label: 'Email Address', ... };
 * console.log(getFieldIdentifier(field)); // 'email'
 * 
 * const field2 = { label: 'Phone Number', ... };
 * console.log(getFieldIdentifier(field2)); // 'Phone Number'
 * 
 * const field3 = { placeholder: 'Enter text...', ... };
 * console.log(getFieldIdentifier(field3)); // 'Enter text...'
 * ```
 */
export function getFieldIdentifier(field: FieldInfo): string {
  return field.name || field.label || field.placeholder || 'unknown';
}
