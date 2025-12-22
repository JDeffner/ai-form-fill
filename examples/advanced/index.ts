/**
 * Advanced Demo - AI Form Input Library
 * 
 * Full-featured test environment with provider selection, model configuration,
 * and comprehensive testing capabilities
 */

import { AIFormFill, AIProvider, LocalOllamaProvider, OpenAIProvider, PerplexityProvider, type AvailableProviders } from '../../lib/main';
import { showStatus, logResult, clearForm } from '../utils/ui-helpers';

// State
let aiFormFill: AIFormFill | null = null;
let selectedElement: HTMLElement | null = null;

/**
 * Provider Management
 */

async function loadProviders() {
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
  providerSelect.innerHTML = '';
  
  const providers = [
    { name: 'Local Ollama', value: 'ollama' },
    { name: 'OpenAI', value: 'openai' },
    { name: 'Perplexity', value: 'perplexity' },
  ];
  
  try {
    showStatus('Loading providers...', 'info');
    if (providers.length === 0) {
      providerSelect.innerHTML = '<option value="">No providers found</option>';
      showStatus('No providers found.', 'error');
    } else {
      providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.value;
        option.textContent = provider.name;
        providerSelect.appendChild(option);
      });
      showStatus(`Loaded ${providers.length} providers`, 'success');
      logResult(`✅ Found ${providers.length} providers: ${providers.map(p => p.name).join(', ')}`);
    }
  } catch (error) {
    console.error('Error loading providers:', error);
    providerSelect.innerHTML = '<option value="">Error loading providers</option>';
    showStatus('Error loading providers.', 'error');
    logResult(`❌ Error loading providers: ${error}`);
  }
}

async function loadModels() {
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  
  try {
    showStatus('Loading models...', 'info');
    
    let provider: AIProvider;
    const selectedProvider = (document.getElementById('providerSelect') as HTMLSelectElement).value;
    
    switch (selectedProvider) {
      case 'ollama':
        provider = new LocalOllamaProvider({ apiEndpoint: 'http://localhost:11434' });
        break;
      case 'openai':
        provider = new OpenAIProvider({ apiEndpoint: 'http://localhost:5173/api' });
        break;
      case 'perplexity':
        provider = new PerplexityProvider({ apiEndpoint: 'http://localhost:5173/api' });
        break;
      default:
        throw new Error('Unsupported provider for model loading');
    }

    const models = await provider.listModels();
    
    modelSelect.innerHTML = '';
    if (models.length === 0) {
      modelSelect.innerHTML = '<option value="">No models found</option>';
      showStatus('No models found. Make sure the service is running.', 'error');
    } else {
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
      showStatus(`Loaded ${models.length} models`, 'success');
      logResult(`✅ Found ${models.length} models: ${models.join(', ')}`);
    }
  } catch (error) {
    console.error('Error loading models:', error);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
    showStatus('Error loading models. Is the service running?', 'error');
    logResult(`❌ Error loading models: ${error}`);
  }
}

/**
 * AI Form Input Initialization
 */

async function initializeAI() {
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  const debug = (document.getElementById('debugMode') as HTMLInputElement).checked;
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
  
  const selectedModel = modelSelect.value;
  const selectedProvider = providerSelect.value;

  if (!selectedModel) {
    showStatus('Please select a model first', 'error');
    return;
  }
  
  try {
    aiFormFill = new AIFormFill(selectedProvider as AvailableProviders, {
      debug: debug,
    });
    
    showStatus('AI Form Input initialized successfully!', 'success');
    logResult(`✅ Initialized: new AIFormFill('${selectedProvider}')`);
  } catch (error) {
    console.error('Error initializing AI Form Input:', error);
    showStatus('Error initializing AI Form Input', 'error');
    logResult(`❌ Initialization error: ${error}`);
  }
}

/**
 * Form Filling Functions
 */

