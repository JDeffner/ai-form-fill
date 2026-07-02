const x = Object.freeze({
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
class I {
  /** Whether the provider can enforce a JSON schema on its output. */
  supportsStructured = !1;
  selectedModel;
  baseUrl;
  timeout;
  fetchImpl;
  constructor(e) {
    this.baseUrl = (e?.baseUrl ?? "").replace(/\/+$/, ""), this.selectedModel = e?.model ?? "", this.timeout = e?.timeout ?? x.timeout, this.fetchImpl = e?.fetch;
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
  async setSelectedModel(e, r) {
    if (!e) return !1;
    if (r?.validate === !1)
      return this.selectedModel = e, !0;
    let o;
    try {
      o = await this.listModels();
    } catch {
      return !1;
    }
    return o.includes(e) ? (this.selectedModel = e, !0) : !1;
  }
  /** Whether the provider supports structured (JSON schema) output. */
  supportsStructuredOutput() {
    return this.supportsStructured;
  }
}
function k(t) {
  if (t.id) {
    const r = document.querySelector(`label[for="${t.id}"]`);
    if (r) return r.textContent?.trim() || "";
  }
  const e = t.closest("label");
  return e && e.textContent?.trim() || "";
}
function R(t) {
  const e = t.getAttribute("aria-label")?.trim();
  if (e) return e;
  const r = t.getAttribute("aria-labelledby");
  if (r) {
    const a = r.split(/\s+/).map((i) => document.getElementById(i)?.textContent?.trim() ?? "").filter(Boolean).join(" ");
    if (a) return a;
  }
  const o = t.getAttribute("title")?.trim();
  if (o) return o;
}
function D(t) {
  return Array.from(t.options).filter((e) => e.value !== "").map((e) => ({
    value: e.value,
    label: e.textContent?.trim() || e.value
  }));
}
function A(t) {
  const e = { element: t, key: "", type: "text" };
  if (t instanceof HTMLInputElement ? (e.type = t.type, e.name = t.name || void 0, e.placeholder = t.placeholder || void 0, e.pattern = t.pattern || void 0, t.type === "checkbox" && (e.placeholder = t.value || "checkbox option"), t.type === "radio" && (e.placeholder = t.value || "radio option")) : t instanceof HTMLTextAreaElement ? (e.type = "textarea", e.name = t.name || void 0, e.placeholder = t.placeholder || void 0) : t instanceof HTMLSelectElement && (e.type = "select", e.name = t.name || void 0, e.options = D(t), t.multiple && (e.multiple = !0)), t.id) {
    const o = document.querySelector(`label[for="${t.id}"]`);
    o && (e.label = o.textContent?.trim());
  }
  if (!e.label) {
    const o = t.closest("label");
    o && (e.label = o.textContent?.trim());
  }
  e.label || (e.label = R(t));
  const r = t.dataset.affHint;
  return r && (e.hint = r), e.key = e.name || t.id || "field", e;
}
function _(t, e) {
  t.hint = void 0;
  for (const r of e) {
    const o = r.dataset.affHint;
    o && (t.hint = `${t.hint ?? ""} ${o}`.trim());
  }
}
function V(t) {
  const e = A(t[0]);
  return e.options = t.map((r) => ({
    value: r.value,
    label: k(r) || r.value
  })), _(e, t), e;
}
function B(t) {
  const e = A(t[0]);
  return e.multiple = !0, e.placeholder = void 0, e.options = t.map((r) => ({
    value: r.value || "on",
    label: k(r) || r.value || "on"
  })), _(e, t), e;
}
function K(t) {
  const e = /* @__PURE__ */ new Set();
  t.forEach((r, o) => {
    const a = r.name || r.element.id || `field_${o + 1}`;
    let i = a, n = 2;
    for (; e.has(i); )
      i = `${a}_${n}`, n += 1;
    e.add(i), r.key = i;
  });
}
function z(t) {
  const e = Array.from(
    t.querySelectorAll(
      'input:not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="hidden"]):not([type="image"]):not([type="file"]), textarea, select'
    )
  ), r = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
  for (const n of e) {
    if (!(n instanceof HTMLInputElement) || !n.name) continue;
    const s = n.type === "radio" ? r : n.type === "checkbox" ? o : void 0;
    s && (s.has(n.name) || s.set(n.name, []), s.get(n.name).push(n));
  }
  const a = [], i = /* @__PURE__ */ new Set();
  for (const n of e)
    if (n instanceof HTMLElement) {
      if (n instanceof HTMLInputElement && n.type === "radio") {
        if (!n.name || i.has(`radio:${n.name}`)) continue;
        i.add(`radio:${n.name}`), a.push(V(r.get(n.name)));
        continue;
      }
      if (n instanceof HTMLInputElement && n.type === "checkbox" && n.name && o.get(n.name).length > 1) {
        if (i.has(`checkbox:${n.name}`)) continue;
        i.add(`checkbox:${n.name}`), a.push(B(o.get(n.name)));
        continue;
      }
      a.push(A(n));
    }
  return K(a), a;
}
const J = [
  "null",
  "",
  "n/a",
  "none",
  "no value",
  "empty",
  "undefined",
  "unknown",
  "missing"
], G = ["true", "yes", "1", "checked", "on"], W = ["false", "no", "0", "unchecked", "off"], m = (t) => ({ applied: !0, value: t }), c = (t) => ({ applied: !1, reason: t });
function h(t) {
  t.dispatchEvent(new Event("input", { bubbles: !0 })), t.dispatchEvent(new Event("change", { bubbles: !0 }));
}
function y(t) {
  return t.trim().toLowerCase().replace(/\s+/g, " ");
}
function b(t) {
  return J.includes(
    y(t)
  );
}
function v(t) {
  return typeof t == "string" ? t : typeof t == "number" || typeof t == "boolean" ? String(t) : null;
}
function L(t, e) {
  const r = t instanceof HTMLInputElement ? HTMLInputElement.prototype : t instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype, o = Object.getOwnPropertyDescriptor(r, "value");
  o?.set ? o.set.call(t, e) : t.value = e;
}
function $(t, e) {
  const r = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
  r?.set ? r.set.call(t, e) : t.checked = e;
}
function S(t, e, r) {
  if (t === e || t === r) return !0;
  const o = y(t);
  return o === y(e) || o === y(r);
}
function C(t, e, r, o) {
  const a = e.find((s) => r(s) === t);
  if (a) return a;
  const i = e.find((s) => o(s) === t);
  if (i) return i;
  const n = y(t);
  return e.find(
    (s) => y(r(s)) === n || y(o(s)) === n
  );
}
const X = /^(\d{4})-(\d{2})-(\d{2})$/, Q = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, Z = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, q = /^\d{4}-(0[1-9]|1[0-2])$/, ee = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
function H(t, e, r) {
  const o = new Date(t, e - 1, r);
  return o.getFullYear() === t && o.getMonth() === e - 1 && o.getDate() === r;
}
function te(t, e) {
  const r = t.trim();
  switch (e) {
    case "date": {
      const o = X.exec(r);
      return o && H(Number(o[1]), Number(o[2]), Number(o[3])) ? r : null;
    }
    case "datetime-local": {
      const o = Q.exec(r);
      return o && H(Number(o[1]), Number(o[2]), Number(o[3])) ? r : null;
    }
    case "time": {
      const o = /^\d:/.test(r) ? `0${r}` : r;
      return Z.test(o) ? o : null;
    }
    case "month":
      return q.test(r) ? r : null;
    case "week":
      return ee.test(r) ? r : null;
    default:
      return null;
  }
}
function P(t, e) {
  const r = v(e);
  return r === null ? c("unsupported-value") : b(r) ? c("empty-value") : (L(t, r), h(t), m(r));
}
function re(t, e) {
  const r = v(e);
  if (r === null) return c("unsupported-value");
  if (b(r)) return c("empty-value");
  const o = te(r, t.type);
  return o === null ? c("invalid-date-format") : (L(t, o), h(t), m(o));
}
function oe(t) {
  const e = t.closest("form");
  return !e || !t.name ? [t] : Array.from(
    e.querySelectorAll(`input[type="checkbox"][name="${t.name}"]`)
  );
}
function ne(t, e) {
  const r = oe(t);
  if (r.length > 1 || Array.isArray(e)) {
    const s = (Array.isArray(e) ? e : [e]).map(v).filter((u) => u !== null && !b(u));
    if (s.length === 0) return c("empty-value");
    const p = [];
    for (const u of r) {
      const f = u.value || "on", g = k(u) || f, d = s.some(
        (l) => S(l, f, g)
      );
      d !== u.checked && ($(u, d), h(u)), d && p.push(f);
    }
    return p.length === 0 ? c("no-matching-option") : m(p);
  }
  if (typeof e == "boolean")
    return $(t, e), h(t), m(String(e));
  const o = v(e);
  if (o === null) return c("unsupported-value");
  if (o.trim() === "") return c("empty-value");
  const a = y(o);
  let i;
  if (G.includes(a)) i = !0;
  else if (W.includes(a)) i = !1;
  else if (S(o, t.value || "on", k(t))) i = !0;
  else return b(o) ? c("empty-value") : c("unsupported-value");
  return $(t, i), h(t), m(String(i));
}
function ae(t, e) {
  const r = v(e);
  if (r === null) return c("unsupported-value");
  if (b(r)) return c("empty-value");
  const o = t.closest("form"), a = o && t.name ? Array.from(
    o.querySelectorAll(`input[type="radio"][name="${t.name}"]`)
  ) : [t], i = C(
    r,
    a,
    (n) => n.value,
    (n) => k(n) || n.value
  );
  return i ? ($(i, !0), h(i), m(i.value)) : c("no-matching-option");
}
function ie(t, e) {
  if (t.multiple) return se(t, e);
  const r = v(e);
  if (r === null) return c("unsupported-value");
  if (b(r)) return c("empty-value");
  const o = Array.from(t.options).filter((i) => i.value !== ""), a = C(
    r,
    o,
    (i) => i.value,
    (i) => i.textContent?.trim() || i.value
  );
  return a ? (L(t, a.value), h(t), m(a.value)) : c("no-matching-option");
}
function se(t, e) {
  const o = (Array.isArray(e) ? e : [e]).map(v).filter((n) => n !== null && !b(n));
  if (o.length === 0) return c("empty-value");
  const a = Array.from(t.options).filter((n) => n.value !== ""), i = [];
  for (const n of a) {
    const s = n.textContent?.trim() || n.value, p = o.some((u) => S(u, n.value, s));
    n.selected = p, p && i.push(n.value);
  }
  return i.length === 0 ? c("no-matching-option") : (h(t), m(i));
}
function U(t, e) {
  if (e == null) return c("empty-value");
  if (t instanceof HTMLInputElement)
    switch (t.type) {
      case "checkbox":
        return ne(t, e);
      case "radio":
        return ae(t, e);
      case "date":
      case "datetime-local":
      case "time":
      case "month":
      case "week":
        return re(t, e);
      default:
        return P(t, e);
    }
  return t instanceof HTMLTextAreaElement ? P(t, e) : t instanceof HTMLSelectElement ? ie(t, e) : c("unsupported-value");
}
function le(t, e) {
  let r = `Generate appropriate content for the following form field:

`;
  return t.label && (r += `Field Label: ${t.label}
`), t.name && (r += `Field Name: ${t.name}
`), r += `Field Type: ${t.type}
`, t.placeholder && (r += `Placeholder: ${t.placeholder}
`), t.pattern && (r += `Pattern/Format: ${t.pattern}
`), t.options?.length && (r += `Allowed values: ${t.options.map((o) => o.value).join(", ")}
`), e && (r += `
Additional Context: ${e}
`), t.type === "checkbox" ? r += `
Return only "true" or "false" for this checkbox, no explanations.` : r += `
Provide a realistic and appropriate value for this field. Only return the value itself, no explanations.`, r;
}
function ce(t) {
  return ` - Allowed values: [${(t.options ?? []).map(
    (o) => o.label && o.label !== o.value ? `"${o.value}" (${o.label})` : `"${o.value}"`
  ).join(", ")}] (return the value exactly as written)`;
}
function ue(t, e) {
  let r = `Extract structured data from the following unstructured text and match it to the form fields.

`;
  r += `Form fields:
`;
  for (const o of t) {
    const a = o.multiple ? `${o.type}, multiple values allowed` : o.type;
    r += `- ${o.key} (type: ${a})`, o.label && (r += ` - Label: "${o.label}"`), o.placeholder && (r += ` - Placeholder: "${o.placeholder}"`), o.options?.length && (r += ce(o)), o.type === "date" ? r += " - Format: YYYY-MM-DD" : o.type === "datetime-local" ? r += " - Format: YYYY-MM-DDTHH:MM" : o.type === "time" ? r += " - Format: HH:MM (24h)" : o.type === "month" ? r += " - Format: YYYY-MM" : o.type === "week" && (r += " - Format: YYYY-Www"), o.hint && (r += ` - Additional info: ${o.hint}`), r += `
`;
  }
  return r += `
Unstructured text:
${e}

`, r += `Extract the relevant information and return it as a JSON object whose keys match the field keys exactly.
Only include fields where you found relevant data.
For checkbox fields, return true if the text indicates the option should be checked, false or omit otherwise.
For fields with allowed values, return one of the allowed values exactly as written.
For fields that allow multiple values, return an array of allowed values.
Dates and times must use the stated ISO format.
Return ONLY the JSON object, no explanations or markdown formatting.
`, r;
}
const Y = {
  /** Single-field generation: return only the value. */
  FIELD_FILL: "You are a helpful assistant that generates appropriate content for form fields. Provide only the value to fill in the field, without any explanation or additional text.",
  /** Data extraction: return only valid JSON. */
  EXTRACT: "You are a helpful assistant that extracts structured data from unstructured text. You must respond ONLY with valid JSON, no explanations or markdown code blocks. If a field is a checkbox, return true if it should be checked, otherwise return false or omit the field."
};
function de(t) {
  const e = {};
  for (const r of t) {
    const o = r.options?.map((i) => i.value) ?? [];
    let a;
    if (r.multiple && o.length > 0)
      a = { type: "array", items: { type: "string", enum: o } };
    else if (o.length > 0)
      a = { type: "string", enum: o };
    else
      switch (r.type) {
        case "number":
        case "range":
          a = { type: "number" };
          break;
        case "boolean":
        case "checkbox":
          a = { type: "boolean" };
          break;
        case "url":
          a = { type: "string", format: "uri" };
          break;
        // Date/time fields use regex patterns matching exactly what the HTML
        // inputs accept. JSON-schema `format: 'time'`/`'date-time'` would be
        // wrong here: providers that enforce formats (e.g. Ollama) generate
        // RFC 3339 values with seconds and UTC offset, which date/time inputs
        // reject. `[0-9]` instead of `\d` because grammar-based enforcers
        // (llama.cpp) only support a regex subset.
        case "date":
          a = { type: "string", format: "date" };
          break;
        case "datetime-local":
          a = {
            type: "string",
            pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]$"
          };
          break;
        case "time":
          a = { type: "string", pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$" };
          break;
        case "month":
          a = { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" };
          break;
        case "week":
          a = { type: "string", pattern: "^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$" };
          break;
        default:
          a = { type: "string" };
          break;
      }
    r.pattern && (a.pattern = r.pattern), (r.placeholder || r.hint) && (a.description = [r.placeholder, r.hint].filter(Boolean).join(" - ")), e[r.key] = a;
  }
  return { type: "object", properties: e, additionalProperties: !1 };
}
class T extends Error {
  constructor(e, r) {
    super(e, r), this.name = "AFFError";
  }
}
class w extends T {
  /** Name of the provider that failed (e.g. `ollama`, `openai`). */
  provider;
  /** HTTP status code, when the failure was an HTTP error response. */
  status;
  constructor(e, r) {
    super(e, { cause: r.cause }), this.name = "ProviderError", this.provider = r.provider, this.status = r.status;
  }
}
class F extends T {
  /** The unmodified model output that failed to parse. */
  raw;
  constructor(e, r) {
    super(e, { cause: r.cause }), this.name = "ResponseParseError", this.raw = r.raw;
  }
}
function pe(t) {
  const e = t.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let r;
  try {
    r = JSON.parse(e);
  } catch (o) {
    throw new F("Model response is not valid JSON", {
      raw: t,
      cause: o
    });
  }
  if (r === null || typeof r != "object" || Array.isArray(r))
    throw new F("Model response is not a JSON object", { raw: t });
  return r;
}
function ye(t) {
  try {
    return JSON.parse(t), !0;
  } catch {
    return !1;
  }
}
async function M(t, e) {
  const { method: r = "GET", body: o, headers: a, timeout: i, signal: n, provider: s, fetchImpl: p } = e, u = p ?? fetch, f = new AbortController(), g = setTimeout(() => f.abort(), i), d = () => f.abort(n?.reason);
  if (n) {
    if (n.aborted)
      throw clearTimeout(g), n.reason ?? new DOMException("Aborted", "AbortError");
    n.addEventListener("abort", d, { once: !0 });
  }
  try {
    const l = await u(t, {
      method: r,
      headers: {
        ...o !== void 0 ? { "Content-Type": "application/json" } : {},
        ...a
      },
      body: o !== void 0 ? JSON.stringify(o) : void 0,
      signal: f.signal
    });
    if (!l.ok)
      throw new w(
        `${s}: HTTP ${l.status} ${l.statusText} from ${t}`,
        { provider: s, status: l.status }
      );
    try {
      return await l.json();
    } catch (N) {
      throw new w(`${s}: invalid JSON in response from ${t}`, {
        provider: s,
        cause: N
      });
    }
  } catch (l) {
    throw l instanceof w ? l : (typeof l == "object" && l !== null && "name" in l ? String(l.name) : "") === "AbortError" ? n?.aborted ? l : new w(`${s}: request timed out after ${i}ms`, {
      provider: s,
      cause: l
    }) : new w(`${s}: failed to connect to ${t}`, {
      provider: s,
      cause: l
    });
  } finally {
    clearTimeout(g), n?.removeEventListener("abort", d);
  }
}
class fe extends I {
  providerName = "ollama";
  providerType = "local";
  supportsStructured = !0;
  constructor(e) {
    super({
      baseUrl: e?.baseUrl ?? x.ollama.baseUrl,
      model: e?.model ?? x.ollama.model,
      timeout: e?.timeout,
      fetch: e?.fetch
    });
  }
  async chat(e) {
    const r = await M(`${this.baseUrl}/api/chat`, {
      method: "POST",
      body: {
        model: e.model,
        messages: e.messages,
        stream: !1,
        // Ollama takes a JSON schema in the top-level `format` field.
        ...e.format ? { format: e.format } : {},
        ...e.maxTokens ? { options: { num_predict: e.maxTokens } } : {}
      },
      timeout: this.timeout,
      signal: e.signal,
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
    return ((await M(`${this.baseUrl}/api/tags`, {
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
function me() {
  return typeof window < "u" && typeof window.document < "u";
}
class he extends I {
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
  constructor(e = "openai", r) {
    const a = {
      openai: x.openai,
      perplexity: x.perplexity,
      openrouter: x.openrouter
    }[e], i = r?.baseUrl ?? a?.baseUrl;
    if (!i)
      throw new T(
        `No baseUrl for provider "${e}". Non-preset providers require { baseUrl }.`
      );
    if (super({
      baseUrl: i,
      model: r?.model ?? a?.model ?? "",
      timeout: r?.timeout,
      fetch: r?.fetch
    }), this.providerName = e, r?.apiKey && me() && !r.allowApiKeyInBrowser)
      throw new T(
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
  async chat(e) {
    const r = {
      model: e.model,
      messages: e.messages
    };
    e.maxTokens !== void 0 && (r.max_tokens = e.maxTokens), e.format && (r.response_format = {
      type: "json_schema",
      json_schema: { name: "form_fields", schema: e.format }
    });
    const o = await M(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      body: r,
      headers: this.buildHeaders(),
      timeout: this.timeout,
      signal: e.signal,
      provider: this.providerName,
      fetchImpl: this.fetchImpl
    }), a = o.choices?.[0];
    if (!a)
      throw new w(`${this.providerName}: response contained no choices`, {
        provider: this.providerName
      });
    return {
      content: a.message?.content ?? null,
      model: o.model,
      finishReason: a.finish_reason
    };
  }
  async listModels() {
    return ((await M(`${this.baseUrl}/models`, {
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
class O {
  provider;
  targetFields;
  debug;
  /**
   * @param provider - A built-in provider name or a custom {@link AIProvider}.
   * @param options - Field targeting, debug, and provider configuration.
   */
  constructor(e, r) {
    this.debug = r?.debug ?? !1, this.provider = e instanceof I ? e : O.createProvider(e, r), this.targetFields = r?.targetFields;
  }
  log(...e) {
    this.debug && console.log("[ai-form-fill]", ...e);
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
  async fillField(e, r) {
    const o = A(e);
    this.log(`Filling ${o.type} field "${o.key}"`);
    const i = (await this.provider.chat({
      messages: [
        { role: "system", content: Y.FIELD_FILL },
        { role: "user", content: le(o) }
      ],
      model: this.provider.getSelectedModel(),
      signal: r?.signal
    })).content?.trim();
    if (!i) return null;
    const n = U(e, i);
    return n.applied ? (this.log(`Field "${o.key}" filled with:`, i), { value: i }) : (this.log(`Value for "${o.key}" not applied: ${n.reason}`, i), null);
  }
  /**
   * Parse unstructured text and fill every matching field in the form.
   *
   * @param formElement - The form to fill.
   * @param text - Source text (resume, email, description, ...).
   * @param options - Optional abort signal.
   * @returns Which fields were filled, which were skipped and why, plus the
   *   raw model output.
   * @throws ProviderError when the provider request fails.
   * @throws ResponseParseError when the model output is empty or not a JSON object.
   */
  async fillForm(e, r, o) {
    const a = z(e), i = this.targetFields ? a.filter((d) => this.targetFields.includes(d.key)) : a, n = {
      messages: [
        { role: "system", content: Y.EXTRACT },
        { role: "user", content: ue(i, r) }
      ],
      model: this.provider.getSelectedModel(),
      signal: o?.signal
    };
    this.provider.supportsStructuredOutput() && (n.format = de(i));
    const p = (await this.provider.chat(n)).content ?? "";
    if (!p.trim())
      throw new F("Provider returned an empty response", { raw: p });
    const u = pe(p);
    this.log("Extracted data:", u);
    const f = { filled: [], skipped: [], unmatchedKeys: [], raw: p }, g = new Set(i.map((d) => d.key));
    f.unmatchedKeys = Object.keys(u).filter((d) => !g.has(d));
    for (const d of i) {
      if (!(d.key in u)) continue;
      const l = U(d.element, u[d.key]);
      l.applied ? f.filled.push({ key: d.key, element: d.element, value: l.value }) : f.skipped.push({ key: d.key, reason: l.reason });
    }
    return this.log("Fill result:", f), f;
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
  setSelectedModel(e, r) {
    return this.provider.setSelectedModel(e, r);
  }
  /** The currently selected model. */
  getSelectedModel() {
    return this.provider.getSelectedModel();
  }
  /** Restrict filling to these field keys, or pass `undefined` to fill all. */
  setFields(e) {
    this.targetFields = e;
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
  setProvider(e) {
    this.provider = e;
  }
  /** The active provider. */
  getProvider() {
    return this.provider;
  }
  /** Build a built-in provider from its name. */
  static createProvider(e, r) {
    return e === "ollama" ? new fe({
      baseUrl: r?.baseUrl,
      model: r?.model,
      timeout: r?.timeout,
      fetch: r?.fetch
    }) : new he(e, r);
  }
}
const j = [
  "ollama",
  "openai",
  "perplexity",
  "openrouter"
];
function E(t) {
  return console.warn(`[ai-form-fill] autoInit: ${t}`), null;
}
function be(t = {}) {
  const e = t.formId ?? "aff-form", r = document.getElementById(e);
  if (!(r instanceof HTMLFormElement))
    return E(`no <form id="${e}"> found.`);
  const o = document.getElementById("aff-text");
  if (!(o instanceof HTMLTextAreaElement))
    return E('no <textarea id="aff-text"> found.');
  const a = document.getElementById("aff-text-button");
  if (!a)
    return E('no fill trigger with id "aff-text-button" found.');
  const i = r.dataset.affProvider?.trim().toLowerCase(), n = t.provider ?? (i || "ollama");
  if (!j.includes(n))
    return E(`unknown provider "${n}". Available: ${j.join(", ")}.`);
  const s = t.model ?? r.dataset.affModel?.trim(), p = new O(n, {
    debug: t.debug ?? !1,
    ...s ? { model: s } : {}
  });
  return a.addEventListener("click", () => {
    const u = o.value.trim();
    p.fillForm(r, u).catch((f) => {
      console.error("[ai-form-fill] fillForm failed:", f);
    });
  }), p;
}
export {
  T as AFFError,
  x as AFF_DEFAULTS,
  O as AIFormFill,
  I as AIProvider,
  fe as OllamaProvider,
  he as OpenAICompatibleProvider,
  w as ProviderError,
  F as ResponseParseError,
  Y as SYSTEM_PROMPTS,
  A as analyzeField,
  U as applyFieldValue,
  be as autoInit,
  ue as buildExtractionPrompt,
  le as buildFieldPrompt,
  de as buildFormSchema,
  z as getFormFields,
  ye as isValidJson,
  pe as parseModelResponse,
  M as requestJson
};
