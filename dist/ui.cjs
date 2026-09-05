"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const l=require("./ai-form-fill.cjs"),c=require("./voice.cjs"),f=`
:host {
  --aff-accent: #1d4ed8;
  --aff-accent-fg: #fff;
  --aff-border: color-mix(in srgb, currentColor 22%, transparent);
  --aff-muted: color-mix(in srgb, currentColor 65%, transparent);
  --aff-radius: 8px;
  --aff-gap: 8px;
  --aff-font: inherit;
  display: block;
}
[hidden] { display: none !important; }
[part="panel"] {
  display: grid;
  gap: var(--aff-gap);
  padding: 12px;
  border: 1px solid var(--aff-border);
  border-radius: var(--aff-radius);
  font: var(--aff-font);
}
[part="label"] { font-size: .875em; }
[part="textarea"] {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--aff-border);
  border-radius: var(--aff-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  resize: vertical;
}
[part="actions"] { display: flex; flex-wrap: wrap; gap: var(--aff-gap); }
button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--aff-border);
  border-radius: var(--aff-radius);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
button:disabled { opacity: .5; cursor: default; }
[part="submit"], [part="apply"] {
  background: var(--aff-accent);
  border-color: var(--aff-accent);
  color: var(--aff-accent-fg);
}
[part="mic"][aria-pressed="true"] { border-color: var(--aff-accent); color: var(--aff-accent); }
[part="mic"] svg { width: 14px; height: 14px; }
[part="status"] { margin: 0; font-size: .875em; color: var(--aff-muted); }
[data-state="error"] [part="status"] { color: #b91c1c; }
[part="summary"] { display: grid; gap: 4px; font-size: .875em; }
[part="review-row"] { display: flex; align-items: center; gap: 6px; }
[part="review-value"] { color: var(--aff-muted); }
:focus-visible { outline: 2px solid var(--aff-accent); outline-offset: 2px; }
`,m={"empty-value":"no value was found.","invalid-date-format":"the date format was not usable.","no-matching-option":"no option matched.","unsupported-value":"the value could not be used."},h={label:"Fill this form with AI",placeholder:"Describe what should go into the form, or dictate it.",fill:"Fill form",dictate:"Dictate",listening:"Listening",stop:"Stop",cancel:"Cancel",undo:"Undo",apply:"Apply",discard:"Discard",statusListening:"Listening. Pause for a moment to fill the form.",statusWorking:"Filling the form.",statusEmpty:"Type or dictate something first.",statusDone:s=>s===0?"Nothing matched the form.":`Filled ${s} field${s===1?"":"s"}.`,statusMissing:s=>`Still needed: ${s.join(", ")}.`,statusSkipped:(s,t)=>`${s}: ${m[t]}`,statusReview:"Check the values, then apply.",statusUndone:"Fill undone.",statusNoForm:"No form found for <ai-form-fill>.",errorProvider:(s,t)=>t===void 0?`Could not reach ${s}.`:`${s} answered with HTTP ${t}.`,errorParse:"The AI answer could not be read. Try again.",errorUnknown:"Something went wrong. Try again."},b=1500,g='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/></svg>',v=`<style>${f}</style>
<div part="panel" data-state="idle">
  <label part="label" for="text"></label>
  <textarea part="textarea" id="text" rows="3"></textarea>
  <div part="actions">
    <button part="mic" type="button" aria-pressed="false" hidden>${g}<span part="mic-label"></span></button>
    <button part="submit" type="button"></button>
    <button part="cancel" type="button" hidden></button>
    <button part="undo" type="button" hidden></button>
    <button part="apply" type="button" hidden></button>
    <button part="discard" type="button" hidden></button>
  </div>
  <p part="status" role="status" aria-live="polite"></p>
  <div part="summary" hidden></div>
</div>`;let d;function y(){return d||(d=document.createElement("template"),d.innerHTML=v),d}function u(s){return Array.isArray(s)?s.map(u).filter(Boolean).join(", "):typeof s=="string"?s.trim():typeof s=="number"||typeof s=="boolean"?String(s):""}class p extends HTMLElement{static observedAttributes=["for","provider","model","base-url","target-fields","skip-filled","voice","lang","review","label","placeholder","debug"];#t;#l=!1;#i="idle";#m="";#d=null;#o=null;#s=null;#n=null;#a=null;#c=!1;#b={};#u;#h=new Set;constructor(){super();const t=this.attachShadow({mode:"open"});t.append(y().content.cloneNode(!0));const e=i=>t.querySelector(`[part~="${i}"]`);this.#t={panel:e("panel"),label:e("label"),textarea:e("textarea"),status:e("status"),summary:e("summary"),mic:e("mic"),micLabel:e("mic-label"),submit:e("submit"),cancel:e("cancel"),undo:e("undo"),apply:e("apply"),discard:e("discard")},this.#t.submit.addEventListener("click",this.#F),this.#t.cancel.addEventListener("click",this.#S),this.#t.undo.addEventListener("click",this.#C),this.#t.apply.addEventListener("click",this.#T),this.#t.discard.addEventListener("click",this.#L),this.#t.mic.addEventListener("click",this.#M),this.#t.panel.addEventListener("keydown",this.#D)}get controller(){return this.#o}get provider(){return this.#u}set provider(t){this.#u=t,this.#l&&this.#p()}get strings(){return this.#r}set strings(t){this.#b=t,this.#l&&this.#v()}connectedCallback(){this.#l=!0,this.#p()}disconnectedCallback(){this.#l=!1,this.#g()}attributeChangedCallback(){this.#l&&this.#p()}get#r(){const t={},e=this.getAttribute("label"),i=this.getAttribute("placeholder");return e!==null&&(t.label=e),i!==null&&(t.placeholder=i),{...h,...t,...this.#b}}#p(){this.#g();const t=this.getAttribute("for"),e=t?document.querySelector(t):this.closest("form");if(!(e instanceof HTMLFormElement)){this.#e("idle",this.#r.statusNoForm);return}const i=this.getAttribute("target-fields");this.#d=e,e.addEventListener("aff:field-filled",this.#k),this.#o=l.createFormFill({form:e,provider:this.#u??this.getAttribute("provider")??void 0,model:this.getAttribute("model")??void 0,baseUrl:this.getAttribute("base-url")??void 0,targetFields:i?i.split(",").map(r=>r.trim()).filter(Boolean):void 0,skipFilled:this.hasAttribute("skip-filled"),debug:this.hasAttribute("debug")}),this.#e("idle","")}#g(){this.#d?.removeEventListener("aff:field-filled",this.#k),this.#o?.destroy(),this.#a?.stop();for(const t of this.#h)clearTimeout(t);this.#h.clear(),this.#d=null,this.#o=null,this.#s=null,this.#n=null,this.#a=null}#e(t,e){this.#i=t,this.#m=e,this.#v()}#v(){const t=this.#r,e=this.#t,i=this.#i==="working",r=this.#i==="listening",n=this.#i==="review";e.panel.dataset.state=this.#i,i?e.panel.setAttribute("aria-busy","true"):e.panel.removeAttribute("aria-busy"),e.label.textContent=t.label,e.textarea.placeholder=t.placeholder,e.status.textContent=this.#m,e.status.setAttribute("role",this.#i==="error"?"alert":"status"),e.submit.textContent=t.fill,e.submit.hidden=n,e.submit.disabled=i,e.cancel.textContent=t.cancel,e.cancel.hidden=!i,e.undo.textContent=t.undo,e.undo.hidden=this.#i!=="done"||this.#s===null,e.apply.textContent=t.apply,e.apply.hidden=!n,e.discard.textContent=t.discard,e.discard.hidden=!n,e.mic.hidden=!this.hasAttribute("voice")||!c.isDictationSupported(),e.mic.disabled=i,e.mic.setAttribute("aria-pressed",String(r)),e.mic.title=r?t.listening:t.dictate,e.micLabel.textContent=r?t.stop:t.dictate,this.#E()}#E(){const t=this.#t.summary,e=this.#y();if(t.textContent="",this.#i==="review"&&this.#n){const i=new Set(this.#n.fields.map(r=>r.key));for(const[r,n]of Object.entries(this.#n.data)){const a=u(n);!i.has(r)||!a||t.append(this.#A(r,e.get(r)??r,a))}t.hidden=t.childElementCount===0;return}if(this.#i==="done"&&this.#s&&this.#s.skipped.length>0){for(const{key:i,reason:r}of this.#s.skipped){const n=document.createElement("div");n.setAttribute("part","summary-row"),n.textContent=this.#r.statusSkipped(e.get(i)??i,r),t.append(n)}t.hidden=!1;return}t.hidden=!0}#A(t,e,i){const r=document.createElement("label");r.setAttribute("part","review-row");const n=document.createElement("input");n.type="checkbox",n.checked=!0,n.setAttribute("part","review-check"),n.dataset.key=t;const a=document.createElement("span");a.setAttribute("part","review-label"),a.textContent=e;const o=document.createElement("span");return o.setAttribute("part","review-value"),o.textContent=i,r.append(n,a,o),r}#y(){const t=new Map;if(!this.#d)return t;for(const e of l.getFormFields(this.#d))t.set(e.key,e.label??e.key);return t}#x(t){const e=this.#r;let i=e.statusDone(t.filled.length);if(t.missingRequired.length>0){const r=this.#y(),n=t.missingRequired.map(a=>r.get(a)??a);i+=` ${e.statusMissing(n)}`}return i}#w(t){const e=this.#r;t instanceof l.ProviderError?this.#e("error",e.errorProvider(t.provider,t.status)):t instanceof l.ResponseParseError?this.#e("error",e.errorParse):this.#e("error",e.errorUnknown)}async#f(){const t=this.#o;if(!t)return;const e=this.#t.textarea.value.trim();if(!e){this.#e("idle",this.#r.statusEmpty);return}if(this.#s=null,this.#n=null,this.#e("working",this.#r.statusWorking),this.hasAttribute("review")){try{const r=await t.extract(e);if(this.#i!=="working")return;this.#n=r,this.#e("review",this.#r.statusReview)}catch(r){this.#i==="working"&&this.#w(r)}return}const i=await t.fill(e);if(this.#i==="working"){if(!i){const r=t.getSnapshot();r.state==="error"&&this.#w(r.error);return}this.#s=i,this.#e("done",this.#x(i))}}#F=()=>{this.#f()};#S=()=>{this.#o?.cancel(),this.#e("idle","")};#C=()=>{this.#o?.undo(),this.#s=null,this.#e("idle",this.#r.statusUndone)};#T=()=>{const t=this.#o,e=this.#n;if(!t||!e)return;const i={},r=this.#t.summary.querySelectorAll('[part="review-check"]');for(const a of r){const o=a.dataset.key;a.checked&&o!==void 0&&(i[o]=e.data[o])}const n=t.applyExtracted(i,e.fields);this.#n=null,this.#s=n,this.#e("done",this.#x(n))};#L=()=>{this.#n=null,this.#e("idle","")};#M=()=>{if(this.#a?.listening){this.#a.stop();return}if(!c.isDictationSupported())return;const t=this.#t.textarea.value.trim();this.#c=!1,this.#a=c.createDictation({lang:this.getAttribute("lang")??void 0,onText:e=>{this.#t.textarea.value=t?`${t} ${e}`:e},onEnd:()=>{this.#a=null,this.#i==="listening"&&(this.#c||!this.#t.textarea.value.trim()?this.#e("idle",""):this.#f())},onError:()=>{this.#c=!0}}),this.#a.start(),this.#e("listening",this.#r.statusListening)};#D=t=>{if(t.key==="Escape"&&this.#a?.listening){t.preventDefault(),this.#c=!0,this.#a.stop();return}t.key==="Enter"&&(t.ctrlKey||t.metaKey)&&(t.preventDefault(),this.#f())};#k=t=>{const e=t.detail.element;e.setAttribute("data-aff-filled","");const i=setTimeout(()=>{this.#h.delete(i),e.removeAttribute("data-aff-filled")},b);this.#h.add(i)}}function x(s="ai-form-fill"){customElements.get(s)||customElements.define(s,p)}exports.AIFormFillElement=p;exports.DEFAULT_STRINGS=h;exports.defineFormFillElement=x;
