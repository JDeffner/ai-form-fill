# Svelte

`createFormFill` is plain DOM code, so it belongs in `onMount`. The `aff:done`
event on the form carries the `FillResult`, so nothing has to wrap the call.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createFormFill } from 'ai-form-fill';

  let form: HTMLFormElement;
  let filled = 0;

  onMount(() => {
    const controller = createFormFill({ form, source: '#notes', trigger: '#fill' });
    form.addEventListener('aff:done', (e) => (filled = e.detail.filled.length));
    return () => controller.destroy();
  });
</script>

<textarea id="notes"></textarea>
<button id="fill">Fill form</button>
<form bind:this={form}>...</form>
{#if filled}<p>Filled {filled} field(s).</p>{/if}
```

The one-line alternative, with no controller to own:

```svelte
<script lang="ts">
  import { defineFormFillElement } from 'ai-form-fill/ui';
  defineFormFillElement();
</script>

<ai-form-fill for="#contact" voice></ai-form-fill>
```

Svelte passes unknown tags through untouched, so no compiler configuration is
needed.
