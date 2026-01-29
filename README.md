# AI Form Fill

Framework-agnostic library for AI-powered form filling. Extract structured data from unstructured text and automatically fill forms using OpenAI, Ollama, Perplexity, or custom AI providers.

## Features

- Uses LLMs to understand and extract data from natural language
- Automatically matches data to form fields
- Works with Ollama, OpenAI or Perplexity
- Framework-agnostic - works with vanilla JS, React, Vue, or any framework that allows module imports
- Two integration modes: Quick setup or full customization
- Field hints for precise AI guidance
- Configurable field targeting

## Installation

```bash
npm install ai-form-fill
```

---

## Quick Start (Simple Setup)

The fastest way to get started - just add HTML attributes and one line of JavaScript.

### HTML Setup

```html
<form id="aff-form" data-aff-provider="ollama">
  <input type="text" name="name" placeholder="Name">
  <input type="email" name="email" placeholder="Email">
  <input type="tel" name="phone" placeholder="Phone">
</form>

<textarea id="aff-text" placeholder="Paste your text here..."></textarea>
<button id="aff-text-button">Fill Form</button>
```

### JavaScript (One Line!)

```typescript
import { initializeAFFQuick } from 'ai-form-fill';

initializeAFFQuick(); // That's it!
```

### Required Element IDs

| Element ID | Description |
|------------|-------------|
| `aff-form` | The form element to fill |
| `aff-text` | Textarea for user input text |
| `aff-text-button` | Button to trigger form filling |

### Provider Selection

Add `data-aff-provider` attribute to specify which AI provider to use:

```html
<form id="aff-form" data-aff-provider="openai">
```

Available providers (case-insensitive): `ollama`, `openai`, `perplexity`

### Custom Form ID

You can use a custom form ID by passing it to `initializeAFFQuick()`:

```typescript
initializeAFFQuick('my-custom-form');
```

---

## Advanced Setup (Full Customization)

For complete control over the library, use the `AIFormFill` class directly.

### Basic Usage

```typescript
import { AIFormFill } from 'ai-form-fill';

// Create instance with a provider
const aiForm = new AIFormFill('ollama', { 
  model: 'gemma3:4b',
  debug: true 
});

// Fill entire form from unstructured text
const form = document.getElementById('myForm') as HTMLFormElement;
const text = "My name is John Doe, email john@example.com, phone 555-1234";

await aiForm.parseAndFillForm(form, text);
```

### Fill a Single Field

```typescript
const bioField = document.querySelector('#bio') as HTMLElement;
await aiForm.fillSingleField(bioField);
```

### Using Custom Providers

You can pass a custom `AIProvider` instance instead of a provider name:

```typescript
import { AIFormFill, LocalOllamaProvider } from 'ai-form-fill';

const customProvider = new LocalOllamaProvider({
  apiEndpoint: 'http://my-server:11434',
  model: 'llama3',
  timeout: 60000,
});

const aiForm = new AIFormFill(customProvider, { debug: true });
```

---

## Configuration

### Provider Options

#### Ollama (Local - Recommended for Development)
```typescript
const aiForm = new AIFormFill('ollama', {
  model: 'gemma3:4b',
  apiEndpoint: 'http://localhost:11434', // Optional
  timeout: 40000, // Optional
});
```

#### OpenAI
```typescript
const aiForm = new AIFormFill('openai', {
  model: 'gpt-5-nano',
  timeout: 60000,
});
```

#### Perplexity
```typescript
const aiForm = new AIFormFill('perplexity', {
  model: 'sonar',
  timeout: 60000,
});
```

### Global Configuration

Change default settings for all instances:

```typescript
import { affConfig } from 'ai-form-fill';

// Update Ollama defaults
affConfig.providers.ollama.model = 'mistral';
affConfig.providers.ollama.apiEndpoint = 'http://my-server:11434';

// Update OpenAI defaults
affConfig.providers.openai.model = 'gpt-4o';

// Enable debug mode globally
affConfig.defaults.debug = true;
```

### Field Targeting

By default, all detected form fields are filled. Target specific fields only:

```typescript
const aiForm = new AIFormFill('ollama', {
  targetFields: ['firstName', 'lastName', 'email'], // Only fill fields with these name attributes
});

await aiForm.parseAndFillForm(form, text);
```

Update the field list after instantiation:

```typescript
aiForm.setFields(['name', 'phone']); // Update targeted fields
aiForm.setFields(undefined);          // Reset to fill all fields

// Get currently targeted fields
const fields = aiForm.getFields(); // Returns string[] | undefined
```

