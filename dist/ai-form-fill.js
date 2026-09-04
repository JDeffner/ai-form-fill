const A = Object.freeze({
  /** Default request timeout in milliseconds. */
  timeout: 3e4,
  /** Ollama runs locally and is talked to directly. */
  ollama: Object.freeze({
    baseUrl: "http://localhost:11434",
    model: "gemma3:4b"
  }),
  /** Built-in OpenAI-compatible presets: default base URL and model. */
  openai: Object.freeze({
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5-nano"
  }),
  perplexity: Object.freeze({
    baseUrl: "https://api.perplexity.ai",
    model: "sonar"
  }),
  openrouter: Object.freeze({
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini"
  })
});
class C {
  /** Whether the provider can enforce a JSON schema on its output. */
  supportsStructured = !1;
  selectedModel;
  baseUrl;
  timeout;
  fetchImpl;
  constructor(t) {
    this.baseUrl = (t?.baseUrl ?? "").replace(/\/+$/, ""), this.selectedModel = t?.model ?? "", this.timeout = t?.timeout ?? A.timeout, this.fetchImpl = t?.fetch;
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
   * Select a model.
   *
   * By default the name is validated against {@link listModels}: the model is
   * only set — and `true` returned — when it is actually offered. When the
   * model list cannot be fetched, nothing is set and `false` is returned.
   *
   * Pass `{ validate: false }` to set the model unvalidated (always `true`),
   * e.g. for providers whose model list endpoint is unavailable.
   */
  async setSelectedModel(t, r) {
    if (!t) return !1;
    if (r?.validate === !1)
      return this.selectedModel = t, !0;
    let n;
    try {
      n = await this.listModels();
    } catch {
      return !1;
    }
    return n.includes(t) ? (this.selectedModel = t, !0) : !1;
  }
  /** Whether the provider supports structured (JSON schema) output. */
  supportsStructuredOutput() {
    return this.supportsStructured;
  }
}
function $(e) {
  if (e.id) {
    const r = document.querySelector(`label[for="${e.id}"]`);
    if (r) return r.textContent?.trim() || "";
  }
  const t = e.closest("label");
  return t && t.textContent?.trim() || "";
}
function x(e) {
  const t = e.closest("form");
  return !t || !e.name ? [e] : Array.from(
    t.querySelectorAll(
      `input[type="${e.type}"][name="${e.name}"]`
    )
  );
}
function U(e) {
  if (e instanceof HTMLSelectElement)
    return e.multiple ? Array.from(e.selectedOptions, (t) => t.value) : e.value;
  if (e instanceof HTMLTextAreaElement) return e.value;
  if (e instanceof HTMLInputElement) {
    if (e.type === "radio")
      return x(e).find((t) => t.checked)?.value ?? "";
    if (e.type === "checkbox") {
      const t = x(e);
      return t.length > 1 ? t.filter((r) => r.checked).map((r) => r.value || "on") : e.checked ? "true" : "false";
    }
    return e.value;
  }
  return "";
}
function D(e) {
  const t = U(e);
  return Array.isArray(t) ? t.length === 0 : e instanceof HTMLInputElement && e.type === "checkbox" ? !e.checked : t === "";
}
function Q(e) {
  return e instanceof HTMLInputElement ? e.type === "radio" || e.type === "checkbox" ? x(e).some((t) => t.required) : e.required : e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement ? e.required : !1;
}
function Z(e) {
  const t = e.getAttribute("aria-label")?.trim();
  if (t) return t;
  const r = e.getAttribute("aria-labelledby");
  if (r) {
    const o = r.split(/\s+/).map((a) => document.getElementById(a)?.textContent?.trim() ?? "").filter(Boolean).join(" ");
    if (o) return o;
  }
  const n = e.getAttribute("title")?.trim();
  if (n) return n;
}
function ee(e) {
  return Array.from(e.options).filter((t) => t.value !== "").map((t) => ({
    value: t.value,
    label: t.textContent?.trim() || t.value
  }));
}
function N(e) {
  const t = { element: e, key: "", type: "text" };
  if (e instanceof HTMLInputElement ? (t.type = e.type, t.name = e.name || void 0, t.placeholder = e.placeholder || void 0, t.pattern = e.pattern || void 0, e.type === "checkbox" && (t.placeholder = e.value || "checkbox option"), e.type === "radio" && (t.placeholder = e.value || "radio option")) : e instanceof HTMLTextAreaElement ? (t.type = "textarea", t.name = e.name || void 0, t.placeholder = e.placeholder || void 0) : e instanceof HTMLSelectElement && (t.type = "select", t.name = e.name || void 0, t.options = ee(e), e.multiple && (t.multiple = !0)), e.id) {
    const n = document.querySelector(`label[for="${e.id}"]`);
    n && (t.label = n.textContent?.trim());
  }
  if (!t.label) {
    const n = e.closest("label");
    n && (t.label = n.textContent?.trim());
  }
  t.label || (t.label = Z(e));
  const r = e.dataset.affHint;
  return r && (t.hint = r), t.key = t.name || e.id || "field", t;
}
function W(e, t) {
  e.hint = void 0;
  for (const r of t) {
    const n = r.dataset.affHint;
    n && (e.hint = `${e.hint ?? ""} ${n}`.trim());
  }
}
function te(e) {
  const t = N(e[0]);
  return t.options = e.map((r) => ({
    value: r.value,
    label: $(r) || r.value
  })), W(t, e), t;
}
function re(e) {
  const t = N(e[0]);
  return t.multiple = !0, t.placeholder = void 0, t.options = e.map((r) => ({
    value: r.value || "on",
    label: $(r) || r.value || "on"
  })), W(t, e), t;
}
function ne(e) {
  const t = /* @__PURE__ */ new Set();
  e.forEach((r, n) => {
    const o = r.name || r.element.id || `field_${n + 1}`;
    let a = o, i = 2;
    for (; t.has(a); )
      a = `${o}_${i}`, i += 1;
    t.add(a), r.key = a;
  });
}
function V(e) {
  const t = Array.from(
    e.querySelectorAll(
      'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]):not([type="image"]):not([type="file"]), textarea, select'
    )
  ), r = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
  for (const i of t) {
    if (!(i instanceof HTMLInputElement) || !i.name) continue;
    const s = i.type === "radio" ? r : i.type === "checkbox" ? n : void 0;
    s && (s.has(i.name) || s.set(i.name, []), s.get(i.name).push(i));
  }
  const o = [], a = /* @__PURE__ */ new Set();
  for (const i of t)
    if (i instanceof HTMLElement) {
      if (i instanceof HTMLInputElement && i.type === "radio") {
        if (!i.name || a.has(`radio:${i.name}`)) continue;
        a.add(`radio:${i.name}`), o.push(te(r.get(i.name)));
        continue;
      }
      if (i instanceof HTMLInputElement && i.type === "checkbox" && i.name && n.get(i.name).length > 1) {
        if (a.has(`checkbox:${i.name}`)) continue;
        a.add(`checkbox:${i.name}`), o.push(re(n.get(i.name)));
        continue;
      }
      o.push(N(i));
    }
  return ne(o), o;
}
const oe = [
  "null",
  "",
  "n/a",
  "none",
  "no value",
  "empty",
  "undefined",
  "unknown",
  "missing"
], ae = ["true", "yes", "1", "checked", "on"], ie = ["false", "no", "0", "unchecked", "off"], g = (e) => ({ applied: !0, value: e }), u = (e) => ({ applied: !1, reason: e });
function h(e) {
  e.dispatchEvent(new Event("input", { bubbles: !0 })), e.dispatchEvent(new Event("change", { bubbles: !0 }));
}
function w(e) {
  return e.trim().toLowerCase().replace(/\s+/g, " ");
}
function k(e) {
  return oe.includes(
    w(e)
  );
}
function E(e) {
  return typeof e == "string" ? e : typeof e == "number" || typeof e == "boolean" ? String(e) : null;
}
function S(e, t) {
  const r = e instanceof HTMLInputElement ? HTMLInputElement.prototype : e instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype, n = Object.getOwnPropertyDescriptor(r, "value");
  n?.set ? n.set.call(e, t) : e.value = t;
}
function M(e, t) {
  const r = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  r?.set ? r.set.call(e, t) : e.checked = t;
}
function Y(e, t, r) {
  if (e === t || e === r) return !0;
  const n = w(e);
  return n === w(t) || n === w(r);
}
function q(e, t, r, n) {
  const o = t.find((s) => r(s) === e);
  if (o) return o;
  const a = t.find((s) => n(s) === e);
  if (a) return a;
  const i = w(e);
  return t.find(
    (s) => w(r(s)) === i || w(n(s)) === i
  );
}
const se = /^(\d{4})-(\d{2})-(\d{2})$/, le = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, ce = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, ue = /^\d{4}-(0[1-9]|1[0-2])$/, de = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
function K(e, t, r) {
  const n = new Date(e, t - 1, r);
  return n.getFullYear() === e && n.getMonth() === t - 1 && n.getDate() === r;
}
function fe(e, t) {
  const r = e.trim();
  switch (t) {
    case "date": {
      const n = se.exec(r);
      return n && K(Number(n[1]), Number(n[2]), Number(n[3])) ? r : null;
    }
    case "datetime-local": {
      const n = le.exec(r);
      return n && K(Number(n[1]), Number(n[2]), Number(n[3])) ? r : null;
    }
    case "time": {
      const n = /^\d:/.test(r) ? `0${r}` : r;
      return ce.test(n) ? n : null;
    }
    case "month":
      return ue.test(r) ? r : null;
    case "week":
      return de.test(r) ? r : null;
    default:
      return null;
  }
}
function z(e, t) {
  const r = E(t);
  return r === null ? u("unsupported-value") : k(r) ? u("empty-value") : (S(e, r), h(e), g(r));
}
function pe(e, t) {
  const r = E(t);
  if (r === null) return u("unsupported-value");
  if (k(r)) return u("empty-value");
  const n = fe(r, e.type);
  return n === null ? u("invalid-date-format") : (S(e, n), h(e), g(n));
}
function he(e, t) {
  const r = x(e);
  if (r.length > 1 || Array.isArray(t)) {
    const s = (Array.isArray(t) ? t : [t]).map(E).filter((l) => l !== null && !k(l));
    if (s.length === 0) return u("empty-value");
    const c = [];
    for (const l of r) {
      const m = l.value || "on", y = $(l) || m, b = s.some(
        (d) => Y(d, m, y)
      );
      b !== l.checked && (M(l, b), h(l)), b && c.push(m);
    }
    return c.length === 0 ? u("no-matching-option") : g(c);
  }
  if (typeof t == "boolean")
    return M(e, t), h(e), g(String(t));
  const n = E(t);
  if (n === null) return u("unsupported-value");
  if (n.trim() === "") return u("empty-value");
  const o = w(n);
  let a;
  if (ae.includes(o)) a = !0;
  else if (ie.includes(o)) a = !1;
  else if (Y(n, e.value || "on", $(e))) a = !0;
  else return k(n) ? u("empty-value") : u("unsupported-value");
  return M(e, a), h(e), g(String(a));
}
function me(e, t) {
  const r = E(t);
  if (r === null) return u("unsupported-value");
  if (k(r)) return u("empty-value");
  const n = x(e), o = q(
    r,
    n,
    (a) => a.value,
    (a) => $(a) || a.value
  );
  return o ? (M(o, !0), h(o), g(o.value)) : u("no-matching-option");
}
function ye(e, t) {
  if (e.multiple) return be(e, t);
  const r = E(t);
  if (r === null) return u("unsupported-value");
  if (k(r)) return u("empty-value");
  const n = Array.from(e.options).filter((a) => a.value !== ""), o = q(
    r,
    n,
    (a) => a.value,
    (a) => a.textContent?.trim() || a.value
  );
  return o ? (S(e, o.value), h(e), g(o.value)) : u("no-matching-option");
}
function be(e, t) {
  const n = (Array.isArray(t) ? t : [t]).map(E).filter((i) => i !== null && !k(i));
  if (n.length === 0) return u("empty-value");
  const o = Array.from(e.options).filter((i) => i.value !== ""), a = [];
  for (const i of o) {
    const s = i.textContent?.trim() || i.value, c = n.some((l) => Y(l, i.value, s));
    i.selected = c, c && a.push(i.value);
  }
  return a.length === 0 ? u("no-matching-option") : (h(e), g(a));
}
function J(e, t) {
  if (t == null) return u("empty-value");
  if (e instanceof HTMLInputElement)
    switch (e.type) {
      case "checkbox":
        return he(e, t);
      case "radio":
        return me(e, t);
      case "date":
      case "datetime-local":
      case "time":
      case "month":
      case "week":
        return pe(e, t);
      default:
        return z(e, t);
    }
  return e instanceof HTMLTextAreaElement ? z(e, t) : e instanceof HTMLSelectElement ? ye(e, t) : u("unsupported-value");
}
function F(e, t, r) {
  e.dispatchEvent(new CustomEvent(t, { detail: r, bubbles: !0, composed: !0 }));
}
function ve(e, t) {
  let r = `Generate appropriate content for the following form field:

`;
  return e.label && (r += `Field Label: ${e.label}
`), e.name && (r += `Field Name: ${e.name}
`), r += `Field Type: ${e.type}
`, e.placeholder && (r += `Placeholder: ${e.placeholder}
`), e.pattern && (r += `Pattern/Format: ${e.pattern}
`), e.options?.length && (r += `Allowed values: ${e.options.map((n) => n.value).join(", ")}
`), t && (r += `
Additional Context: ${t}
`), e.type === "checkbox" ? r += `
Return only "true" or "false" for this checkbox, no explanations.` : r += `
Provide a realistic and appropriate value for this field. Only return the value itself, no explanations.`, r;
}
function ge(e) {
  return ` - Allowed values: [${(e.options ?? []).map(
    (n) => n.label && n.label !== n.value ? `"${n.value}" (${n.label})` : `"${n.value}"`
  ).join(", ")}] (return the value exactly as written)`;
}
function we(e, t) {
  let r = `Extract structured data from the following unstructured text and match it to the form fields.

`;
  r += `Form fields:
`;
  for (const n of e) {
    const o = n.multiple ? `${n.type}, multiple values allowed` : n.type;
    r += `- ${n.key} (type: ${o})`, n.label && (r += ` - Label: "${n.label}"`), n.placeholder && (r += ` - Placeholder: "${n.placeholder}"`), n.options?.length && (r += ge(n)), n.type === "date" ? r += " - Format: YYYY-MM-DD" : n.type === "datetime-local" ? r += " - Format: YYYY-MM-DDTHH:MM" : n.type === "time" ? r += " - Format: HH:MM (24h)" : n.type === "month" ? r += " - Format: YYYY-MM" : n.type === "week" && (r += " - Format: YYYY-Www"), n.hint && (r += ` - Additional info: ${n.hint}`), r += `
`;
  }
  return r += `
Unstructured text:
${t}

`, r += `Extract the relevant information and return it as a JSON object whose keys match the field keys exactly.
Only include fields where you found relevant data.
For checkbox fields, return true if the text indicates the option should be checked, false or omit otherwise.
For fields with allowed values, return one of the allowed values exactly as written.
For fields that allow multiple values, return an array of allowed values.
Dates and times must use the stated ISO format.
Return ONLY the JSON object, no explanations or markdown formatting.
`, r;
}
const B = {
  /** Single-field generation: return only the value. */
  FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.",
  /** Data extraction: return only valid JSON. */
  EXTRACT: "You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If a field is a checkbox, return true if it should be checked, otherwise return false or omit the field."
};
function xe(e) {
  const t = {};
  for (const r of e) {
    const n = r.options?.map((a) => a.value) ?? [];
    let o;
    if (r.multiple && n.length > 0)
      o = { type: "array", items: { type: "string", enum: n } };
    else if (n.length > 0)
      o = { type: "string", enum: n };
    else
      switch (r.type) {
        case "number":
        case "range":
          o = { type: "number" };
          break;
        case "boolean":
        case "checkbox":
          o = { type: "boolean" };
          break;
        case "url":
          o = { type: "string", format: "uri" };
          break;
        // Date/time fields use regex patterns matching exactly what the HTML
        // inputs accept. JSON-schema `format: 'time'`/`'date-time'` would be
        // wrong here: providers that enforce formats (e.g. Ollama) generate
        // RFC 3339 values with seconds and UTC offset, which date/time inputs
        // reject. `[0-9]` instead of `\d` because grammar-based enforcers
        // (llama.cpp) only support a regex subset.
        case "date":
          o = { type: "string", format: "date" };
          break;
        case "datetime-local":
          o = {
            type: "string",
            pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$"
          };
          break;
        case "time":
          o = { type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" };
          break;
        case "month":
          o = { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" };
          break;
        case "week":
          o = { type: "string", pattern: "^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$" };
          break;
        default:
          o = { type: "string" };
          break;
      }
    r.pattern && (o.pattern = r.pattern), (r.placeholder || r.hint) && (o.description = [r.placeholder, r.hint].filter(Boolean).join(" - ")), t[r.key] = o;
  }
  return { type: "object", properties: t, additionalProperties: !1 };
}
class I extends Error {
  constructor(t, r) {
    super(t, r), this.name = "AFFError";
  }
}
class T extends I {
  /** Name of the provider that failed (e.g. `ollama`, `openai`). */
  provider;
  /** HTTP status code, when the failure was an HTTP error response. */
  status;
  constructor(t, r) {
    super(t, { cause: r.cause }), this.name = "ProviderError", this.provider = r.provider, this.status = r.status;
  }
}
class j extends I {
  /** The unmodified model output that failed to parse. */
  raw;
  constructor(t, r) {
    super(t, { cause: r.cause }), this.name = "ResponseParseError", this.raw = r.raw;
  }
}
function ke(e) {
  const t = e.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let r;
  try {
    r = JSON.parse(t);
  } catch (n) {
    throw new j("Model response is not valid JSON", {
      raw: e,
      cause: n
    });
  }
  if (r === null || typeof r != "object" || Array.isArray(r))
    throw new j("Model response is not a JSON object", { raw: e });
  return r;
}
function He(e) {
  try {
    return JSON.parse(e), !0;
  } catch {
    return !1;
  }
}
async function O(e, t) {
  const { method: r = "GET", body: n, headers: o, timeout: a, signal: i, provider: s, fetchImpl: c } = t, l = c ?? fetch, m = new AbortController(), y = setTimeout(() => m.abort(), a), b = () => m.abort(i?.reason);
  if (i) {
    if (i.aborted)
      throw clearTimeout(y), i.reason ?? new DOMException("Aborted", "AbortError");
    i.addEventListener("abort", b, { once: !0 });
  }
  try {
    const d = await l(e, {
      method: r,
      headers: {
        ...n !== void 0 ? { "Content-Type": "application/json" } : {},
        ...o
      },
      body: n !== void 0 ? JSON.stringify(n) : void 0,
      signal: m.signal
    });
    if (!d.ok)
      throw new T(
        `${s}: HTTP ${d.status} ${d.statusText} from ${e}`,
        { provider: s, status: d.status }
      );
    try {
      return await d.json();
    } catch (L) {
      throw new T(`${s}: invalid JSON in response from ${e}`, {
        provider: s,
        cause: L
      });
    }
  } catch (d) {
    throw d instanceof T ? d : (typeof d == "object" && d !== null && "name" in d ? String(d.name) : "") === "AbortError" ? i?.aborted ? d : new T(`${s}: request timed out after ${a}ms`, {
      provider: s,
      cause: d
    }) : new T(`${s}: failed to connect to ${e}`, {
      provider: s,
      cause: d
    });
  } finally {
    clearTimeout(y), i?.removeEventListener("abort", b);
  }
}
class Ee extends C {
  providerName = "ollama";
  providerType = "local";
  supportsStructured = !0;
  constructor(t) {
    super({
      baseUrl: t?.baseUrl ?? A.ollama.baseUrl,
      model: t?.model ?? A.ollama.model,
      timeout: t?.timeout,
      fetch: t?.fetch
    });
  }
  async chat(t) {
    const r = await O(`${this.baseUrl}/api/chat`, {
      method: "POST",
      body: {
        model: t.model,
        messages: t.messages,
        stream: !1,
        // Ollama takes a JSON schema in the top-level `format` field.
        ...t.format ? { format: t.format } : {},
        ...t.maxTokens ? { options: { num_predict: t.maxTokens } } : {}
      },
      timeout: this.timeout,
      signal: t.signal,
      provider: this.providerName,
      fetchImpl: this.fetchImpl
    });
    return {
      content: r.message?.content ?? null,
      model: r.model,
      finishReason: r.done ? "stop" : "length"
    };
  }
  async listModels() {
    return ((await O(`${this.baseUrl}/api/tags`, {
      timeout: this.timeout,
      provider: this.providerName,
      fetchImpl: this.fetchImpl
    })).models ?? []).map((r) => r.name);
  }
  async isAvailable() {
    try {
      return await this.listModels(), !0;
    } catch {
      return !1;
    }
  }
}
function Te() {
  return typeof window < "u" && typeof window.document < "u";
}
class Ae extends C {
  providerName;
  providerType = "remote";
  supportsStructured = !0;
  apiKey;
  extraHeaders;
  /**
   * @param name - A preset (`openai` | `perplexity` | `openrouter`) or any
   *   name for a custom OpenAI-compatible service (requires `baseUrl`).
   * @param config - baseUrl / apiKey / model / timeout / headers overrides.
   */
  constructor(t = "openai", r) {
    const o = {
      openai: A.openai,
      perplexity: A.perplexity,
      openrouter: A.openrouter
    }[t], a = r?.baseUrl ?? o?.baseUrl;
    if (!a)
      throw new I(
        `No baseUrl for provider "${t}". Non-preset providers require { baseUrl }.`
      );
    if (super({
      baseUrl: a,
      model: r?.model ?? o?.model ?? "",
      timeout: r?.timeout,
      fetch: r?.fetch
    }), this.providerName = t, r?.apiKey && Te() && !r.allowApiKeyInBrowser)
      throw new I(
        "Refusing to use an API key in the browser: it would be visible to anyone. Point baseUrl at a server-side proxy instead, or pass allowApiKeyInBrowser: true for local prototyping only."
      );
    this.apiKey = r?.apiKey, this.extraHeaders = r?.headers;
  }
  buildHeaders() {
    return {
      ...this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      ...this.extraHeaders
    };
  }
  async chat(t) {
    const r = {
      model: t.model,
      messages: t.messages
    };
    t.maxTokens !== void 0 && (r.max_tokens = t.maxTokens), t.format && (r.response_format = {
      type: "json_schema",
      json_schema: { name: "form_fields", schema: t.format }
    });
    const n = await O(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      body: r,
      headers: this.buildHeaders(),
      timeout: this.timeout,
      signal: t.signal,
      provider: this.providerName,
      fetchImpl: this.fetchImpl
    }), o = n.choices?.[0];
    if (!o)
      throw new T(`${this.providerName}: response contained no choices`, {
        provider: this.providerName
      });
    return {
      content: o.message?.content ?? null,
      model: n.model,
      finishReason: o.finish_reason
    };
  }
  async listModels() {
    return ((await O(`${this.baseUrl}/models`, {
      headers: this.buildHeaders(),
      timeout: this.timeout,
      provider: this.providerName,
      fetchImpl: this.fetchImpl
    })).data ?? []).map((r) => r.id);
  }
  async isAvailable() {
    try {
      return await this.listModels(), !0;
    } catch {
      return !1;
    }
  }
}
class R {
  provider;
  targetFields;
  debug;
  /**
   * @param provider - A built-in provider name or a custom {@link AIProvider}.
   * @param options - Field targeting, debug, and provider configuration.
   */
  constructor(t, r) {
    this.debug = r?.debug ?? !1, this.provider = t instanceof C ? t : R.createProvider(t, r), this.targetFields = r?.targetFields;
  }
  log(...t) {
    this.debug && console.log("[ai-form-fill]", ...t);
  }
  /**
   * Generate and apply content for a single field, inferred from its label,
   * name, placeholder and type. Useful when there is no source text.
   *
   * @param element - The input, textarea or select to fill.
   * @param options - Optional abort signal.
   * @returns The applied value, or `null` when the model produced no usable value.
   * @throws ProviderError when the provider request fails.
   */
  async fillField(t, r) {
    const n = N(t);
    this.log(`Filling ${n.type} field "${n.key}"`);
    const a = (await this.provider.chat({
      messages: [
        { role: "system", content: B.FIELD_FILL },
        { role: "user", content: ve(n) }
      ],
      model: this.provider.getSelectedModel(),
      signal: r?.signal
    })).content?.trim();
    if (!a) return null;
    const i = U(t), s = J(t, a);
    return s.applied ? (F(t, "aff:field-filled", {
      key: n.key,
      element: t,
      value: s.value,
      previous: i
    }), this.log(`Field "${n.key}" filled with:`, a), { value: a }) : (this.log(`Value for "${n.key}" not applied: ${s.reason}`, a), null);
  }
  /**
   * Parse unstructured text into field values **without touching the form**.
   *
   * This is the review path: show the user what the model produced, let them
   * accept or edit it, and only then write it. Apply an accepted value with
   * the exported `applyFieldValue(field.element, value)`.
   *
   * {@link fillForm} is exactly this call followed by applying every value.
   *
   * @param formElement - The form whose fields define the extraction schema.
   * @param text - Source text (resume, email, description, ...).
   * @param options - Optional abort signal and `skipFilled`.
   * @returns The extracted record, the fields it was built from, and the raw
   *   model output.
   * @throws ProviderError when the provider request fails.
   * @throws ResponseParseError when the model output is empty or not a JSON object.
   */
  async extract(t, r, n) {
    const o = V(t).filter((l) => !(this.targetFields && !this.targetFields.includes(l.key) || n?.skipFilled && !D(l.element))), a = {
      messages: [
        { role: "system", content: B.EXTRACT },
        { role: "user", content: we(o, r) }
      ],
      model: this.provider.getSelectedModel(),
      signal: n?.signal
    };
    this.provider.supportsStructuredOutput() && (a.format = xe(o));
    const s = (await this.provider.chat(a)).content ?? "";
    if (!s.trim())
      throw new j("Provider returned an empty response", { raw: s });
    const c = ke(s);
    return this.log("Extracted data:", c), { data: c, fields: o, raw: s };
  }
  /**
   * Parse unstructured text and fill every matching field in the form.
   *
   * Dispatches `aff:start` on the form before the request, `aff:field-filled`
   * for every written field, `aff:done` at the end, and `aff:error` when the
   * extraction fails (the error is rethrown afterwards).
   *
   * @param formElement - The form to fill.
   * @param text - Source text (resume, email, description, ...).
   * @param options - Optional abort signal and `skipFilled`.
   * @returns Which fields were filled, which were skipped and why, which
   *   required fields are still empty, plus the raw model output.
   * @throws ProviderError when the provider request fails.
   * @throws ResponseParseError when the model output is empty or not a JSON object.
   */
  async fillForm(t, r, n) {
    F(t, "aff:start", { text: r });
    let o;
    try {
      o = await this.extract(t, r, n);
    } catch (a) {
      throw F(t, "aff:error", { error: a }), a;
    }
    return this.applyExtraction(o.data, o.fields, {
      raw: o.raw,
      form: t
    });
  }
  /**
   * Write an extraction to the form: the second half of {@link fillForm},
   * callable on its own.
   *
   * This is the apply step of the review path. Hand it the (possibly edited)
   * `data` and the `fields` from {@link extract} and it writes every matching
   * value, dispatches `aff:field-filled` per field and `aff:done` at the end,
   * and reports the outcome the same way `fillForm` does.
   *
   * @param data - Values keyed by {@link FieldInfo.key}.
   * @param fields - The fields the values belong to, from {@link extract}.
   * @param options - `raw` model output to carry into the result, and the
   *   `form` to dispatch the events on (derived from the fields otherwise).
   * @returns Which fields were filled, which were skipped and why, which keys
   *   matched nothing, and which required fields are still empty.
   */
  applyExtraction(t, r, n) {
    const o = n?.raw ?? "", a = n?.form ?? r[0]?.element.closest("form") ?? void 0, i = {
      filled: [],
      skipped: [],
      unmatchedKeys: [],
      missingRequired: [],
      raw: o
    }, s = new Set(r.map((l) => l.key));
    i.unmatchedKeys = Object.keys(t).filter((l) => !s.has(l));
    for (const l of r) {
      if (!(l.key in t)) continue;
      const m = U(l.element), y = J(l.element, t[l.key]);
      if (y.applied) {
        const b = {
          key: l.key,
          element: l.element,
          value: y.value,
          previous: m
        };
        i.filled.push(b), F(a ?? l.element, "aff:field-filled", b);
      } else
        i.skipped.push({ key: l.key, reason: y.reason });
    }
    const c = a ? V(a) : r;
    return i.missingRequired = c.filter((l) => Q(l.element) && D(l.element)).map((l) => l.key), a && F(a, "aff:done", i), this.log("Fill result:", i), i;
  }
  /**
   * List the models offered by the current provider.
   * @throws ProviderError when the list cannot be fetched.
   */
  getAvailableModels() {
    return this.provider.listModels();
  }
  /**
   * Select the model to use. Validated against the provider's model list by
   * default; see {@link AIProvider.setSelectedModel}.
   */
  setSelectedModel(t, r) {
    return this.provider.setSelectedModel(t, r);
  }
  /** The currently selected model. */
  getSelectedModel() {
    return this.provider.getSelectedModel();
  }
  /** Restrict filling to these field keys, or pass `undefined` to fill all. */
  setFields(t) {
    this.targetFields = t;
  }
  /** The field keys currently targeted, or `undefined` if all are targeted. */
  getFields() {
    return this.targetFields;
  }
  /** Whether the current provider is reachable. Never throws. */
  isProviderAvailable() {
    return this.provider.isAvailable();
  }
  /** Swap the active provider. */
  setProvider(t) {
    this.provider = t;
  }
  /** The active provider. */
  getProvider() {
    return this.provider;
  }
  /** Build a built-in provider from its name. */
  static createProvider(t, r) {
    return t === "ollama" ? new Ee({
      baseUrl: r?.baseUrl,
      model: r?.model,
      timeout: r?.timeout,
      fetch: r?.fetch
    }) : new Ae(t, r);
  }
}
function G(e, t) {
  for (const r of e) {
    const n = t.includes(r.value || "on");
    n !== r.checked && (M(r, n), h(r));
  }
}
function Me(e, t) {
  if (e instanceof HTMLSelectElement) {
    if (e.multiple) {
      const r = Array.isArray(t) ? t : [t];
      for (const n of e.options) n.selected = r.includes(n.value);
      h(e);
      return;
    }
    S(e, Array.isArray(t) ? t[0] ?? "" : t), h(e);
    return;
  }
  if (e instanceof HTMLInputElement) {
    if (e.type === "radio") {
      const r = Array.isArray(t) ? t[0] ?? "" : t;
      G(x(e), r === "" ? [] : [r]);
      return;
    }
    if (e.type === "checkbox") {
      const r = x(e);
      if (r.length > 1 || Array.isArray(t)) {
        G(r, Array.isArray(t) ? t : [t]);
        return;
      }
      M(e, t === "true"), h(e);
      return;
    }
  }
  (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) && (S(e, Array.isArray(t) ? t.join(", ") : t), h(e));
}
function Fe(e, t) {
  for (const r of e.filled)
    t && !t.includes(r.key) || Me(r.element, r.previous);
}
function P(e, t, r, n) {
  const o = typeof e == "string" ? document.querySelector(e) : e;
  if (!t(o)) {
    const a = typeof e == "string" ? `selector "${e}"` : "element";
    throw new Error(`createFormFill: the ${r} ${a} is not ${n}.`);
  }
  return o;
}
const $e = (e) => e instanceof HTMLFormElement, Se = (e) => e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement, Le = (e) => e instanceof HTMLElement;
function Ie(e) {
  const t = P(e.form, $e, "form", "a <form> element"), r = e.source ? P(e.source, Se, "source", "an <input> or <textarea>") : void 0, n = e.trigger ? P(e.trigger, Le, "trigger", "an element") : void 0, o = new R(e.provider ?? "ollama", {
    model: e.model,
    baseUrl: e.baseUrl,
    targetFields: e.targetFields,
    debug: e.debug
  }), a = /* @__PURE__ */ new Set();
  let i = { state: "idle", result: null, error: null }, s = null;
  function c(f) {
    i = f, e.onState?.(i);
    for (const p of a) p(i);
  }
  function l(f) {
    const p = f ?? r?.value;
    return p === void 0 ? new Error("fill() was called without text and no source element is configured.") : p.trim() ? p : new Error("The source text is empty.");
  }
  function m() {
    s?.abort();
    const f = new AbortController();
    return s = f, f;
  }
  async function y(f) {
    const p = l(f);
    if (p instanceof Error)
      return c({ state: "error", result: null, error: p }), null;
    const v = m();
    c({ state: "working", result: null, error: null });
    try {
      const H = await o.fillForm(t, p, {
        signal: v.signal,
        skipFilled: e.skipFilled
      });
      return v.signal.aborted ? null : (c({ state: "done", result: H, error: null }), H);
    } catch (H) {
      return v.signal.aborted || c({ state: "error", result: null, error: H }), null;
    } finally {
      s === v && (s = null);
    }
  }
  async function b(f) {
    const p = l(f);
    if (p instanceof Error) throw p;
    const v = m();
    try {
      return await o.extract(t, p, {
        signal: v.signal,
        skipFilled: e.skipFilled
      });
    } finally {
      s === v && (s = null);
    }
  }
  function d(f, p) {
    const v = o.applyExtraction(f, p, { form: t });
    return c({ state: "done", result: v, error: null }), v;
  }
  function L() {
    s && (s.abort(), s = null, c({ state: "idle", result: null, error: null }));
  }
  function X() {
    i.result && (Fe(i.result), c({ state: "idle", result: null, error: null }));
  }
  const _ = (f) => {
    f.preventDefault(), y();
  };
  return n?.addEventListener("click", _), {
    fill: y,
    extract: b,
    applyExtracted: d,
    cancel: L,
    undo: X,
    subscribe(f) {
      return a.add(f), () => {
        a.delete(f);
      };
    },
    getSnapshot: () => i,
    destroy() {
      n?.removeEventListener("click", _), s?.abort(), s = null, a.clear();
    },
    instance: o
  };
}
export {
  I as AFFError,
  A as AFF_DEFAULTS,
  R as AIFormFill,
  C as AIProvider,
  Ee as OllamaProvider,
  Ae as OpenAICompatibleProvider,
  T as ProviderError,
  j as ResponseParseError,
  B as SYSTEM_PROMPTS,
  N as analyzeField,
  J as applyFieldValue,
  we as buildExtractionPrompt,
  ve as buildFieldPrompt,
  xe as buildFormSchema,
  Ie as createFormFill,
  F as dispatchAFFEvent,
  V as getFormFields,
  He as isValidJson,
  ke as parseModelResponse,
  U as readFieldValue,
  O as requestJson,
  Fe as revertFill
};
