function f() {
  if (typeof window > "u") return;
  const n = window;
  return n.SpeechRecognition ?? n.webkitSpeechRecognition;
}
function v() {
  return f() !== void 0;
}
function D(n = {}) {
  const u = f();
  if (!u)
    throw new Error(
      "createDictation: this browser has no Web Speech API. Check isDictationSupported() first."
    );
  const { interim: p = !0, silenceMs: a = 1500, onText: h, onEnd: m, onError: w } = n, S = n.lang || document.documentElement.lang || navigator.language;
  let e = null, i, o = "";
  const c = () => {
    i !== void 0 && clearTimeout(i), i = void 0;
  }, R = (t) => {
    const r = [], l = [];
    for (let s = 0; s < t.results.length; s++) {
      const g = t.results[s], T = g[0]?.transcript ?? "";
      (g.isFinal ? r : l).push(T);
    }
    o = [...r, ...l].map((s) => s.trim()).filter(Boolean).join(" "), h?.(o, l.length === 0), c(), a > 0 && (i = setTimeout(() => {
      i = void 0, o && d.stop();
    }, a));
  }, E = () => {
    e && (e = null, c(), m?.(o));
  }, d = {
    start() {
      if (e) return;
      o = "";
      const t = new u();
      t.lang = S, t.continuous = !0, t.interimResults = p, t.onresult = R, t.onerror = (r) => w?.({ error: r.error, message: r.message ?? "" }), t.onend = E, e = t, t.start();
    },
    stop() {
      e && (c(), e.stop());
    },
    get listening() {
      return e !== null;
    }
  };
  return d;
}
export {
  D as createDictation,
  v as isDictationSupported
};
