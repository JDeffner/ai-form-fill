import { AIFormFill } from "../../lib/core/main";

const affForm = document.getElementById('hersteller-form');
  const affUnstructuredTextArea = document.getElementById('message-textinputTextModal0');
  const affFillButton = document.getElementById('btn-confirm-inputTextModal0');
  const affClearButton = document.getElementById('aff-clear-button') ;
  const affProvider = "Ollama";

  const affFormFill = new AIFormFill(affProvider, { debug: true });


  // Handle form filling
  if(affFillButton) {
    affFillButton.addEventListener('click', async () => {
    const affText = affUnstructuredTextArea.value.trim();
      try {
        // Use the ai-form-input library to parse and fill the form
        await affFormFill.parseAndFillForm(affForm, affText);
      } catch (error) {
        console.error('Error filling form:', error);
        // alert('Error filling form. Check console for details.');
      } 
    });
  } else {
    console.warn('AI Form Fill button not found');
  }

  // Add event listener to clear form if clear button has been found
  if(affClearButton)
    affClearButton.addEventListener('click', () => {affForm.reset();});