async function parseAndFillForm() {
  if (!aiFormFill) {
    showStatus('Please initialize AI Form Input first', 'error');
    return;
  }
  
  const text = (document.getElementById('unstructuredText') as HTMLTextAreaElement).value;
  if (!text.trim()) {
    showStatus('Please enter some text to parse', 'error');
    return;
  }
  
  const form = document.getElementById('testForm') as HTMLFormElement;
  
  try {
    showStatus('Parsing text and filling form...', 'info');
    logResult('🔄 Starting parse and fill...');
    logResult(`📝 Input: "${text.substring(0, 100)}..."`);
    
    await aiFormFill.parseAndFillForm(form, text);
    
    showStatus('Form filled successfully!', 'success');
    logResult('✅ Form filled!');
  } catch (error) {
    console.error('Error filling form:', error);
    showStatus('Error filling form', 'error');
    logResult(`❌ Error: ${error}`);
  }
}

async function fillSingleField() {
  if (!aiFormFill) {
    showStatus('Please initialize AI Form Input first', 'error');
    return;
  }
  
  if (!selectedElement) {
    showStatus('Please click on a field first', 'error');
    return;
  }
  
  try {
    showStatus('Filling field...', 'info');
    logResult(`🔄 Filling: ${selectedElement.getAttribute('name') || selectedElement.id}`);
    
    await aiFormFill.fillSingleField(selectedElement);
    
    showStatus('Field filled successfully!', 'success');
    logResult('✅ Field filled!');
  } catch (error) {
    console.error('Error filling field:', error);
    showStatus('Error filling field', 'error');
    logResult(`❌ Error: ${error}`);
  }
}

/**
 * Testing & Utilities
 */

async function testAPI() {
  showStatus('Testing /api/provider endpoint...');
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
  const selectedProvider = providerSelect.value;
  
  const response = await fetch(`/api/${selectedProvider}/available`, { 
    method: 'POST' 
  });
  
  if (!response.ok) {
    showStatus('Provider API is unavailable', 'error');
    logResult(`❌ Provider API is unavailable: ${response.status}`);
    return;
  }
  
  showStatus('Provider API is Available', 'success');
}

/**
 * UI Setup
 */

function setupFieldTracking() {
  const form = document.getElementById('testForm') as HTMLFormElement;
  const inputs = form.querySelectorAll('input:not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select');
  
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      selectedElement = input as HTMLElement;
      const fieldInfo = document.getElementById('selectedFieldInfo');
      if (fieldInfo) {
        const name = input.getAttribute('name') || (input as HTMLElement).id;
        const type = (input as HTMLInputElement).type || input.tagName.toLowerCase();
        fieldInfo.textContent = `${name} (${type})`;
        fieldInfo.style.color = '#4CAF50';
      }
    });
  });
}

function setupEventListeners() {
  // document.getElementById('refreshModels')!.addEventListener('click', loadModels);
  document.getElementById('initButton')!.addEventListener('click', initializeAI);
  document.getElementById('parseAndFillButton')!.addEventListener('click', parseAndFillForm);
  document.getElementById('fillSingleButton')!.addEventListener('click', fillSingleField);
  document.getElementById('testApiButton')!.addEventListener('click', testAPI);
  document.getElementById('providerSelect')!.addEventListener('change', loadModels);
  
  document.getElementById('clearButton')!.addEventListener('click', () => {
    const form = document.getElementById('testForm') as HTMLFormElement;
    clearForm(form);
  });
}

function addSampleData() {
  const textarea = document.getElementById('unstructuredText') as HTMLTextAreaElement;
  if (textarea) {
    textarea.value = `Hi, my name is Jim Raynor. You can reach me at jim.dope@starcraft.com or call me at +1-551-143-4567. I live at 1st Main Street in NYC, USA. I'm a software developer passionate about technology and music. I enjoy travel as well. I would like to subscribe to the newsletter and enable notifications. I'm male.`;
  }
}

/**
 * Initialize the application
 */
function initApp() {
  setupFieldTracking();
  setupEventListeners();
  addSampleData();
  loadProviders();
  loadModels();
  
  // Handle form submission
  const form = document.getElementById('testForm') as HTMLFormElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showStatus('Form submitted!', 'success');
    logResult('📤 Form submitted');
    
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Also get checkbox states
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox: Element) => {
      const cb = checkbox as HTMLInputElement;
      data[cb.name] = cb.checked;
    });
    
    console.log('Form Data:', data);
    logResult(`✅ Form Data: ${JSON.stringify(data, null, 2)}`);
  });
  
  console.log('✅ Advanced demo ready!');
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
