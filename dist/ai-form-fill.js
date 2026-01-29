let l = {
  ollama: {
    apiEndpoint: "http://localhost:11434",
    model: "gemma3:4b"
  },
  openai: {
    apiEndpoint: "http://localhost:5173/api",
    // http://localhost:5173/api for local testing proxy
    model: "gpt-5-nano"
  },
  perplexity: {
    apiEndpoint: "http://localhost:5173/api",
    // http://localhost:5173/api for local testing proxy
    model: "sonar"
  },
  providerDebug: !0,
  formFillDebug: !0,
  timeout: 3e4
};
class y {
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
  supportsStructuredResponses = !1;
  constructor(e) {
    this.apiEndpoint = e?.apiEndpoint || "", this.selectedModel = e?.model || "", this.timeout = e?.timeout || 3e4;
  }
  /** Returns the currently selected model. */
  getSelectedModel() {
    return this.selectedModel;
  }
  /**
   * Sets the model to use for chat requests. Validates against available models if possible.
   */
  async setSelectedModel(e) {
    if (!e) return !1;
    try {
      const t = await this.listModels();
      return t && t.includes(e) ? (this.selectedModel = e, !0) : (l.providerDebug && console.warn(`Model "${e}" not found. Available: ${t.join(", ")}`), !1);
    } catch (t) {
      return l.providerDebug && console.warn("Could not validate model:", t), this.selectedModel = e, !0;
    }
  }
  getName() {
    return this.providerName;
  }
  /**
   * Indicates if the provider supports structured output formats (e.g., JSON Schema)
   * 
   * @returns true if structured output is supported, false otherwise
   */
  supportsStructuredOutput() {
    return this.supportsStructuredResponses;
  }
}
class w extends y {
  providerType = "local";
}
class $ extends y {
  providerType = "remote";
}
const F = [
  "null",
  "",
  "n/a",
  "none",
  "no value",
  "empty",
  "undefined",
  "unknown",
  "missing"
], x = ["true", "yes", "1", "checked", "on"];
function h(o) {
  o.dispatchEvent(new Event("input", { bubbles: !0 })), o.dispatchEvent(new Event("change", { bubbles: !0 }));
}
function S(o) {
  return F.includes(o);
}
function M(o) {
  if (o.id) {
    const t = document.querySelector(`label[for="${o.id}"]`);
    if (t)
      return t.textContent?.trim() || "";
  }
  const e = o.closest("label");
  return e && e.textContent?.trim() || "";
}
function T(o, e) {
  let t = null;
  const r = o.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(r))
    t = new Date(r);
  else if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(r)) {
    const s = r.split(/[\/.-]/), c = parseInt(s[0], 10), u = parseInt(s[1], 10);
    let f = parseInt(s[2], 10);
    f < 100 && (f += 2e3), t = new Date(f, c - 1, u);
  } else {
    const s = Date.parse(r);
    isNaN(s) || (t = new Date(s));
  }
  if (e === "time") {
    const s = r.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
    if (s) {
      let c = parseInt(s[1], 10);
      const u = s[2], f = s[4]?.toLowerCase();
      return f === "pm" && c < 12 && (c += 12), f === "am" && c === 12 && (c = 0), `${c.toString().padStart(2, "0")}:${u}`;
    }
    return null;
  }
  if (!t || isNaN(t.getTime()))
    return null;
  const i = t.getFullYear(), n = (t.getMonth() + 1).toString().padStart(2, "0"), a = t.getDate().toString().padStart(2, "0"), d = t.getHours().toString().padStart(2, "0"), p = t.getMinutes().toString().padStart(2, "0");
  switch (e) {
    case "date":
      return `${i}-${n}-${a}`;
    case "datetime-local":
      return `${i}-${n}-${a}T${d}:${p}`;
    case "month":
      return `${i}-${n}`;
    case "week":
      const s = new Date(i, 0, 1), c = Math.floor((t.getTime() - s.getTime()) / (1440 * 60 * 1e3)), u = Math.ceil((c + s.getDay() + 1) / 7);
      return `${i}-W${u.toString().padStart(2, "0")}`;
    default:
      return `${i}-${n}-${a}`;
  }
}
function m(o) {
  const e = {
    element: o,
    type: "text"
  };
  if (o instanceof HTMLInputElement ? (e.type = o.type, e.name = o.name, e.placeholder = o.placeholder, e.pattern = o.pattern, o.type === "checkbox" && (e.placeholder = o.value || "checkbox option"), o.type === "radio" && (e.placeholder = o.value || "radio option")) : o instanceof HTMLTextAreaElement ? (e.type = "textarea", e.name = o.name, e.placeholder = o.placeholder) : o instanceof HTMLSelectElement && (e.type = "select", e.name = o.name), o.id) {
    const r = document.querySelector(`label[for="${o.id}"]`);
    r && (e.label = r.textContent?.trim());
  }
  if (!e.label) {
    const r = o.closest("label");
    r && (e.label = r.textContent?.trim());
  }
  const t = o.dataset.affHint;
  return t && (e.hint = t), e;
}
function k(o) {
  const e = [], t = /* @__PURE__ */ new Map();
  o.querySelectorAll(
    'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]):not([type="image"]):not([type="file"]), textarea, select'
  ).forEach((i) => {
    if (i instanceof HTMLInputElement && i.type === "radio") {
      const n = i.name;
      n && (t.has(n) || t.set(n, []), t.get(n).push(i));
    } else i instanceof HTMLElement && e.push(m(i));
  });
  for (const [i, n] of t.entries()) {
    if (n.length === 0) continue;
    const a = n[0], d = m(a);
    d.options = n.map((p) => {
      let s = "";
      if (p.id) {
        const c = document.querySelector(`label[for="${p.id}"]`);
        c && (s = c.textContent?.trim() || "");
      }
      if (!s) {
        const c = p.closest("label");
        c && (s = c.textContent?.trim() || "");
      }
      return {
        value: p.value,
        label: s || p.value
      };
    });
    for (const p of n) {
      const s = p.dataset.affHint;
      s && (d.hint += " " + s);
    }
    e.push(d);
  }
  return e;
}
function A(o, e) {
  const t = x.includes(e);
  o.checked = t, h(o);
}
function L(o, e) {
  const t = o.closest("form");
  if (!t || !o.name) return;
  const r = t.querySelectorAll(
    `input[type="radio"][name="${o.name}"]`
  );
  for (const i of r) {
    const n = M(i).toLowerCase(), a = i.value.toLowerCase();
    if (a === e || n === e || a.includes(e) || n.includes(e) || e.includes(a) || e.includes(n)) {
      i.checked = !0, h(i);
      break;
    }
  }
}
function N(o, e) {
  const t = T(e, o.type);
  t ? (o.value = t, h(o)) : l.formFillDebug && console.warn(`Could not parse date value "${e}" for ${o.type} input`);
}
function D(o, e, t) {
  let r = Array.from(o.options).find(
    (i) => i.value.toLowerCase() === e || i.text.toLowerCase() === e
  );
  r || (r = Array.from(o.options).find(
    (i) => i.value.toLowerCase().includes(e) || i.text.toLowerCase().includes(e) || e.includes(i.value.toLowerCase()) || e.includes(i.text.toLowerCase())
  )), r ? (o.value = r.value, h(o)) : l.formFillDebug && console.warn(
    `No matching option for select. Value: "${t}", Options:`,
    Array.from(o.options).map((i) => `${i.value} (${i.text})`)
  );
}
function g(o, e) {
  const t = e.trim().toLowerCase();
  if (!S(t))
    if (o instanceof HTMLInputElement)
      switch (o.type) {
        case "checkbox":
          A(o, t);
          break;
        case "radio":
          L(o, t);
          break;
        case "date":
        case "datetime-local":
        case "time":
          N(o, e);
          break;
        default:
          o.value = e, h(o);
      }
    else o instanceof HTMLTextAreaElement ? (o.value = e, h(o)) : o instanceof HTMLSelectElement && D(o, t, e);
}
function P(o) {
  return o.name || o.label || o.placeholder || "unknown";
}
function C(o, e) {
  let t = `Generate appropriate content for the following form field:

`;
  return o.label && (t += `Field Label: ${o.label}
`), o.name && (t += `Field Name: ${o.name}
`), t += `Field Type: ${o.type}
`, o.placeholder && (t += `Placeholder: ${o.placeholder}
`), o.pattern && (t += `Pattern/Format: ${o.pattern}
`), e && (t += `
Additional Context: ${e}
`), o.type === "checkbox" ? t = `${e}
Randomly return "true" or "false", no explanations. Dont repeat your choice too often.` : t += `
Provide a realistic and appropriate value for this field. Only return the value itself, no explanations.`, t;
}
function I(o, e) {
  let t = `Extract structured data from the following unstructured text and match it to the form fields.

`;
  t += `Form fields:
`;
  for (const r of o) {
    const i = r.name || r.label || r.placeholder || "unknown";
    if (t += `- ${i} (type: ${r.type})`, r.label && (t += ` - Label: "${r.label}"`), r.placeholder && (t += ` - Placeholder: "${r.placeholder}"`), r.type === "select" && r.element instanceof HTMLSelectElement) {
      const n = Array.from(r.element.options).map((a) => a.textContent?.trim() || "").filter((a) => a);
      t += ` - Options: [${n.join(", ")}]`;
    }
    if (r.type === "radio" && r.options) {
      const n = r.options.map((a) => a.label || a.value);
      t += ` - Options: [${n.join(", ")}]`;
    }
    r.type === "date" ? t += " - Format: YYYY-MM-DD" : r.type === "datetime-local" ? t += " - Format: YYYY-MM-DDTHH:MM" : r.type === "time" && (t += " - Format: HH:MM"), r.hint && (t += ` - Additional info: ${r.hint}`), t += `
`;
  }
  return t += `
Unstructured text:
${e}


    Extract the relevant information and return it as a JSON object where keys match the field names exactly.
    

    Only include fields where you found relevant data.
    

    For checkbox fields, return "true" if the text indicates the option should be checked, "false" or omit otherwise.
    

    For radio fields, return the value (preferred) or label of the selected option.
    

    Return ONLY the JSON object, no explanations or markdown formatting.
  `, t;
}
const v = {
  FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.",
  PARSE_EXTRACT: 'You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If its a checkbox field, return "true" if it should be checked, otherwise return "false" or omit the field.'
};
function O(o) {
  const e = {};
  for (const t of o) {
    const r = t.name || t.label;
    if (!r) continue;
    let i;
    switch (t.type) {
      case "number":
      case "range":
        i = { type: "number" };
        break;
      case "boolean":
      case "checkbox":
        i = { type: "boolean" };
        break;
      case "url":
        i = { type: "string", format: "uri" };
        break;
      case "date":
        i = { type: "string", format: "date" };
        break;
      case "datetime-local":
        i = { type: "string", format: "date-time" };
        break;
      case "time":
        i = { type: "string", format: "time" };
        break;
      default:
        i = { type: "string" };
        break;
    }
    if (t.pattern && (i.pattern = t.pattern), t.placeholder || t.hint) {
      const n = [];
      t.placeholder && n.push(t.placeholder), t.hint && n.push(t.hint), i.description = n.join(" - ");
    }
    e[r] = i;
  }
  return {
    type: "object",
    properties: e,
    additionalProperties: !1
  };
}
function R(o) {
  try {
    let e = o.trim();
    e = e.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const t = JSON.parse(e), r = {};
    for (const [i, n] of Object.entries(t))
      r[i] = String(n);
    return r;
  } catch (e) {
    return console.error("Failed to parse JSON response:", e), console.error("Response was:", o), {};
  }
}
function j(o) {
  try {
    return JSON.parse(o), !0;
  } catch {
    return !1;
  }
}
class Y extends w {
  providerName = "ollama";
  supportsStructuredResponses = !0;
  chatEndpoint;
  listModelsEndpoint;
  availabilityEndpoint;
  constructor(e) {
    super({
      apiEndpoint: e?.apiEndpoint || l.ollama.apiEndpoint,
      model: e?.model || l.ollama.model,
      timeout: e?.timeout || l.timeout
    }), this.chatEndpoint = this.apiEndpoint + "/api/chat", this.listModelsEndpoint = this.apiEndpoint + "/api/tags", this.availabilityEndpoint = this.apiEndpoint + "/api/tags";
  }
  async chat(e) {
    const t = new AbortController(), r = setTimeout(() => t.abort(), this.timeout), i = this.chatEndpoint;
    try {
      const n = {
        model: e.model,
        messages: e.messages,
        stream: !1,
        options: {
          num_predict: e.maxTokens
        }
      }, a = await fetch(i, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(n),
        signal: t.signal
      });
      if (!a.ok)
        throw new Error(`Ollama API error: ${a.status} ${a.statusText}`);
      const d = await a.json();
      return {
        content: d.message.content,
        model: d.model,
        finishReason: d.done ? "stop" : "length"
      };
    } catch (n) {
      if (n instanceof Error) {
        if (n.name === "AbortError")
          throw new Error(`Ollama request timed out after ${this.timeout}ms`);
        if (n.message.includes("fetch") || n.message.includes("Failed to fetch"))
          throw new Error(`Failed to connect to Ollama at ${this.apiEndpoint}. Is Ollama running?`);
      }
      throw n;
    } finally {
      clearTimeout(r);
    }
  }
  async listModels() {
    try {
      const e = await fetch(this.listModelsEndpoint);
      if (!e.ok)
        throw new Error(`Failed to fetch models: ${e.statusText}`);
      return ((await e.json()).models || []).map((r) => r.name);
    } catch (e) {
      return console.error("Error listing Ollama models:", e), [];
    }
  }
  async isAvailable() {
    try {
      return (await fetch(this.availabilityEndpoint, {
        method: "GET"
      })).ok;
    } catch {
      return !1;
    }
  }
}
class E extends $ {
  providerName = "openai";
  supportsStructuredResponses = !0;
  chatEndpoint;
  listModelsEndpoint;
  availabilityEndpoint;
  constructor(e) {
    super({
      apiEndpoint: e?.apiEndpoint || l.openai.apiEndpoint,
      model: e?.model || l.openai.model,
      timeout: e?.timeout || l.timeout
    }), this.chatEndpoint = `${this.apiEndpoint}/${this.providerName}/chat`, this.listModelsEndpoint = `${this.apiEndpoint}/${this.providerName}/models`, this.availabilityEndpoint = `${this.apiEndpoint}/${this.providerName}/available`;
  }
  async chat(e) {
    const t = new AbortController(), r = setTimeout(() => t.abort(), this.timeout), i = this.chatEndpoint;
    try {
      const a = await (await fetch(i, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(e),
        signal: t.signal
      })).json();
      return l.providerDebug && console.log(`${this.providerName} response body:`, a), {
        content: a.choices[0].message.content,
        model: a.model,
        finishReason: a.choices[0].finish_reason
      };
    } catch (n) {
      if (n instanceof Error) {
        if (n.name === "AbortError")
          throw new Error(`${this.providerName} request timed out after ${this.timeout}ms`);
        if (n.message.includes("fetch") || n.message.includes("Failed to fetch"))
          throw new Error(`Failed to connect to ${this.providerName}. Check your network connection.`);
      }
      throw n;
    } finally {
      clearTimeout(r);
    }
  }
  async listModels() {
    const e = this.listModelsEndpoint;
    try {
      const t = await fetch(e, { method: "POST" });
      if (!t.ok)
        throw new Error(`${this.providerName} API error: ${t.status} ${t.statusText}`);
      return (await t.json()).models;
    } catch (t) {
      if (l.providerDebug)
        throw new Error(`Error fetching models from ${this.providerName}: ${t}`);
      return [];
    }
  }
  async isAvailable() {
    const e = this.availabilityEndpoint;
    try {
      return (await fetch(e, { method: "POST" })).ok;
    } catch (t) {
      if (l.providerDebug)
        throw t;
      return !1;
    }
  }
}
class H extends E {
  providerName = "perplexity";
  constructor(e) {
    super({
      apiEndpoint: e?.apiEndpoint || l.perplexity.apiEndpoint,
      model: e?.model || l.perplexity.model,
      timeout: e?.timeout || l.timeout
    }), this.chatEndpoint = `${this.apiEndpoint}/${this.providerName}/chat`, this.listModelsEndpoint = `${this.apiEndpoint}/${this.providerName}/models`, this.availabilityEndpoint = `${this.apiEndpoint}/${this.providerName}/available`;
  }
}
class b {
  provider;
  allowedProviders;
  selectedFields;
  constructor(e, t) {
    e instanceof y ? this.provider = e : this.provider = b.constructProviderWithName(e, t), this.selectedFields = t?.targetFields, this.allowedProviders = t?.allowedProviders;
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
  async fillSingleField(e) {
    const t = m(e);
    l.formFillDebug && console.log(`Filling ${t.type} field: ${t.name}`);
    const r = C(t), i = [
      {
        role: "system",
        content: v.FIELD_FILL
      },
      {
        role: "user",
        content: r
      }
    ];
    try {
      const n = await this.provider.chat({
        messages: i,
        model: this.provider.getSelectedModel()
      });
      n.content && g(e, n.content.trim()), l.formFillDebug && console.log("Field filled with:", n.content);
    } catch (n) {
      l.formFillDebug && console.error("Error during fillSingleField:", n);
    }
  }
  /**
   * Parse unstructured text and automatically fill matching form fields
   * 
   * @param formElement - The HTML form to fill
   * @param unstructuredText - The source text to extract data from
   *   - Examples: Resume text, email body, paragraph descriptions, JSON strings
   */
  async parseAndFillForm(e, t) {
    const r = k(e);
    l.formFillDebug && (console.log("Parsing unstructured text for", r.length, "fields"), console.log("Unstructured text:", r));
    const i = this.selectedFields ? r.filter(
      (s) => s.name && this.selectedFields.includes(s.name)
    ) : r, n = I(i, t);
    l.formFillDebug && (console.groupCollapsed("Constructed parse prompt:"), console.log(n), console.groupEnd(), console.log(`Sending prompt to ${this.provider.getName()}'s ${this.provider.getSelectedModel()} model...`));
    const d = {
      messages: [
        {
          role: "system",
          content: v.PARSE_EXTRACT
        },
        {
          role: "user",
          content: n
        }
      ],
      model: this.provider.getSelectedModel()
    };
    this.provider.supportsStructuredOutput() && (d.format = O(i), l.formFillDebug && console.log("Using structured output format:", d.format));
    let p = {};
    try {
      const s = await this.provider.chat(d);
      if (!s.content) {
        l.formFillDebug && console.warn("No content received from AI provider.");
        return;
      }
      p = R(s.content);
    } catch (s) {
      l.formFillDebug && console.error("Error calling AI provider:", s);
      return;
    }
    l.formFillDebug && console.log("Extracted data:", p);
    for (const s of i) {
      const c = P(s);
      if (c && p[c])
        try {
          g(s.element, p[c]);
        } catch (u) {
          l.formFillDebug && console.error(`Failed to fill field "${c}":`, u);
        }
    }
  }
  /**
   * Get list of available models from the form's provider
   */
  async getAvailableModels() {
    return this.provider.listModels ? await this.provider.listModels() : [];
  }
  /**
   * Set the model to use for chat requests
   */
  async setSelectedModel(e) {
    return this.provider.setSelectedModel(e);
  }
  /**
   * Get the currently selected model
   */
  getSelectedModel() {
    return this.provider.getSelectedModel();
  }
  /**
   * Set which fields should be filled
   */
  setFields(e) {
    this.selectedFields = e || void 0;
  }
  /**
   * Get the currently configured field targets
   * 
   * @returns Array of field names being targeted, or undefined if all fields are targeted
   */
  getFields() {
    return this.selectedFields;
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
   * Change the AI provider
   */
  setProvider(e) {
    this.provider = e;
  }
  /**
   * Get the current AI provider
   */
  getProvider() {
    return this.provider;
  }
  /**
   * Get the list of allowed providers, if any
   */
  getListOfAllowedProviders() {
    return this.allowedProviders;
  }
  /**
   * Setup the AI provider based on the desired provider name
   */
  static constructProviderWithName(e, t) {
    const r = {
      apiEndpoint: t?.apiEndpoint || "",
      model: t?.model || "",
      timeout: t?.timeout
    };
    return {
      ollama: () => new Y(r),
      openai: () => new E(r),
      perplexity: () => new H(r)
      /** 
       * @extension Add more providers here as needed
       */
    }[e]();
  }
}
function q(o = "aff-form") {
  const e = document.getElementById(o), t = document.getElementById("aff-text"), r = document.getElementById("aff-text-button"), i = e.getAttribute("data-aff-provider") || "ollama", n = new b(i, { debug: !0 });
  r ? r.addEventListener("click", async () => {
    const a = t.value.trim();
    try {
      await n.parseAndFillForm(e, a);
    } catch (d) {
      console.error("Error filling form:", d);
    }
  }) : console.warn("AI Form Fill button not found");
}
export {
  b as AIFormFill,
  y as AIProvider,
  Y as LocalOllamaProvider,
  E as OpenAIProvider,
  H as PerplexityProvider,
  v as SYSTEM_PROMPTS,
  l as affConfig,
  m as analyzeField,
  C as buildFieldPrompt,
  I as buildParsePrompt,
  P as getFieldIdentifier,
  k as getFillTargets,
  q as initializeAFFQuick,
  j as isValidJson,
  R as parseJsonResponse,
  g as setFieldValue
};
