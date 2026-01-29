/**
 * Advanced Demo - AI Form Input Library
 * 
 * Full-featured test environment with provider selection, model configuration,
 * and comprehensive testing capabilities
 */

import { AIFormFill, AIProvider, LocalOllamaProvider, OpenAIProvider, PerplexityProvider, type AvailableProviders } from '../../lib/core/main';
import { showStatus, logResult, clearForm } from '../utils/ui-helpers';

// State

const listOfProviders: AIProvider[] = [
  new LocalOllamaProvider({ apiEndpoint: 'http://localhost:11434', model: 'gemma3:4b' }),
  new OpenAIProvider({ apiEndpoint: 'http://localhost:5173/api', model: 'gpt-5-nano' }),
  new PerplexityProvider({ apiEndpoint: 'http://localhost:5173/api', model: 'sonar' }),
];
let aiFormFill: AIFormFill = new AIFormFill(listOfProviders[0], { debug: true, allowedProviders: listOfProviders });
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
      providerSelect.value = aiFormFill.getProvider().getName();
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
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
  
  try {
    showStatus('Loading models...', 'info');
    const selectedProviderName = providerSelect.value as AvailableProviders;
    
    // Find and set the provider
    const selectedProvider = listOfProviders.find(p => p.getName() === selectedProviderName);
    if (selectedProvider) {
      aiFormFill.setProvider(selectedProvider);
    }
    
    const models = await aiFormFill.getProvider()?.listModels();
    console.log('Available Models:', models);
    
    modelSelect.innerHTML = '';
    if (models && models.length > 0) {
      const currentModel = aiFormFill.getSelectedModel();
      
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
      
      // Select the current model if it's in the list
      if (currentModel && models.includes(currentModel)) {
        modelSelect.value = currentModel;
      }
      
      showStatus(`Loaded ${models.length} models`, 'success');
      logResult(`✅ Found ${models.length} models: ${models.join(', ')}`);
    } else {
      modelSelect.innerHTML = '<option value="">No models found</option>';
      showStatus('No models found. Make sure the service is running.', 'error');
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
  const selectedProviderName = providerSelect.value;

  if (!selectedModel) {
    showStatus('Please select a model first', 'error');
    return;
  }
  
  try {
    // Find the matching provider from the allowed list
    const selectedProvider = listOfProviders.find(p => p.getName() === selectedProviderName);
    
    if (selectedProvider) {
      // Use the existing provider instance and just update its model
      aiFormFill.setProvider(selectedProvider);
      await aiFormFill.setSelectedModel(selectedModel);
    } else {
      showStatus('Provider not found', 'error');
      return;
    }

    showStatus('AI Form Input initialized successfully!', 'success');
    logResult(`✅ Initialized with provider '${selectedProviderName}' and model '${selectedModel}'`);
  } catch (error) {
    console.error('Error initializing AI Form Input:', error);
    showStatus('Error initializing AI Form Input', 'error');
    logResult(`❌ Initialization error: ${error}`);
  }
}

/**
 * Form Filling Functions
 */

async function extractAndInsertData() {
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
    
    showStatus('API call complete', 'info');
    logResult('✅ API call complete');
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
  
  if (!aiFormFill.providerAvailable) {
    showStatus('Provider API is unavailable', 'error');
    logResult(`❌ Provider API is unavailable`);
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
  document.getElementById('parseAndFillButton')!.addEventListener('click', extractAndInsertData);
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
    textarea.value = `Hi, my name is John Doe. You can reach me at john.doe@example.com or call me at +1-555-123-4567. I live at 123 Main Street in New York, USA. I was born on March 15, 1990. I'm looking for a full-time position as a senior software developer and can start on January 1, 2026. Best time to reach me is around 2:30 PM. I'm passionate about AI and web technologies.`;
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
  clearForm(form);
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
