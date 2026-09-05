/**
 * `ai-form-fill/voice` — speech-to-text input for the library.
 * Separate entry point: importing the core does not pull in this code.
 */

export {
  createDictation,
  isDictationSupported,
  type Dictation,
  type DictationOptions,
} from './dictation';
