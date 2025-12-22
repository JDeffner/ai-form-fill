import { AIFormFill } from "./main";
import { type AvailableProviders } from "./core/types";

// aff = a form fill
export function initializeAFFQuick() {
  // Get form elements
  const affForm = document.getElementById('aff-form') as HTMLFormElement;
  const affUnstructuredTextArea = document.getElementById('aff-text') as HTMLTextAreaElement;
  const affFillButton = document.getElementById('aff-text-button') as HTMLButtonElement;
  const affClearButton = document.getElementById('aff-clear-button') as HTMLButtonElement;
  const affProvider = affForm.getAttribute('data-aff-provider') as AvailableProviders || 'Ollama' as AvailableProviders;

  const affFormFill = new AIFormFill(affProvider, { debug: true });


  // Handle form filling
  affFillButton.addEventListener('click', async () => {
    const affText = affUnstructuredTextArea.value.trim();

    try {
      // Use the ai-form-input library to parse and fill the form
      await affFormFill.parseAndFillForm(affForm, affText);
    } catch (error) {
      console.error('Error filling form:', error);
      alert('Error filling form. Check console for details.');
    } 
  });

  // Clear form fields
  affClearButton.addEventListener('click', () => {
    affForm.reset();
  });
}