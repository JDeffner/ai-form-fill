/**
 * Advanced Demo - AI Form Fill
 *
 * Provider selection, model configuration and testing.
 */

import {
  AIFormFill,
  AIProvider,
  LocalOllamaProvider,
  OpenAICompatibleProvider,
  type AvailableProviders,
} from '../../lib/core/main';
import { showStatus, logResult, clearForm } from '../utils/ui-helpers';

// State
const listOfProviders: AIProvider[] = [
  new LocalOllamaProvider(),
  new OpenAICompatibleProvider('openai'),
  new OpenAICompatibleProvider('perplexity'),
  new OpenAICompatibleProvider('openrouter'),
];
const aiFormFill: AIFormFill = new AIFormFill(listOfProviders[0], { debug: true });
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
    { name: 'OpenRouter', value: 'openrouter' },
  ];

  try {
    showStatus('Loading providers...', 'info');
    providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider.value;
      option.textContent = provider.name;
      providerSelect.appendChild(option);
    });
    providerSelect.value = aiFormFill.getProvider().getName();
    showStatus(`Loaded ${providers.length} providers`, 'success');
    logResult(`Found ${providers.length} providers: ${providers.map((p) => p.name).join(', ')}`);
  } catch (error) {
    console.error('Error loading providers:', error);
    providerSelect.innerHTML = '<option value="">Error loading providers</option>';
    showStatus('Error loading providers.', 'error');
    logResult(`Error loading providers: ${error}`);
  }
}

async function loadModels() {
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;

  try {
    showStatus('Loading models...', 'info');
    const selectedProviderName = providerSelect.value as AvailableProviders;
    const selectedProvider = listOfProviders.find((p) => p.getName() === selectedProviderName);
    if (selectedProvider) aiFormFill.setProvider(selectedProvider);

    const models = await aiFormFill.getProvider().listModels();
    modelSelect.innerHTML = '';

    if (models && models.length > 0) {
      const currentModel = aiFormFill.getSelectedModel();
      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        modelSelect.appendChild(option);
      });
      if (currentModel && models.includes(currentModel)) modelSelect.value = currentModel;
      showStatus(`Loaded ${models.length} models`, 'success');
      logResult(`Found ${models.length} models: ${models.join(', ')}`);
    } else {
      modelSelect.innerHTML = '<option value="">No models found</option>';
      showStatus('No models found. Make sure the service is running.', 'error');
    }
  } catch (error) {
    console.error('Error loading models:', error);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
    showStatus('Error loading models. Is the service running?', 'error');
    logResult(`Error loading models: ${error}`);
  }
}

/**
 * Initialization
 */
async function initializeAI() {
  const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
  const providerSelect = document.getElementById('providerSelect') as HTMLSelectElement;
  const selectedModel = modelSelect.value;
  const selectedProviderName = providerSelect.value;

  if (!selectedModel) {
    showStatus('Please select a model first', 'error');
    return;
  }

  try {
    const selectedProvider = listOfProviders.find((p) => p.getName() === selectedProviderName);
    if (!selectedProvider) {
      showStatus('Provider not found', 'error');
      return;
    }
    aiFormFill.setProvider(selectedProvider);
    await aiFormFill.setSelectedModel(selectedModel);
    showStatus('AI Form Fill initialized successfully!', 'success');
    logResult(`Initialized with provider '${selectedProviderName}' and model '${selectedModel}'`);
  } catch (error) {
    console.error('Error initializing AI Form Fill:', error);
    showStatus('Error initializing AI Form Fill', 'error');
    logResult(`Initialization error: ${error}`);
  }
}

/**
 * Form Filling
 */
async function extractAndInsertData() {
  const text = (document.getElementById('unstructuredText') as HTMLTextAreaElement).value;
  if (!text.trim()) {
    showStatus('Please enter some text to parse', 'error');
    return;
  }

  const form = document.getElementById('testForm') as HTMLFormElement;
  try {
    showStatus('Parsing text and filling form...', 'info');
    logResult('Starting parse and fill...');
    await aiFormFill.parseAndFillForm(form, text);
    showStatus('API call complete', 'info');
    logResult('API call complete');
  } catch (error) {
    console.error('Error filling form:', error);
    showStatus('Error filling form', 'error');
    logResult(`Error: ${error}`);
  }
}

async function fillSingleField() {
  if (!selectedElement) {
    showStatus('Please click on a field first', 'error');
    return;
  }
  try {
    showStatus('Filling field...', 'info');
    logResult(`Filling: ${selectedElement.getAttribute('name') || selectedElement.id}`);
    await aiFormFill.fillSingleField(selectedElement);
    showStatus('Field filled successfully!', 'success');
    logResult('Field filled!');
  } catch (error) {
    console.error('Error filling field:', error);
    showStatus('Error filling field', 'error');
    logResult(`Error: ${error}`);
  }
}

/**
 * Testing
 */
async function testAPI() {
  showStatus('Testing provider availability...');
  const available = await aiFormFill.providerAvailable();
  if (!available) {
    showStatus('Provider API is unavailable', 'error');
    logResult('Provider API is unavailable');
    return;
  }
  showStatus('Provider API is available', 'success');
}

/**
 * UI Setup
 */
function setupFieldTracking() {
  const form = document.getElementById('testForm') as HTMLFormElement;
  const inputs = form.querySelectorAll(
    'input:not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select',
  );
  inputs.forEach((input) => {
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
  document.getElementById('initButton')!.addEventListener('click', initializeAI);
  document.getElementById('parseAndFillButton')!.addEventListener('click', extractAndInsertData);
  document.getElementById('fillSingleButton')!.addEventListener('click', fillSingleField);
  document.getElementById('testApiButton')!.addEventListener('click', testAPI);
  document.getElementById('providerSelect')!.addEventListener('change', loadModels);
  document.getElementById('clearButton')!.addEventListener('click', () => {
    clearForm(document.getElementById('testForm') as HTMLFormElement);
  });
}

function addSampleData() {
  const textarea = document.getElementById('unstructuredText') as HTMLTextAreaElement;
  if (textarea) {
    textarea.value = `Hi, my name is John Doe. You can reach me at john.doe@example.com or call me at +1-555-123-4567. I live at 123 Main Street in New York, USA. I was born on March 15, 1990. I'm looking for a full-time position as a senior software developer and can start on January 1, 2026. Best time to reach me is around 2:30 PM.`;
  }
}

function initApp() {
  setupFieldTracking();
  setupEventListeners();
  addSampleData();
  loadProviders();
  loadModels();

  const form = document.getElementById('testForm') as HTMLFormElement;
  clearForm(form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showStatus('Form submitted!', 'success');
    const formData = new FormData(form);
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const cb = checkbox as HTMLInputElement;
      data[cb.name] = cb.checked;
    });
    logResult(`Form Data: ${JSON.stringify(data, null, 2)}`);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
