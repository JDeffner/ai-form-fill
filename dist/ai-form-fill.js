const a = {
  /**
   * Base URL of your backend proxy for all remote (OpenAI-compatible)
   * providers. Each provider appends `/<name>/chat` etc. to this.
   */
  apiBase: "http://localhost:5173/api",
  /** Default request timeout in milliseconds. */
  timeout: 3e4,
  /** Enable console logging across the library. */
  debug: !1,
  /** Ollama runs locally, so it has its own endpoint. */
  ollama: {
    apiEndpoint: "http://localhost:11434",
    model: "gemma3:4b"
  },
  /** Default model for each built-in remote preset. */
  openai: { model: "gpt-5-nano" },
  perplexity: { model: "sonar" },
  openrouter: { model: "openai/gpt-4o-mini" }
};
class y {
  /** Whether the provider can enforce a JSON schema on its output. */
  supportsStructured = !1;
  selectedModel;
  apiEndpoint;
  timeout;
  constructor(e) {
    this.apiEndpoint = e?.apiEndpoint || "", this.selectedModel = e?.model || "", this.timeout = e?.timeout || a.timeout;
  }
  /** The provider's identifier (e.g. `ollama`, `openrouter`). */
  getName() {
    return this.providerName;
  }
  /** Whether the provider is `local` or `remote`. */
  getType() {
    return this.providerType;
  }
  /** The model currently selected for requests. */
  getSelectedModel() {
    return this.selectedModel;
  }
  /**
   * Select a model, validating against {@link listModels} when possible.
   * Falls back to setting it unvalidated if the list cannot be fetched.
   * @returns `true` if the model was set.
   */
  async setSelectedModel(e) {
    if (!e) return !1;
    try {
      const t = await this.listModels();
      return t.includes(e) ? (this.selectedModel = e, !0) : (a.debug && console.warn(`Model "${e}" not found. Available: ${t.join(", ")}`), !1);
    } catch (t) {
      return a.debug && console.warn("Could not validate model:", t), this.selectedModel = e, !0;
    }
  }
  /** Whether the provider supports structured (JSON schema) output. */
  supportsStructuredOutput() {
    return this.supportsStructured;
  }
}
const $ = [
  "null",
  "",
  "n/a",
  "none",
  "no value",
  "empty",
  "undefined",
  "unknown",
  "missing"
], S = ["true", "yes", "1", "checked", "on"];
function f(o) {
  o.dispatchEvent(new Event("input", { bubbles: !0 })), o.dispatchEvent(new Event("change", { bubbles: !0 }));
}
function x(o) {
  return $.includes(o);
}
function v(o) {
  if (o.id) {
    const t = document.querySelector(`label[for="${o.id}"]`);
    if (t) return t.textContent?.trim() || "";
  }
  const e = o.closest("label");
  return e && e.textContent?.trim() || "";
}
function F(o, e) {
  let t = null;
  const n = o.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(n))
    t = new Date(n);
  else if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(n)) {
    const c = n.split(/[\/.-]/), d = parseInt(c[0], 10), h = parseInt(c[1], 10);
    let p = parseInt(c[2], 10);
    p < 100 && (p += 2e3), t = new Date(p, d - 1, h);
  } else {
    const c = Date.parse(n);
    isNaN(c) || (t = new Date(c));
  }
  if (e === "time") {
    const c = n.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
    if (c) {
      let d = parseInt(c[1], 10);
      const h = c[2], p = c[4]?.toLowerCase();
      return p === "pm" && d < 12 && (d += 12), p === "am" && d === 12 && (d = 0), `${d.toString().padStart(2, "0")}:${h}`;
    }
    return null;
  }
  if (!t || isNaN(t.getTime())) return null;
  const r = t.getFullYear(), i = (t.getMonth() + 1).toString().padStart(2, "0"), s = t.getDate().toString().padStart(2, "0"), l = t.getHours().toString().padStart(2, "0"), u = t.getMinutes().toString().padStart(2, "0");
  switch (e) {
    case "datetime-local":
      return `${r}-${i}-${s}T${l}:${u}`;
    case "month":
      return `${r}-${i}`;
    case "week": {
      const c = new Date(r, 0, 1), d = Math.floor((t.getTime() - c.getTime()) / (1440 * 60 * 1e3)), h = Math.ceil((d + c.getDay() + 1) / 7);
      return `${r}-W${h.toString().padStart(2, "0")}`;
    }
    default:
      return `${r}-${i}-${s}`;
  }
}
function m(o) {
  const e = { element: o, type: "text" };
  if (o instanceof HTMLInputElement ? (e.type = o.type, e.name = o.name, e.placeholder = o.placeholder, e.pattern = o.pattern, o.type === "checkbox" && (e.placeholder = o.value || "checkbox option"), o.type === "radio" && (e.placeholder = o.value || "radio option")) : o instanceof HTMLTextAreaElement ? (e.type = "textarea", e.name = o.name, e.placeholder = o.placeholder) : o instanceof HTMLSelectElement && (e.type = "select", e.name = o.name), o.id) {
    const n = document.querySelector(`label[for="${o.id}"]`);
    n && (e.label = n.textContent?.trim());
  }
  if (!e.label) {
    const n = o.closest("label");
    n && (e.label = n.textContent?.trim());
  }
  const t = o.dataset.affHint;
  return t && (e.hint = t), e;
}
function M(o) {
  const e = [], t = /* @__PURE__ */ new Map();
  o.querySelectorAll(
    'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]):not([type="image"]):not([type="file"]), textarea, select'
  ).forEach((r) => {
    r instanceof HTMLInputElement && r.type === "radio" ? r.name && (t.has(r.name) || t.set(r.name, []), t.get(r.name).push(r)) : r instanceof HTMLElement && e.push(m(r));
  });
  for (const [, r] of t.entries()) {
    if (r.length === 0) continue;
    const i = m(r[0]);
    i.options = r.map((s) => ({
      value: s.value,
      label: v(s) || s.value
    }));
    for (const s of r) {
      const l = s.dataset.affHint;
      l && (i.hint = `${i.hint ?? ""} ${l}`.trim());
    }
    e.push(i);
  }
  return e;
}
function T(o, e) {
  o.checked = S.includes(e), f(o);
}
function k(o, e) {
  const t = o.closest("form");
  if (!t || !o.name) return;
  const n = t.querySelectorAll(
    `input[type="radio"][name="${o.name}"]`
  );
  for (const r of n) {
    const i = v(r).toLowerCase(), s = r.value.toLowerCase();
    if (s === e || i === e || s.includes(e) || i.includes(e) || e.includes(s) || e.includes(i)) {
      r.checked = !0, f(r);
      break;
    }
  }
}
function A(o, e) {
  const t = F(e, o.type);
  t ? (o.value = t, f(o)) : a.debug && console.warn(`Could not parse date value "${e}" for ${o.type} input`);
}
function L(o, e, t) {
  let n = Array.from(o.options).find(
    (r) => r.value.toLowerCase() === e || r.text.toLowerCase() === e
  );
  n || (n = Array.from(o.options).find(
    (r) => r.value.toLowerCase().includes(e) || r.text.toLowerCase().includes(e) || e.includes(r.value.toLowerCase()) || e.includes(r.text.toLowerCase())
  )), n ? (o.value = n.value, f(o)) : a.debug && console.warn(
    `No matching option for select. Value: "${t}", Options:`,
    Array.from(o.options).map((r) => `${r.value} (${r.text})`)
  );
}
function E(o, e) {
  const t = e.trim().toLowerCase();
  if (!x(t))
    if (o instanceof HTMLInputElement)
      switch (o.type) {
        case "checkbox":
          T(o, t);
          break;
        case "radio":
          k(o, t);
          break;
        case "date":
        case "datetime-local":
        case "time":
          A(o, e);
          break;
        default:
          o.value = e, f(o);
      }
    else o instanceof HTMLTextAreaElement ? (o.value = e, f(o)) : o instanceof HTMLSelectElement && L(o, t, e);
}
function b(o) {
  return o.name || o.label || o.placeholder || "unknown";
}
function I(o, e) {
  let t = `Generate appropriate content for the following form field:

`;
  return o.label && (t += `Field Label: ${o.label}
`), o.name && (t += `Field Name: ${o.name}
`), t += `Field Type: ${o.type}
`, o.placeholder && (t += `Placeholder: ${o.placeholder}
`), o.pattern && (t += `Pattern/Format: ${o.pattern}
`), e && (t += `
Additional Context: ${e}
`), o.type === "checkbox" ? t += `
Return only "true" or "false" for this checkbox, no explanations.` : t += `
Provide a realistic and appropriate value for this field. Only return the value itself, no explanations.`, t;
}
function O(o, e) {
  let t = `Extract structured data from the following unstructured text and match it to the form fields.

`;
  t += `Form fields:
`;
  for (const n of o) {
    if (t += `- ${b(n)} (type: ${n.type})`, n.label && (t += ` - Label: "${n.label}"`), n.placeholder && (t += ` - Placeholder: "${n.placeholder}"`), n.type === "select" && n.element instanceof HTMLSelectElement) {
      const r = Array.from(n.element.options).map((i) => i.textContent?.trim() || "").filter((i) => i);
      t += ` - Options: [${r.join(", ")}]`;
    }
    if (n.type === "radio" && n.options) {
      const r = n.options.map((i) => i.label || i.value);
      t += ` - Options: [${r.join(", ")}]`;
    }
    n.type === "date" ? t += " - Format: YYYY-MM-DD" : n.type === "datetime-local" ? t += " - Format: YYYY-MM-DDTHH:MM" : n.type === "time" && (t += " - Format: HH:MM"), n.hint && (t += ` - Additional info: ${n.hint}`), t += `
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
const w = {
  /** Single-field generation: return only the value. */
  FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.",
  /** Data extraction: return only valid JSON. */
  PARSE_EXTRACT: 'You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If its a checkbox field, return "true" if it should be checked, otherwise return "false" or omit the field.'
};
function C(o) {
  const e = {};
  for (const t of o) {
    const n = b(t);
    if (!n || n === "unknown") continue;
    let r;
    switch (t.type) {
      case "number":
      case "range":
        r = { type: "number" };
        break;
      case "boolean":
      case "checkbox":
        r = { type: "boolean" };
        break;
      case "url":
        r = { type: "string", format: "uri" };
        break;
      case "date":
        r = { type: "string", format: "date" };
        break;
      case "datetime-local":
        r = { type: "string", format: "date-time" };
        break;
      case "time":
        r = { type: "string", format: "time" };
        break;
      default:
        r = { type: "string" };
        break;
    }
    t.pattern && (r.pattern = t.pattern), (t.placeholder || t.hint) && (r.description = [t.placeholder, t.hint].filter(Boolean).join(" - ")), e[n] = r;
  }
  return { type: "object", properties: e, additionalProperties: !1 };
}
function N(o) {
  try {
    let e = o.trim();
    e = e.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const t = JSON.parse(e), n = {};
    for (const [r, i] of Object.entries(t))
      n[r] = String(i);
    return n;
  } catch (e) {
    return console.error("Failed to parse JSON response:", e), console.error("Response was:", o), {};
  }
}
function D(o) {
  try {
    return JSON.parse(o), !0;
  } catch {
    return !1;
  }
}
class P extends y {
  providerName = "ollama";
  providerType = "local";
  supportsStructured = !0;
  chatEndpoint;
  tagsEndpoint;
  constructor(e) {
    super({
      apiEndpoint: e?.apiEndpoint || a.ollama.apiEndpoint,
      model: e?.model || a.ollama.model,
      timeout: e?.timeout || a.timeout
    }), this.chatEndpoint = `${this.apiEndpoint}/api/chat`, this.tagsEndpoint = `${this.apiEndpoint}/api/tags`;
  }
  async chat(e) {
    const t = new AbortController(), n = setTimeout(() => t.abort(), this.timeout);
    try {
      const r = await fetch(this.chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: e.model,
          messages: e.messages,
          stream: !1,
          // Ollama takes a JSON schema in the top-level `format` field.
          ...e.format ? { format: e.format } : {},
          options: { num_predict: e.maxTokens }
        }),
        signal: t.signal
      });
      if (!r.ok)
        throw new Error(`Ollama API error: ${r.status} ${r.statusText}`);
      const i = await r.json();
      return {
        content: i.message.content,
        model: i.model,
        finishReason: i.done ? "stop" : "length"
      };
    } catch (r) {
      if (r instanceof Error) {
        if (r.name === "AbortError")
          throw new Error(`Ollama request timed out after ${this.timeout}ms`);
        if (r.message.includes("fetch"))
          throw new Error(`Failed to connect to Ollama at ${this.apiEndpoint}. Is Ollama running?`);
      }
      throw r;
    } finally {
      clearTimeout(n);
    }
  }
  async listModels() {
    try {
      const e = await fetch(this.tagsEndpoint);
      if (!e.ok)
        throw new Error(`Failed to fetch models: ${e.statusText}`);
      return ((await e.json()).models ?? []).map((n) => n.name);
    } catch (e) {
      return a.debug && console.error("Error listing Ollama models:", e), [];
    }
  }
  async isAvailable() {
    try {
      return (await fetch(this.tagsEndpoint)).ok;
    } catch {
      return !1;
    }
  }
}
class Y extends y {
  providerName;
  providerType = "remote";
  supportsStructured = !0;
  chatEndpoint;
  listModelsEndpoint;
  availabilityEndpoint;
  /**
   * @param name - A preset (`openai` | `perplexity` | `openrouter`) or any
   *   custom route name handled by your proxy.
   * @param config - Optional endpoint / model / timeout overrides.
   */
  constructor(e = "openai", t) {
    const n = {
      openai: a.openai.model,
      perplexity: a.perplexity.model,
      openrouter: a.openrouter.model
    };
    super({
      apiEndpoint: t?.apiEndpoint || a.apiBase,
      model: t?.model || n[e] || "",
      timeout: t?.timeout || a.timeout
    }), this.providerName = e, this.chatEndpoint = `${this.apiEndpoint}/${e}/chat`, this.listModelsEndpoint = `${this.apiEndpoint}/${e}/models`, this.availabilityEndpoint = `${this.apiEndpoint}/${e}/available`;
  }
  async chat(e) {
    const t = new AbortController(), n = setTimeout(() => t.abort(), this.timeout);
    try {
      const r = await fetch(this.chatEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
        signal: t.signal
      });
      if (!r.ok)
        throw new Error(`${this.providerName} API error: ${r.status} ${r.statusText}`);
      const i = await r.json();
      if (a.debug && console.log(`${this.providerName} response body:`, i), !i.choices?.length)
        throw new Error(`${this.providerName} returned no choices`);
      return {
        content: i.choices[0].message.content,
        model: i.model,
        finishReason: i.choices[0].finish_reason
      };
    } catch (r) {
      if (r instanceof Error) {
        if (r.name === "AbortError")
          throw new Error(`${this.providerName} request timed out after ${this.timeout}ms`);
        if (r.message.includes("fetch"))
          throw new Error(`Failed to connect to ${this.providerName}. Check your network connection.`);
      }
      throw r;
    } finally {
      clearTimeout(n);
    }
  }
  async listModels() {
    try {
      const e = await fetch(this.listModelsEndpoint, { method: "POST" });
      if (!e.ok)
        throw new Error(`${this.providerName} API error: ${e.status} ${e.statusText}`);
      return (await e.json()).models ?? [];
    } catch (e) {
      return a.debug && console.error(`Error fetching models from ${this.providerName}:`, e), [];
    }
  }
  async isAvailable() {
    try {
      return (await fetch(this.availabilityEndpoint, { method: "POST" })).ok;
    } catch {
      return !1;
    }
  }
}
class g {
  provider;
  selectedFields;
  /**
   * @param provider - A built-in provider name or a custom {@link AIProvider}.
   * @param options - Field targeting, debug, and provider overrides.
   */
  constructor(e, t) {
    t?.debug !== void 0 && (a.debug = t.debug), this.provider = e instanceof y ? e : g.createProvider(e, t), this.selectedFields = t?.targetFields;
  }
  /**
   * Generate and set content for a single field, inferred from its label,
   * name, placeholder and type. Useful when there is no source text.
   *
   * @param element - The input, textarea or select to fill.
   */
  async fillSingleField(e) {
    const t = m(e);
    a.debug && console.log(`Filling ${t.type} field: ${t.name}`);
    const n = [
      { role: "system", content: w.FIELD_FILL },
      { role: "user", content: I(t) }
    ];
    try {
      const r = await this.provider.chat({
        messages: n,
        model: this.provider.getSelectedModel()
      });
      r.content && E(e, r.content.trim()), a.debug && console.log("Field filled with:", r.content);
    } catch (r) {
      a.debug && console.error("Error during fillSingleField:", r);
    }
  }
  /**
   * Parse unstructured text and fill every matching field in the form.
   *
   * @param formElement - The form to fill.
   * @param unstructuredText - Source text (resume, email, description, ...).
   */
  async parseAndFillForm(e, t) {
    const n = M(e), r = this.selectedFields ? n.filter((l) => l.name && this.selectedFields.includes(l.name)) : n, i = {
      messages: [
        { role: "system", content: w.PARSE_EXTRACT },
        { role: "user", content: O(r, t) }
      ],
      model: this.provider.getSelectedModel()
    };
    this.provider.supportsStructuredOutput() && (i.format = C(r));
    let s = {};
    try {
      const l = await this.provider.chat(i);
      if (!l.content) {
        a.debug && console.warn("No content received from AI provider.");
        return;
      }
      s = N(l.content);
    } catch (l) {
      a.debug && console.error("Error calling AI provider:", l);
      return;
    }
    a.debug && console.log("Extracted data:", s);
    for (const l of r) {
      const u = b(l);
      if (u && s[u])
        try {
          E(l.element, s[u]);
        } catch (c) {
          a.debug && console.error(`Failed to fill field "${u}":`, c);
        }
    }
  }
  /** List the models offered by the current provider. */
  getAvailableModels() {
    return this.provider.listModels();
  }
  /** Select the model to use, validated against the provider when possible. */
  setSelectedModel(e) {
    return this.provider.setSelectedModel(e);
  }
  /** The currently selected model. */
  getSelectedModel() {
    return this.provider.getSelectedModel();
  }
  /** Restrict filling to these field names, or pass `undefined` to fill all. */
  setFields(e) {
    this.selectedFields = e;
  }
  /** The field names currently targeted, or `undefined` if all are targeted. */
  getFields() {
    return this.selectedFields;
  }
  /** Whether the current provider is reachable. */
  providerAvailable() {
    return this.provider.isAvailable();
  }
  /** Swap the active provider. */
  setProvider(e) {
    this.provider = e;
  }
  /** The active provider. */
  getProvider() {
    return this.provider;
  }
  /** Build a built-in provider from its name. */
  static createProvider(e, t) {
    const n = {
      apiEndpoint: t?.apiEndpoint,
      model: t?.model,
      timeout: t?.timeout
    };
    return e === "ollama" ? new P(n) : new Y(e, n);
  }
}
function H(o = "aff-form") {
  const e = document.getElementById(o), t = document.getElementById("aff-text"), n = document.getElementById("aff-text-button"), r = e.getAttribute("data-aff-provider") || "ollama", i = new g(r, { debug: !0 });
  n ? n.addEventListener("click", async () => {
    const s = t.value.trim();
    try {
      await i.parseAndFillForm(e, s);
    } catch (l) {
      console.error("Error filling form:", l);
    }
  }) : console.warn("AI Form Fill button not found");
}
export {
  g as AIFormFill,
  y as AIProvider,
  P as LocalOllamaProvider,
  Y as OpenAICompatibleProvider,
  w as SYSTEM_PROMPTS,
  a as affConfig,
  m as analyzeField,
  I as buildFieldPrompt,
  O as buildParsePrompt,
  C as generateFormSchema,
  b as getFieldIdentifier,
  M as getFillTargets,
  H as initializeAFFQuick,
  D as isValidJson,
  N as parseJsonResponse,
  E as setFieldValue
};
