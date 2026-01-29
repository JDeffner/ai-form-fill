import { AIFormFill } from '../../lib/core/main';
import { initializeAFFQuick } from '../../lib/core/main';

/**
 * Simple Test Application for AI Form Input
 */

// The only thing needed to initialize the form filling functionality
initializeAFFQuick();


const form = document.getElementById('aff-form');

// Handle form submission
form.addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('Form submitted!');
  const formData = new FormData(form);
  const data = {};
  
  formData.forEach((value, key) => {
    data[key] = value;
  });
  
  // Also get checkbox states
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    const cb = checkbox;
    data[cb.name] = cb.checked;
  });
  
  console.log('Form Data:', data);
  alert('Form submitted! Check console for data.');
});
