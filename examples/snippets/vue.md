# Vue

`createFormFill` is plain DOM code, so it belongs in `onMounted`. The `aff:done`
event on the form carries the `FillResult`, so nothing has to wrap the call.

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createFormFill, type FormFillController } from 'ai-form-fill';

const form = ref<HTMLFormElement>();
const filled = ref(0);
let controller: FormFillController;

onMounted(() => {
  controller = createFormFill({ form: form.value!, source: '#notes', trigger: '#fill' });
  form.value!.addEventListener('aff:done', (e) => (filled.value = e.detail.filled.length));
});
onUnmounted(() => controller.destroy());
</script>

<template>
  <textarea id="notes"></textarea>
  <button id="fill">Fill form</button>
  <form ref="form">...</form>
  <p v-if="filled">Filled {{ filled }} field(s).</p>
</template>
```

The one-line alternative, with no controller to own:

```vue
<script setup lang="ts">
import { defineFormFillElement } from 'ai-form-fill/ui';
defineFormFillElement();
</script>

<template>
  <ai-form-fill for="#contact" voice />
</template>
```

Add `ai-form-fill` to `compilerOptions.isCustomElement` in your Vite config so
Vue leaves the tag alone.
