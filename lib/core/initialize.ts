import { AIFormFill } from "./aiFormFill";
import { type AvailableProviders } from "./types";

// aff = a form fill
export function initializeAFFQuick(formId: string = 'aff-form') {
  // Get form elements
  const affForm = document.getElementById(formId) as HTMLFormElement;
  const affUnstructuredTextArea = document.getElementById('aff-text') as HTMLTextAreaElement;
  const affFillButton = document.getElementById('aff-text-button') as HTMLButtonElement;
  const affProvider = affForm.getAttribute('data-aff-provider') as AvailableProviders || "ollama" as AvailableProviders;

  const affFormFill = new AIFormFill(affProvider, { debug: true });


  // Handle form filling
  if(affFillButton) {
    affFillButton.addEventListener('click', async () => {
    const affText = affUnstructuredTextArea.value.trim();
      try {
        await affFormFill.parseAndFillForm(affForm, affText);
      } catch (error) {
        console.error('Error filling form:', error);
        // alert('Error filling form. Check console for details.');
      } 
    });
  } else {
    console.warn('AI Form Fill button not found');
  }
}