### Field Hints (`data-aff-hint`)

Provide additional context to help the AI understand specific fields using the `data-aff-hint` attribute:

```html
<form id="job-application">
  <!-- Basic field - AI infers from name/label -->
  <input type="text" name="firstName" />
  
  <!-- Date field with format hint -->
  <input 
    type="date" 
    name="startDate" 
    data-aff-hint="Use the earliest date mentioned in the text"
  />
  
  <!-- Select with mapping hint -->
  <select 
    name="department" 
    data-aff-hint="Map to the closest match from the available options"
  >
    <option value="engineering">Engineering</option>
    <option value="sales">Sales</option>
    <option value="marketing">Marketing</option>
  </select>
  
  <!-- Textarea with content guidance -->
  <textarea 
    name="bio" 
    data-aff-hint="Extract a professional summary, max 2 sentences"
  ></textarea>
</form>
```

Hints are automatically read when filling the form:

```typescript
const aiForm = new AIFormFill('openai', { debug: true });
const form = document.getElementById('job-application') as HTMLFormElement;

await aiForm.parseAndFillForm(form, resumeText);
```

---

## Overview

### `AIFormFill` Class

#### Constructor

```typescript
new AIFormFill(provider: AvailableProviders | AIProvider, options?: AIFormFillConfig & ProviderConfig)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | `'ollama' \| 'openai' \| 'perplexity' \| AIProvider` | Provider name or custom instance |
| `options.targetFields` | `string[]` | Optional list of field names to fill |
| `options.debug` | `boolean` | Enable debug logging (default: `false`) |
| `options.model` | `string` | Model name to use |
| `options.apiEndpoint` | `string` | Custom API endpoint |
| `options.timeout` | `number` | Request timeout in ms |

#### Methods

| Method | Description |
|--------|-------------|
| `parseAndFillForm(form, text)` | Parse text and fill matching form fields |
| `fillSingleField(element)` | Fill a single field with AI-generated content |
| `setProvider(provider)` | Change the AI provider |
| `getProvider()` | Get the current AI provider |
| `setFields(fields)` | Set which fields should be filled |
| `getFields()` | Get currently targeted fields |
| `getAvailableModels()` | Get list of available models from provider |
| `setSelectedModel(model)` | Set the model to use |
| `getSelectedModel()` | Get the currently selected model |
| `providerAvailable()` | Check if the provider is available |

### `initializeAFFQuick(formId?)`

Quick initialization function for simple setups.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `formId` | `string` | `'aff-form'` | ID of the form element |

---

## Examples

See the `examples/` folder for working demos:

| Example | Description |
|---------|-------------|
| `basic/` | Simple form filling with minimal setup |
| `advanced/` | Full-featured demo with provider selection and debugging |

Run examples locally:

```bash
npm run dev
```

---

## Development Setup

### Prerequisites

- **Node.js** - [Install from nodejs.org](https://nodejs.org/en)
- **pnpm** (recommended) - [Install guide on pnpm.io](https://pnpm.io/installation)
- **Ollama** - [Install from ollama.ai](https://ollama.ai)

### Recommended: Ollama Setup (Simplest)

Run this command after installing Ollama:
```bash
ollama pull gemma3:4b
```

No API keys required!

### Full Setup

1. **Clone this Git repository**
   
2. **Go to the Project root and run**
  ```bash
  pnpm install
  ```
3. **Optional - API Keys for OpenAI/Perplexity:**
   
   Create a `.env` file in the project root:
   ```env
   VITE_OPEN_AI_KEY=your-openai-key-here
   VITE_PERPLEXITY_KEY=your-perplexity-key-here
   ```

4. **Start development server:**
   ```bash
   pnpm run dev
   ```

### Project Structure

```
ai-form-fill/
├── lib/                 # Core library source
│   ├── core/            # Main classes and types
│   ├── providers/       # AI provider implementations
│   └── utils/           # Utility functions
├── examples/            # Demo applications
│   ├── basic/           # Simple form fill example
│   └── advanced/        # Full-featured demo
└── mock/                # API mock endpoints for development
```

## APIs

---
APIs have to be handled with utmost care when working with JavaScipt since they are easily exposed when they are handled in the front end. since this library is a frontend one it means that sending the data to a self hosted backend first is a must. In the current version this happens through the mock abstraction but in real implementations this would require the configurations of a proper backend. this is outside the scope of this project but there is an obligation to set up guidelines as to how the libraries requiests should be relayed.

---