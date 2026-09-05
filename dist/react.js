import { useRef as c, useCallback as t, useEffect as P, useSyncExternalStore as S } from "react";
import { createFormFill as j } from "./ai-form-fill.js";
const i = { state: "idle", result: null, error: null };
function D(d = {}) {
  const m = c(d), e = c(null), o = c(i), l = c(/* @__PURE__ */ new Set()), u = c(null), s = t(() => {
    u.current?.(), u.current = null, e.current?.destroy(), e.current = null;
  }, []), p = t(
    (r) => {
      if (s(), o.current = i, r) {
        const n = j({ ...m.current, form: r });
        e.current = n, u.current = n.subscribe((h) => {
          o.current = h;
          for (const w of l.current) w();
        });
      }
      for (const n of l.current) n();
    },
    [s]
  );
  P(() => s, [s]);
  const a = l.current, b = t(
    (r) => (a.add(r), () => {
      a.delete(r);
    }),
    [a]
  ), f = S(
    b,
    () => o.current,
    () => i
  ), x = t(
    (r) => e.current?.fill(r) ?? Promise.resolve(null),
    []
  ), R = t(
    (r) => e.current ? e.current.extract(r) : Promise.reject(new Error("useFormFill: extract() was called before the form mounted.")),
    []
  ), E = t(
    (r, n) => e.current?.applyExtracted(r, n) ?? null,
    []
  ), F = t(() => e.current?.cancel(), []), y = t(() => e.current?.undo(), []);
  return {
    formRef: p,
    fill: x,
    extract: R,
    applyExtracted: E,
    cancel: F,
    undo: y,
    state: f.state,
    result: f.result,
    error: f.error
  };
}
export {
  D as useFormFill
};
