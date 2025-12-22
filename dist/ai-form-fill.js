let a = {
  /**
   * Provider-specific default configurations
   * These can be overridden globally or per-instance
   */
  providers: {
    ollama: {
      apiEndpoint: "http://localhost:11434",
      model: "gemma3:4b",
      timeout: 3e4,
      chatEndpoint: "/api/chat",
      listModelsEndpoint: "/api/tags",
      availabilityEndpoint: "/api/tags"
    },
    openai: {
      apiEndpoint: "http://localhost:5173/api",
      model: "gpt-5-nano",
      timeout: 6e4,
      chatEndpoint: void 0,
      listModelsEndpoint: void 0,
      availabilityEndpoint: void 0
    },
    perplexity: {
      apiEndpoint: "http://localhost:5173/api",
      model: "sonar",
      timeout: 6e4,
      chatEndpoint: void 0,
      listModelsEndpoint: void 0,
      availabilityEndpoint: void 0
    }
  },
  /**
   * Global library defaults
   */
  defaults: {
    debug: !0,
    timeout: 3e4
  }
};
class h {
  /**
   * **Optional**: Concrete link to endpoint that sends chat messages
   */
  chatEndpoint;
  /**
   * **Optional**: Concrete link to endpoint that lists available models
   */
  listModelsEndpoint;
  /**
   * **Optional**: Concrete link to endpoint that checks API availability
   */
  availabilityEndpoint;
  selectedModel;
  apiEndpoint;
  timeout;
  debug = a.defaults.debug;
  constructor(o) {
    this.apiEndpoint = o.apiEndpoint, this.selectedModel = o.model, this.timeout = o.timeout || 3e4;
  }
  /**
   * 
   * @returns The currently selected model or undefined
   */
  getSelectedModel() {
    return this.selectedModel;
  }
  /**
   * Set the selected model
   * @param model - The model to select
   */
  setSelectedModel(o) {
    if (o && typeof this.listModels == "function") {
      this.listModels().then((e) => {
        e && e.includes(o) ? this.selectedModel = o : this.debug && console.log(`Model "${o}" not found in provider models.`);
      }).catch((e) => {
        this.debug && console.log("listModels failed:", e);
      });
      return;
    }
  }
  getName() {
    return this.providerName;
  }
}
class b extends h {
  providerType = "local";
}
class y extends h {
  providerType = "remote";
}
function m(t) {
  const o = {
    element: t,
    type: "text"
  };
  if (t instanceof HTMLInputElement ? (o.type = t.type, o.name = t.name, o.placeholder = t.placeholder, o.required = t.required, o.pattern = t.pattern, t.type === "checkbox" && (o.placeholder = t.value || "checkbox option")) : t instanceof HTMLTextAreaElement ? (o.type = "textarea", o.name = t.name, o.placeholder = t.placeholder, o.required = t.required) : t instanceof HTMLSelectElement && (o.type = "select", o.name = t.name, o.required = t.required), t.id) {
    const e = document.querySelector(`label[for="${t.id}"]`);
    e && (o.label = e.textContent?.trim());
  }
  if (!o.label) {
    const e = t.closest("label");
    e && (o.label = e.textContent?.trim());
  }
  return o;
}
function g(t) {
  const o = [];
  return t.querySelectorAll(
    'input:not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select'
  ).forEach((r) => {
    r instanceof HTMLElement && o.push(m(r));
  }), o;
}
function u(t, o) {
  const e = o.trim().toLowerCase();
  if (!(e == "null" || e === "" || e === "n/a" || e === "none" || e === "no value" || e === "empty" || e === "undefined" || e === "unknown")) {
    if (t instanceof HTMLInputElement)
      if (t.type === "checkbox") {
        const r = e === "true" || e === "yes" || e === "1" || e === "checked" || e === "on";
        t.checked = r, t.dispatchEvent(new Event("change", { bubbles: !0 })), t.dispatchEvent(new Event("input", { bubbles: !0 }));
      } else
        t.value = o, t.dispatchEvent(new Event("input", { bubbles: !0 })), t.dispatchEvent(new Event("change", { bubbles: !0 }));
    else if (t instanceof HTMLTextAreaElement)
      t.value = o, t.dispatchEvent(new Event("input", { bubbles: !0 })), t.dispatchEvent(new Event("change", { bubbles: !0 }));
    else if (t instanceof HTMLSelectElement) {
      let r = Array.from(t.options).find(
        (n) => n.value.toLowerCase() === e || n.text.toLowerCase() === e
      );
      r || (r = Array.from(t.options).find(
        (n) => n.value.toLowerCase().includes(e) || n.text.toLowerCase().includes(e) || e.includes(n.value.toLowerCase()) || e.includes(n.text.toLowerCase())
      )), r ? (t.value = r.value, t.dispatchEvent(new Event("change", { bubbles: !0 })), t.dispatchEvent(new Event("input", { bubbles: !0 }))) : a.defaults.debug && console.warn(
        `No matching option found for select element. Value: "${o}", Available options:`,
        Array.from(t.options).map((n) => `${n.value} (${n.text})`)
      );
    }
  }
}
function w(t) {
  return t.name || t.label || t.placeholder || "unknown";
}
function x(t, o) {
  let e = `Generate appropriate content for the following form field:

`;
  return t.label && (e += `Field Label: ${t.label}
`), t.name && (e += `Field Name: ${t.name}
`), e += `Field Type: ${t.type}
`, t.placeholder && (e += `Placeholder: ${t.placeholder}
`), t.pattern && (e += `Pattern/Format: ${t.pattern}
`), o && (e += `
Additional Context: ${o}
`), t.type === "checkbox" ? e = `${o}
Randomly return "true" or "false", no explanations. Dont repeat your choice too often.` : e += `
Provide a realistic and appropriate value for this field. Only return the value itself, no explanations.`, e;
}
function $(t, o) {
  let e = `Extract structured data from the following unstructured text and match it to the form fields.

`;
  e += `Form fields:
`;
  for (const r of t) {
    const n = r.name || r.label || r.placeholder || "unknown";
    if (e += `- ${n} (type: ${r.type})`, r.label && (e += ` - Label: "${r.label}"`), r.placeholder && (e += ` - Placeholder: "${r.placeholder}"`), r.type === "select" && r.element instanceof HTMLSelectElement) {
      const i = Array.from(r.element.options).map((s) => s.textContent?.trim() || "").filter((s) => s);
      e += ` - Options: [${i.join(", ")}]`;
    }
    e += `
`;
  }
  return e += `
Unstructured text:
${o}


    Extract the relevant information and return it as a JSON object where keys match the field names exactly.
    

    Only include fields where you found relevant data.
    

    For checkbox fields, return "true" if the text indicates the option should be checked, "false" or omit otherwise.
    

    Return ONLY the JSON object, no explanations or markdown formatting.
  `, e;
}
const f = {
  FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.",
  PARSE_EXTRACT: 'You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If its a checkbox field, return "true" if it should be checked, otherwise return "false" or omit the field.'
};
function F(t) {
  try {
    let o = t.trim();
    o = o.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const e = JSON.parse(o), r = {};
    for (const [n, i] of Object.entries(e))
      r[n] = String(i);
    return r;
  } catch (o) {
    return console.error("Failed to parse JSON response:", o), console.error("Response was:", t), {};
  }
}
function M(t) {
  try {
    return JSON.parse(t), !0;
  } catch {
    return !1;
  }
}
class A extends b {
  providerName = "Ollama";
  async chat(o) {
    const e = new AbortController(), r = setTimeout(() => e.abort(), this.timeout), n = this.chatEndpoint || `${this.apiEndpoint}${a.providers.ollama.chatEndpoint}`;
    try {
      const i = {
        model: o.model || a.providers.ollama.model,
        messages: o.messages,
        stream: !1,
        // We want complete responses, not streaming
        options: {
          num_predict: o.maxTokens
          // Ollama uses num_predict instead of maxTokens
        }
      }, s = await fetch(n, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(i),
        signal: e.signal
      });
      if (!s.ok)
        throw new Error(`Ollama API error: ${s.status} ${s.statusText}`);
      const l = await s.json();
      return {
        content: l.message.content,
        model: l.model,
        finishReason: l.done ? "stop" : "length"
      };
    } catch (i) {
      if (i instanceof Error) {
        if (i.name === "AbortError")
          throw new Error(`Ollama request timed out after ${this.timeout}ms`);
        if (i.message.includes("fetch") || i.message.includes("Failed to fetch"))
          throw new Error(`Failed to connect to Ollama at ${this.apiEndpoint}. Is Ollama running?`);
      }
      throw i;
    } finally {
      clearTimeout(r);
    }
  }
  async listModels() {
    try {
      const o = await fetch(`${this.apiEndpoint}${a.providers.ollama.listModelsEndpoint}`);
      if (!o.ok)
        throw new Error(`Failed to fetch models: ${o.statusText}`);
      return ((await o.json()).models || []).map((r) => r.name);
    } catch (o) {
      return console.error("Error listing Ollama models:", o), [];
    }
  }
  async isAvailable() {
    try {
      return (await fetch(`${this.apiEndpoint}${a.providers.ollama.availabilityEndpoint}`, {
        method: "GET"
      })).ok;
    } catch {
      return !1;
    }
  }
}
class v extends y {
  providerName = "OpenAI";
  async chat(o) {
    const e = new AbortController(), r = setTimeout(() => e.abort(), this.timeout), n = this.chatEndpoint || `${this.apiEndpoint}/${this.providerName.toLocaleLowerCase()}/chat`;
    try {
      const i = await fetch(n, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(o),
        signal: e.signal
      });
      this.debug && console.log(`${this.providerName} request sent:`, o);
      const s = await i.json();
      return this.debug && console.log(`${this.providerName} response body:`, s), {
        content: s.choices[0].message.content,
        model: s.model,
        finishReason: s.choices[0].finish_reason
      };
    } catch (i) {
      if (i instanceof Error) {
        if (i.name === "AbortError")
          throw new Error(`${this.providerName} request timed out after ${this.timeout}ms`);
        if (i.message.includes("fetch") || i.message.includes("Failed to fetch"))
          throw new Error(`Failed to connect to ${this.providerName}. Check your network connection.`);
      }
      throw i;
    } finally {
      clearTimeout(r);
    }
  }
  async listModels() {
    const o = a.providers.openai.listModelsEndpoint ? `${this.apiEndpoint}${a.providers.openai.listModelsEndpoint}` : `${this.apiEndpoint}/${this.providerName.toLocaleLowerCase()}/models`;
    try {
      const e = await fetch(o, { method: "POST" });
      if (!e.ok)
        throw new Error(`${this.providerName} API error: ${e.status} ${e.statusText}`);
      return (await e.json()).models;
    } catch (e) {
      if (this.debug)
        throw new Error(`Error fetching models from ${this.providerName}: ${e}`);
      return [];
    }
  }
  async isAvailable() {
    const o = a.providers.openai.availabilityEndpoint ? `${this.apiEndpoint}${a.providers.openai.availabilityEndpoint}` : `${this.apiEndpoint}/${this.providerName.toLocaleLowerCase()}/available`;
    try {
      return (await fetch(o, { method: "POST" })).ok;
    } catch (e) {
      if (this.debug)
        throw e;
      return !1;
    }
  }
}
class T extends v {
  providerName = "Perplexity";
}
class L {
  provider;
  debug = a.defaults.debug;
  context;
  selectedFields;
  constructor(o, e) {
    const r = {
      ollama: () => new A({
        apiEndpoint: e?.apiEndpoint || a.providers.ollama.apiEndpoint,
        model: e?.model || a.providers.ollama.model,
        timeout: e?.timeout || a.providers.ollama.timeout
      }),
      openai: () => new v({
        apiEndpoint: e?.apiEndpoint || a.providers.openai.apiEndpoint,
        model: e?.model || a.providers.openai.model,
        timeout: e?.timeout || a.providers.openai.timeout
      }),
      perplexity: () => new T({
        apiEndpoint: e?.apiEndpoint || a.providers.perplexity.apiEndpoint,
        model: e?.model || a.providers.perplexity.model,
        timeout: e?.timeout || a.providers.perplexity.timeout
      })
      /** 
       * @extension Add more providers here as needed
       */
    }, n = o.toLowerCase(), i = r[n];
    if (!i)
      throw new Error(
        `Unsupported provider: ${o}
Available providers: ${Object.keys(r).join(", ")}`
      );
    const s = i();
    this.provider = s, this.debug = e?.debug || a.defaults.debug;
  }
  /**
   * Fill a single form field with AI-generated content
   * 
   * Generates appropriate content for one field based on its label, name,
   * placeholder, and type. Useful for creative content or when you don't
   * have source text to extract from.
   * 
   * @param element - The form field element to fill (input, textarea, or select)
   * 
   * @example
   * ```typescript
   * const bioField = document.querySelector('#bio');
   * await aiForm.fillSingleField(bioField);
   * ```
   */
  async fillSingleField(o) {
    const e = m(o);
    this.debug && console.log(`Filling ${e.type} field: ${e.name}`);
    const r = x(e, this.context), n = [
      {
        role: "system",
        content: f.FIELD_FILL
      },
      {
        role: "user",
        content: r
      }
    ];
    try {
      const i = await this.provider.chat({
        messages: n,
        model: this.provider.getSelectedModel()
      });
      i.content && u(o, i.content.trim()), this.debug && console.log("Field filled with:", i.content);
    } catch (i) {
      this.debug && console.error("Error during fillSingleField:", i);
    }
  }
  /**
   * Parse unstructured text and automatically fill matching form fields
   * 
   * @param formElement - The HTML form to fill
   * @param unstructuredText - The source text to extract data from
   *   - Examples: Resume text, email body, paragraph descriptions, JSON strings
   * 
   * @example Parse resume text into job application
   * 
   * const form = document.querySelector('form');
   * const resumeText = `
   *   John Doe
   *   Email: john@example.com
   *   Phone: (555) 123-4567
   *   I have 5 years of experience in software development...
   * `;
   * 
   * await aiForm.parseAndFillForm(form, resumeText);
   * // Form fields automatically filled with extracted data
   * 
   * 
   * @example Parse structured data
   * typescript
   * const jsonData = JSON.stringify({
   *   firstName: 'Jane',
   *   lastName: 'Smith',
   *   email: 'jane@example.com'
   * });
   * 
   * await aiForm.parseAndFillForm(form, jsonData);
   * 
   */
  async parseAndFillForm(o, e) {
    const r = g(o);
    this.debug && console.log("Parsing unstructured text for", r.length, "fields");
    const n = this.selectedFields ? r.filter(
      (d) => d.name && this.selectedFields.includes(d.name)
    ) : r, i = $(n, e);
    this.debug && console.log(`Constructed parse prompt:
`, i);
    const s = [
      {
        role: "system",
        content: f.PARSE_EXTRACT
      },
      {
        role: "user",
        content: i
      }
    ], l = await this.provider.chat({
      messages: s,
      model: this.provider.getSelectedModel()
    });
    let c = {};
    if (l.content)
      c = F(l.content);
    else
      throw new Error("No content received from AI provider.");
    this.debug && console.log("Extracted data:", c);
    for (const d of n) {
      const p = w(d);
      if (p && c[p])
        try {
          u(d.element, c[p]);
        } catch (E) {
          this.debug && console.error(`Failed to fill field "${p}":`, E);
        }
    }
  }
  /**
   * Check if the AI provider is available and responding
   * 
   * @returns Promise resolving to true if provider is available, false otherwise
   */
  async providerAvailable() {
    return this.provider.isAvailable ? await this.provider.isAvailable() : !0;
  }
  /**
   * Get list of available models from the provider
   * 
   * Queries the provider for available models. Useful for building
   * dynamic model selection interfaces.
   * 
   * @returns Promise resolving to array of model identifiers
   * 
   * @example Build a model selector
   * ```typescript
   * const models = await aiForm.getAvailableModels();
   * 
   * const select = document.querySelector('#model-select');
   * models.forEach(model => {
   *   const option = document.createElement('option');
   *   option.value = model;
   *   option.textContent = model;
   *   select.appendChild(option);
   * });
   * ```
   */
  async getAvailableModels() {
    return this.provider.listModels ? await this.provider.listModels() : [];
  }
}
function k() {
  const t = document.getElementById("aff-form"), o = document.getElementById("aff-text"), e = document.getElementById("aff-text-button"), r = document.getElementById("aff-clear-button"), n = t.getAttribute("data-aff-provider") || "Ollama", i = new L(n, { debug: !0 });
  e.addEventListener("click", async () => {
    const s = o.value.trim();
    try {
      await i.parseAndFillForm(t, s);
    } catch (l) {
      console.error("Error filling form:", l), alert("Error filling form. Check console for details.");
    }
  }), r.addEventListener("click", () => {
    t.reset();
  });
}
export {
  L as AIFormFill,
  h as AIProvider,
  A as LocalOllamaProvider,
  v as OpenAIProvider,
  T as PerplexityProvider,
  f as SYSTEM_PROMPTS,
  a as affConfig,
  m as analyzeField,
  x as buildFieldPrompt,
  $ as buildParsePrompt,
  w as getFieldIdentifier,
  g as getFillTargets,
  k as initializeAFFQuick,
  M as isValidJson,
  F as parseJsonResponse,
  u as setFieldValue
};
