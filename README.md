# AI Form Fill

Framework-agnostic library for AI-powered form filling. Extract structured data from unstructured text and automatically fill forms using OpenAI, Ollama, or custom AI providers.

## Features

- Uses LLMs to understand and extract data from natural language
- Automatically matches data to form fields
- Works with Ollama, OpenAI, Perplexity, or custom providers
- Works with vanilla JS, React, Vue, or any framework (better documentation and support soon)
- Get started in minutes with minimal configuration (not quite seemless yet)

## Installation
TODO
```bash
npm install ai-form-fill
```

## Quick Start

### Simple Setup (Auto-Initialize)

For the easiest setup, use the built-in initialization function:

**HTML:**
```html
<form id="aff-form">
  <input type="text" name="name" placeholder="Name">
  <input type="email" name="email" placeholder="Email">
  <input type="tel" name="phone" placeholder="Phone">
</form>

<textarea id="aff-text" placeholder="Paste your text here..."></textarea>
<!-- Clicking "aff-text-button" submits "aff-text" to the ai -->
<button id="aff-text-button">Fill Form</button>
<!-- Clicking "aff-clear-button" clears "aff-form" -->
<button id="aff-clear-button">Clear</button>

<!-- Add this to the document -->
<script type="module">
  import { initializeAFFQuick } from 'ai-form-fill';
  initializeAFFQuick();
</script>
```
#### HTML Element IDs (Simple Setup)

For auto-initialization with `initializeAFFQuick()`, use these IDs:

- `aff-form` - The form element to fill
- `aff-text` - Textarea for user input
- `aff-text-button` - Button to trigger form filling
- `aff-clear-button` - Button to clear the form

All 4 IDs have to be used otherwise the script will throw an error!

Add `data-aff-provider` attribute to the form to specify provider:
```html
<form id="aff-form" data-aff-provider="ollama">
```


### Custom Setup

For more control, use the `AIFormFill` class directly:

```typescript
import { AIFormFill } from 'ai-form-fill';

// Create instance with Ollama (default)
const aiForm = new AIFormFill('ollama', { 
  model: 'gemma3:4b',
  debug: true 
});

// Fill entire form from unstructured text
const form = document.getElementById('myForm') as HTMLFormElement;
const text = "My name is John Doe, email john@example.com, phone 555-1234";

await aiForm.parseAndFillForm(form, text);

// Or fill a single field
const nameField = document.getElementById('name') as HTMLInputElement;
await aiForm.fillField(nameField, "What's a good name for a software developer?");
```


## Configuration

### Provider Setup

#### Ollama (Local)
```typescript
const aiForm = new AIFormFill('ollama', {
  model: 'gemma3:4b', // Default model
});
```

#### OpenAI
```typescript
const aiForm = new AIFormFill('openai', {
  model: 'gpt-5-nano', // Default model
});
```

#### Perplexity
```typescript
const aiForm = new AIFormFill('perplexity', {
  model: 'sonar', // Default model
});
```

### Global Configuration

Change default settings for all instances:

```typescript
import { affConfig } from 'ai-form-fill';

// Update Ollama defaults
affConfig.providers.ollama.model = 'mistral';
affConfig.providers.ollama.apiEndpoint = 'http://my-server:11434';

// Enable debug mode globally
affConfig.defaults.debug = true;
```

## API Reference




## Examples

See the `examples/` folder for:
- Basic demo - Simple form filling
- Advanced demo - Full-featured with provider selection and debugging

Run examples:
```bash
npm run dev
```

## How the Library Uses APIs

This library communicates with AI providers through their REST APIs:

### Ollama (Local)
- Connects directly to your local Ollama instance (default: `http://localhost:11434`)
- No API key needed
- **Recommended for development** - Install Ollama and pull `gemma3:4b` model

### OpenAI & Perplexity
- Requires API keys stored in environment variables
- For development, the library uses **mock API endpoints** that proxy requests to the real APIs
- Mock endpoints are defined in the `mock/` folder and powered by `vite-plugin-mock-dev-server`

### Mock API Setup

The `mock/` folder contains API mocks for testing without exposing keys in code:

- `openai.mock.ts` - Proxies to OpenAI API using `VITE_OPEN_AI_KEY`
- `perplexity.mock.ts` - Proxies to Perplexity API using `VITE_PERPLEXITY_KEY`

During development (`npm run dev`), requests to `/api/openai/*` and `/api/perplexity/*` are intercepted by Vite and routed through these mocks.

## Development Setup

### Prerequisites
- Node.js LTS (latest recommended) - [Download](https://nodejs.org/)
- **Ollama** (recommended) - [Install from ollama.ai](https://ollama.ai)

### Recommended: Ollama Setup (Simplest)
```bash
# Install Ollama from ollama.ai
# Then pull the default model:
ollama pull gemma3:4b
```

This gives you a working development environment with no API keys required!

### Full Setup Instructions

1. **Clone and install:**
   ```bash
   cd ai-form-input
   npm install
   ```

2. **Optional - API Keys for OpenAI/Perplexity:**
   
   Create a `.env` file in the project root:
   ```env
   VITE_OPEN_AI_KEY=your-openai-key-here
   VITE_PERPLEXITY_KEY=your-perplexity-key-here
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the demos:**
   - Main page: `http://localhost:5173/`
   - Basic example: `http://localhost:5173/examples/basic/`
   - Advanced example: `http://localhost:5173/examples/advanced/`

### Development Structure

- `lib/` - Core library source code
- `examples/` - Demo applications
  - `basic/` - Simple form fill example
  - `advanced/` - Full-featured demo with provider selection
- `mock/` - API mock endpoints for development
- `vite.config.js` - Build configuration with mock plugin

The dev server provides hot reload - changes to library or examples update instantly.

## Requirements

- At least one AI provider configured and running:
  - **Ollama**: Install from [ollama.ai](https://ollama.ai) (recommended: `gemma3:4b` model)
  - **OpenAI**: API key required
  - **Perplexity**: API key required

## License

MIT

## Author

Joel Deffner
