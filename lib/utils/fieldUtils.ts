/**
 * Utility functions for working with form fields
 */

import type { FieldInfo } from '../core/types';
import { affConfig } from '../core/config';

/**
 * Values that indicate an empty or invalid AI response.
 * If the AI returns one of these, the field should not be filled.
 */
const EMPTY_VALUE_INDICATORS = [
  'null', '', 'n/a', 'none', 'no value', 'empty', 'undefined', 'unknown', 'missing'
] as const;

/**
 * Values that indicate a truthy/checked state for checkboxes.
 */
const TRUTHY_VALUES = ['true', 'yes', '1', 'checked', 'on'] as const;

/** Dispatches input and change events to trigger framework reactivity. */
function dispatchFieldEvents(element: HTMLElement): void {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Returns true if the value indicates an empty/invalid AI response. */
function isEmptyValue(normalizedValue: string): boolean {
  return EMPTY_VALUE_INDICATORS.includes(normalizedValue as typeof EMPTY_VALUE_INDICATORS[number]);
}

/** Gets the label text for a radio button. */
function getRadioLabel(radio: HTMLInputElement): string {
  if (radio.id) {
    const labelElement = document.querySelector(`label[for="${radio.id}"]`);
    if (labelElement) {
      return labelElement.textContent?.trim() || '';
    }
  }
  const parentLabel = radio.closest('label');
  if (parentLabel) {
    return parentLabel.textContent?.trim() || '';
  }
  return '';
}

/**
 * Format a date value for different HTML date/time input types
 * 
 * Parses various date formats and converts them to the format
 * required by HTML date inputs (YYYY-MM-DD, etc.)
 * 
 * @param value - The date string to parse
 * @param inputType - The type of date input (date, datetime-local, time, month, week)
 * @returns Formatted date string or null if parsing failed
 */
function formatDateValue(value: string, inputType: string): string | null {
  // Try to parse the date
  let date: Date | null = null;
  
  // Handle various date formats
  const trimmedValue = value.trim();
  
  // Try ISO format first (most reliable)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmedValue)) {
    date = new Date(trimmedValue);
  }
  // Try common formats: MM/DD/YYYY, DD/MM/YYYY, DD.MM.YYYY
  else if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(trimmedValue)) {
    const parts = trimmedValue.split(/[\/.-]/);
    // Assume MM/DD/YYYY for US format (most common in forms)
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    date = new Date(year, month - 1, day);
  }
  // Try natural language parsing as fallback
  else {
    const parsed = Date.parse(trimmedValue);
    if (!isNaN(parsed)) {
      date = new Date(parsed);
    }
  }
  
  // Handle time-only inputs
  if (inputType === 'time') {
    // Try to extract time from the value
    const timeMatch = trimmedValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const ampm = timeMatch[4]?.toLowerCase();
      
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return null;
  }
  
  if (!date || isNaN(date.getTime())) {
    return null;
  }
  
  // Format based on input type
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  switch (inputType) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'datetime-local':
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    case 'month':
      return `${year}-${month}`;
    case 'week':
      // Calculate ISO week number
      const startOfYear = new Date(year, 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Extracts metadata from a form field element (type, name, label, placeholder, etc.).
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
    fieldInfo.pattern = element.pattern;
    
    // For checkboxes, include the value attribute as context
    if (element.type === 'checkbox') {
      fieldInfo.placeholder = element.value || 'checkbox option';
    }
    
    // For radio buttons, most details will be collected in getFillTargets
    if (element.type === 'radio') {
      fieldInfo.placeholder = element.value || 'radio option';
    }
  } else if (element instanceof HTMLTextAreaElement) {
    fieldInfo.type = 'textarea';
    fieldInfo.name = element.name;
    fieldInfo.placeholder = element.placeholder;
  } else if (element instanceof HTMLSelectElement) {
    fieldInfo.type = 'select';
    fieldInfo.name = element.name;
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

  const hint = element.dataset.affHint;
  if (hint) {
    fieldInfo.hint = hint;
  }

  return fieldInfo;
}

/**
 * Returns all fillable fields from a form (inputs, textareas, selects).
 * Radio buttons are grouped by name into a single FieldInfo with options.
 */
