/**
 * The script-tag build. It registers `<ai-form-fill>` on load and puts the
 * whole library (core, voice and ui) on one global, so a page needs neither a
 * bundler nor an import statement:
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/ai-form-fill@2/dist/ai-form-fill.browser.js"></script>
 * <ai-form-fill for="#contact"></ai-form-fill>
 * ```
 */

import { defineFormFillElement } from './ui/element';

export * from './index';
export * from './voice/index';
export * from './ui/index';

defineFormFillElement();
