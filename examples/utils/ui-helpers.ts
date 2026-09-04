/**
 * UI Helper Functions for Examples
 * 
 * Shared utilities for status messages, logging, and UI interactions
 */

/**
 * Display a status message with appropriate styling
 */
export function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Log a result message to the results panel with timestamp
 */
export function logResult(message: string) {
  const resultsEl = document.getElementById('results');
  if (!resultsEl) return;
  
  const timestamp = new Date().toLocaleTimeString();
  resultsEl.innerHTML += `<div class="log-entry">[${timestamp}] ${message}</div>`;
  resultsEl.scrollTop = resultsEl.scrollHeight;
}

/**
 * Clear all form fields
 */
export function clearForm(form: HTMLFormElement) {
  form.reset();
  showStatus('Form cleared', 'info');
  logResult('🗑️ Form cleared');
}
