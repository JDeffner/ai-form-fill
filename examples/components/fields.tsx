/**
 * Small native-control helpers in the shadcn style. Checkboxes and radios
 * stay native `<input>`s on purpose: the library fills native controls, and a
 * Radix widget with a hidden mirror input would not update visually.
 */
import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function PageHeader(props: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">{props.title}</h1>
      <p className="mt-2 text-muted-foreground">{props.children}</p>
    </div>
  );
}

export function Field(props: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={props.htmlFor}>{props.label}</Label>
      {props.children}
    </div>
  );
}

export function TextField({ label, ...input }: ComponentProps<'input'> & { label: string }) {
  const id = input.id ?? input.name;
  return (
    <Field label={label} htmlFor={id}>
      <Input id={id} {...input} />
    </Field>
  );
}

export function CheckOption({
  children,
  ...input
}: ComponentProps<'input'> & { children: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input className="size-4 accent-primary" {...input} />
      {children}
    </label>
  );
}

export function Options(props: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{props.label}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">{props.children}</div>
    </fieldset>
  );
}

/** Semantic feedback colors (theme tokens in styles.css). */
export type Kind = 'info' | 'success' | 'warning' | 'error';

export const KIND_TEXT: Record<Kind, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

const KIND_BOX: Record<Kind, string> = {
  info: 'border-info/30 bg-info/10',
  success: 'border-success/30 bg-success/10',
  warning: 'border-warning/30 bg-warning/10',
  error: 'border-destructive/30 bg-destructive/10',
};

export function Feedback(props: { kind: Kind; children: ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
        KIND_TEXT[props.kind],
        KIND_BOX[props.kind],
      )}
    >
      <span className="size-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {props.children}
    </p>
  );
}