export function getFillTargets(formElement: HTMLFormElement): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const radioGroups: Map<string, HTMLInputElement[]> = new Map();
  
  // https://www.w3schools.com/html/html_form_input_types.asp
  const elements = formElement.querySelectorAll(
    'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]):not([type="image"]):not([type="file"]), textarea, select'
  );

  elements.forEach((element) => {
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      // Group radio buttons by name
      const name = element.name;
      if (name) {
        if (!radioGroups.has(name)) {
          radioGroups.set(name, []);
        }
        radioGroups.get(name)!.push(element);
      }
    } else if (element instanceof HTMLElement) {
      fields.push(analyzeField(element));
    }
  });

  // Process radio button groups
  for (const [_name, radioGroup] of radioGroups.entries()) {
    if (radioGroup.length === 0) continue;
    
    // first radio serves as representative element
    const firstRadio = radioGroup[0];
    const fieldInfo = analyzeField(firstRadio);
    
    fieldInfo.options = radioGroup.map(radio => {
      let label = '';
      if (radio.id) {
        const labelElement = document.querySelector(`label[for="${radio.id}"]`);
        if (labelElement) {
          label = labelElement.textContent?.trim() || '';
        }
      }
      if (!label) {
        const parentLabel = radio.closest('label');
        if (parentLabel) {
          label = parentLabel.textContent?.trim() || '';
        }
      }
      return {
        value: radio.value,
        label: label || radio.value
      };
    });
    
    for (const radio of radioGroup) {
      const hint = radio.dataset.affHint;
      if (hint) {
        fieldInfo.hint += ' ' + hint ;
      }
    }
    
    fields.push(fieldInfo);
  };

  return fields;
}

/** Sets a checkbox value based on the AI response. */
function setCheckboxValue(element: HTMLInputElement, normalizedValue: string): void {
  const shouldCheck = TRUTHY_VALUES.includes(normalizedValue as typeof TRUTHY_VALUES[number]);
  element.checked = shouldCheck;
  dispatchFieldEvents(element);
}

/** Finds and checks the matching radio button in a group. */
function setRadioValue(element: HTMLInputElement, normalizedValue: string): void {
  const form = element.closest('form');
  if (!form || !element.name) return;
  
  const radios = form.querySelectorAll<HTMLInputElement>(
    `input[type="radio"][name="${element.name}"]`
  );
  
  for (const radio of radios) {
    const radioLabel = getRadioLabel(radio).toLowerCase();
    const radioValue = radio.value.toLowerCase();
    
    if (radioValue === normalizedValue ||
        radioLabel === normalizedValue ||
        radioValue.includes(normalizedValue) ||
        radioLabel.includes(normalizedValue) ||
        normalizedValue.includes(radioValue) ||
        normalizedValue.includes(radioLabel)) {
      radio.checked = true;
      dispatchFieldEvents(radio);
      break;
    }
  }
}

/** Sets a date/time input value, parsing various formats. */
function setDateValue(element: HTMLInputElement, value: string): void {
  const formattedValue = formatDateValue(value, element.type);
  if (formattedValue) {
    element.value = formattedValue;
    dispatchFieldEvents(element);
  } else if (affConfig.formFillDebug) {
    console.warn(`Could not parse date value "${value}" for ${element.type} input`);
  }
}

/** Sets a select element value, matching by value or display text. */
function setSelectValue(element: HTMLSelectElement, normalizedValue: string, originalValue: string): void {
  let option = Array.from(element.options).find(
    (opt) => opt.value.toLowerCase() === normalizedValue || 
             opt.text.toLowerCase() === normalizedValue
  );
  
  if (!option) {
    option = Array.from(element.options).find(
      (opt) => opt.value.toLowerCase().includes(normalizedValue) || 
               opt.text.toLowerCase().includes(normalizedValue) ||
               normalizedValue.includes(opt.value.toLowerCase()) ||
               normalizedValue.includes(opt.text.toLowerCase())
    );
  }
  
  if (option) {
    element.value = option.value;
    dispatchFieldEvents(element);
  } else if (affConfig.formFillDebug) {
    console.warn(
      `No matching option for select. Value: "${originalValue}", Options:`,
      Array.from(element.options).map(opt => `${opt.value} (${opt.text})`)
    );
  }
}

/**
 * Sets the value of a form field and triggers change events for framework reactivity.
 */
export function setFieldValue(element: HTMLElement, value: string): void {
  const normalizedValue = value.trim().toLowerCase();
  
  if (isEmptyValue(normalizedValue)) return;
  
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      case 'checkbox':
        setCheckboxValue(element, normalizedValue);
        break;
      case 'radio':
        setRadioValue(element, normalizedValue);
        break;
      case 'date':
      case 'datetime-local':
      case 'time':
        setDateValue(element, value);
        break;
      default:
        element.value = value;
        dispatchFieldEvents(element);
    }
  } else if (element instanceof HTMLTextAreaElement) {
    element.value = value;
    dispatchFieldEvents(element);
  } else if (element instanceof HTMLSelectElement) {
    setSelectValue(element, normalizedValue, value);
  }
}

/**
 * Returns the best identifier for a field (name > label > placeholder > 'unknown').
 */
export function getFieldIdentifier(field: FieldInfo): string {
  return field.name || field.label || field.placeholder || 'unknown';
}
