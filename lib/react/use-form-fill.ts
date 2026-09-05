/**
 * The React binding: one hook around {@link createFormFill}. It owns the
 * controller's lifetime, keeps the snapshot in sync through
 * `useSyncExternalStore`, and hands back a ref for the form.
 *
 * It builds on the core controller only, so importing it pulls in no markup
 * and no speech code.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { RefCallback } from 'react';
import {
  createFormFill,
  type CreateFormFillOptions,
  type FormFillController,
  type FormFillSnapshot,
  type FormFillState,
} from '../core/controller';
import type { ExtractResult, FieldInfo, FillResult } from '../core/types';

/**
 * Options for {@link useFormFill}: everything {@link createFormFill} takes
 * except the parts React provides. `form` comes from the returned ref,
 * `source` and `trigger` are your own state and click handler, and `onState`
 * is replaced by the returned `state`.
 */
export type UseFormFillOptions = Omit<
  CreateFormFillOptions,
  'form' | 'trigger' | 'source' | 'onState'
>;

/** What {@link useFormFill} returns. */
export type UseFormFillResult = {
  /** Put this on the `<form>`. The controller lives as long as the form does. */
  formRef: RefCallback<HTMLFormElement>;
  /**
   * Fill the form from `text`. Never rejects; resolves to `null` on failure,
   * on cancellation, and while no form is mounted.
   */
  fill: (text: string) => Promise<FillResult | null>;
  /**
   * Extract without writing to the form, for a review step. Rejects when the
   * extraction fails or when no form is mounted.
   */
  extract: (text: string) => Promise<ExtractResult>;
  /**
   * Write a (possibly edited) extraction to the form. Returns `null` while no
   * form is mounted.
   */
  applyExtracted: (data: Record<string, unknown>, fields: FieldInfo[]) => FillResult | null;
  /** Abort the in-flight request and go back to `idle`. */
  cancel: () => void;
  /** Restore the values the last fill overwrote and clear the result. */
  undo: () => void;
  /** What the controller is doing. */
  state: FormFillState;
  /** The result of the last successful fill, or `null`. */
  result: FillResult | null;
  /** The failure that put the hook in the `error` state, or `null`. */
  error: unknown;
};

const IDLE: FormFillSnapshot = { state: 'idle', result: null, error: null };

/**
 * Wire a React form to the library.
 *
 * The options are read once, when the controller is created for the form
 * element. Later changes to the object are ignored; to switch provider or
 * model, remount the form (a `key` on it is enough).
 *
 * @param options - Provider configuration, field targeting and `debug`.
 * @returns The form ref, the actions and the current state.
 *
 * @example
 * ```tsx
 * const { formRef, fill, state, result } = useFormFill({ model: 'gemma3:4b' });
 *
 * return (
 *   <>
 *     <button disabled={state === 'working'} onClick={() => fill(text)}>Fill</button>
 *     <form ref={formRef}>...</form>
 *     {result && <p>Filled {result.filled.length} field(s).</p>}
 *   </>
 * );
 * ```
 */
export function useFormFill(options: UseFormFillOptions = {}): UseFormFillResult {
  // Read once: the controller is built from the options the first form mount
  // sees, so a fresh object on every render does not rebuild it.
  const optionsRef = useRef(options);
  const controllerRef = useRef<FormFillController | null>(null);
  const snapshotRef = useRef<FormFillSnapshot>(IDLE);
  const listenersRef = useRef(new Set<() => void>());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const detach = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    controllerRef.current?.destroy();
    controllerRef.current = null;
  }, []);

  const formRef = useCallback<RefCallback<HTMLFormElement>>(
    (form) => {
      detach();
      snapshotRef.current = IDLE;
      if (form) {
        // A fresh controller is always idle, so the snapshot reference above
        // still holds and React has nothing to re-render for.
        const controller = createFormFill({ ...optionsRef.current, form });
        controllerRef.current = controller;
        unsubscribeRef.current = controller.subscribe((next) => {
          snapshotRef.current = next;
          for (const listener of listenersRef.current) listener();
        });
      }
      for (const listener of listenersRef.current) listener();
    },
    [detach],
  );

  // The form ref already destroys the controller when React detaches it; this
  // covers an unmount that never reaches the ref (an aborted render).
  useEffect(() => detach, [detach]);

  const listeners = listenersRef.current;
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    [listeners],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    () => snapshotRef.current,
    () => IDLE,
  );

  const fill = useCallback(
    (text: string) => controllerRef.current?.fill(text) ?? Promise.resolve(null),
    [],
  );

  const extract = useCallback(
    (text: string) =>
      controllerRef.current
        ? controllerRef.current.extract(text)
        : Promise.reject(new Error('useFormFill: extract() was called before the form mounted.')),
    [],
  );

  const applyExtracted = useCallback(
    (data: Record<string, unknown>, fields: FieldInfo[]) =>
      controllerRef.current?.applyExtracted(data, fields) ?? null,
    [],
  );

  const cancel = useCallback(() => controllerRef.current?.cancel(), []);
  const undo = useCallback(() => controllerRef.current?.undo(), []);

  return {
    formRef,
    fill,
    extract,
    applyExtracted,
    cancel,
    undo,
    state: snapshot.state,
    result: snapshot.result,
    error: snapshot.error,
  };
}
