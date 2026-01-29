/**
 * Integration tests using real Ollama provider
 * 
 * These test cases are translated from Kloses work
 * in order to verify that the AI Form Fill library
 * can handle similar scenarios and therefore be
 * at the very least on a similar level of performance.
 * 
 * Prerequisites:
 * - Ollama must be running locally (http://localhost:11434)
 * - A model must be available (default: gemma3:4b)
 * 
 * Run with: pnpm test tests/integration/ollama.integration.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { AIFormFill } from '../../lib/core/aiFormFill';
import { LocalOllamaProvider } from '../../lib/providers/localOllama';

const TEST_TIMEOUT = 60000;

// Setup jsdom
let document: Document;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  const window = dom.window as unknown as Window & typeof globalThis;
  
  global.document = document;
  global.Event = window.Event;
  global.HTMLElement = window.HTMLElement;
  global.HTMLInputElement = window.HTMLInputElement;
  global.HTMLTextAreaElement = window.HTMLTextAreaElement;
  global.HTMLSelectElement = window.HTMLSelectElement;
  global.HTMLFormElement = window.HTMLFormElement;
});

/**
 * Creates the paraglider form used in the former work's tests
 */
function createParagliderForm(): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = `
    <label for="manufacturer">Manufacturer</label>
    <select id="manufacturer" name="manufacturer">
      <option value="">Select manufacturer...</option>
      <option value="ozone">Ozone</option>
      <option value="nova">Nova</option>
      <option value="gin">Gin</option>
    </select>
    
    <label for="model">Model</label>
    <select id="model" name="model">
      <option value="">Select model...</option>
      <option value="enzo">Enzo</option>
      <option value="mentor">Mentor</option>
      <option value="bonanza">Bonanza</option>
      <option value="rush">Rush</option>
      <option value="ion">Ion</option>
      <option value="atlas">Atlas</option>
    </select>
    
    <label for="serialNumber">Serial Number</label>
    <input type="text" id="serialNumber" name="serialNumber" placeholder="Enter serial number">
    
    <label for="lastMaintenanceDate">Last Maintenance Date</label>
    <input type="date" id="lastMaintenanceDate" name="lastMaintenanceDate">
    
    <label for="remarks">Remarks</label>
    <textarea id="remarks" name="remarks" placeholder="Condition notes..."></textarea>
  `;
  document.body.appendChild(form);
  return form;
}

/**
 * Helper to get form values
 */
function getFormValues(form: HTMLFormElement) {
  return {
    manufacturer: form.querySelector<HTMLSelectElement>('[name="manufacturer"]')?.value || '',
    model: form.querySelector<HTMLSelectElement>('[name="model"]')?.value || '',
    serialNumber: form.querySelector<HTMLInputElement>('[name="serialNumber"]')?.value || '',
    lastMaintenanceDate: form.querySelector<HTMLInputElement>('[name="lastMaintenanceDate"]')?.value || '',
    remarks: form.querySelector<HTMLTextAreaElement>('[name="remarks"]')?.value || '',
  };
}

describe('Ollama Integration Tests', () => {
  let provider: LocalOllamaProvider;
  let aiFormFill: AIFormFill;
  let isOllamaAvailable = false;

  beforeAll(async () => {
    provider = new LocalOllamaProvider({
      apiEndpoint: 'http://localhost:11434',
      model: 'gemma3:4b',
      timeout: TEST_TIMEOUT,
    });

    try {
      isOllamaAvailable = await provider.isAvailable();
    } catch {
      isOllamaAvailable = false;
    }

    if (!isOllamaAvailable) {
      console.warn('Ollama is not available.');
    }
  });

  beforeEach(() => {
    aiFormFill = new AIFormFill(provider);
  });

  it('Test 1: extracts all fields when all information is present', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = 'Ozone, Enzo, 123456789, 2023-07-10, This is a test remark.';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('ozone');
    expect(values.model).toBe('enzo');
    expect(values.serialNumber).toBe('123456789');
    expect(values.lastMaintenanceDate).toBe('2023-07-10');
    expect(values.remarks).toContain('test remark');
  }, TEST_TIMEOUT);

  it('Test 2: handles missing serial number', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = 'Nova, Mentor, , 2023-06-15, This is another test remark.';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('nova');
    expect(values.model).toBe('mentor');
    expect(values.serialNumber).toBe('');
    expect(values.lastMaintenanceDate).toBe('2023-06-15');
    expect(values.remarks).toContain('another test remark');
  }, TEST_TIMEOUT);

  it('Test 3: handles missing maintenance date', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = 'Gin, Bonanza, 1122334455, , Good condition, no problems.';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('gin');
    expect(values.model).toBe('bonanza');
    expect(values.serialNumber).toBe('1122334455');
    expect(values.lastMaintenanceDate).toBe('');
    expect(values.remarks.toLowerCase()).toContain('good condition');
  }, TEST_TIMEOUT);

  it('Test 4: handles missing remarks', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = 'Ozone, Rush, 54321, 2023-04-25, ';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('ozone');
    expect(values.model).toBe('rush');
    expect(values.serialNumber).toBe('54321');
    expect(values.lastMaintenanceDate).toBe('2023-04-25');
  }, TEST_TIMEOUT);

  it('Test 5: handles missing manufacturer and model', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = ', , 9988776655, 2023-03-15, Slight wear visible.';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    // Manufacturer and model should remain at default (empty)
    expect(values.manufacturer).toBe('');
    expect(values.model).toBe('');
    expect(values.serialNumber).toBe('9988776655');
    expect(values.lastMaintenanceDate).toBe('2023-03-15');
    expect(values.remarks.toLowerCase()).toContain('wear');
  }, TEST_TIMEOUT);

  it('Test 6: handles only remarks provided', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = ', , , , Only a remark here.';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('');
    expect(values.model).toBe('');
    expect(values.serialNumber).toBe('');
    expect(values.lastMaintenanceDate).toBe('');
    expect(values.remarks.toLowerCase()).toContain('remark');
  }, TEST_TIMEOUT);

  it('Test 7: handles only serial number provided', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = ', , 1122334455, , ';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('');
    expect(values.model).toBe('');
    expect(values.serialNumber).toBe('1122334455');
    expect(values.lastMaintenanceDate).toBe('');
    expect(values.remarks).toBe('');
  }, TEST_TIMEOUT);

  it('Test 8: handles nonsensical inputs', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = 'test';

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('');
    expect(values.model).toBe('');
    expect(values.serialNumber).toBe('');
    expect(values.lastMaintenanceDate).toBe('');
    expect(values.remarks).toBe('');
  }, TEST_TIMEOUT);

  it('Test 9: extracts from long text with all information', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = `Here are the details: The manufacturer is Nova, the model is called Mentor, 
      the serial number is 987654321. The last maintenance date was 2023-06-15. 
      Remarks on condition: This is another test remark.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('nova');
    expect(values.model).toBe('mentor');
    expect(values.serialNumber).toBe('987654321');
    expect(values.lastMaintenanceDate).toBe('2023-06-15');
    expect(values.remarks).toContain('test remark');
  }, TEST_TIMEOUT);

  it('Test 10: extracts from long text with some missing info', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = `The details are as follows: Manufacturer: Gin, Model: Bonanza, 
      serial number is missing, Last maintenance date: 2023-05-20, 
      Condition: Good condition, no problems.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('gin');
    expect(values.model).toBe('bonanza');
    expect(values.serialNumber).toBe('');
    expect(values.lastMaintenanceDate).toBe('2023-05-20');
    expect(values.remarks.toLowerCase()).toContain('good condition');
  }, TEST_TIMEOUT);

  it('Test 11: extracts from long text without remarks', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = `Information: Ozone produces the model Rush with serial number 54321. 
      The last maintenance date was 2023-04-25. There are no further remarks.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('ozone');
    expect(values.model).toBe('rush');
    expect(values.serialNumber).toBe('54321');
    expect(values.lastMaintenanceDate).toBe('2023-04-25');
    expect(values.remarks).toBe('');
  }, TEST_TIMEOUT);

  it('Test 12: extracts from long text with complex information', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = `The paraglider has the following details: Manufacturer is Nova, 
      Model is Ion, Serial number is 9988776655, the last maintenance date was 2023-03-15. 
      Remark: Slight wear visible.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('nova');
    expect(values.model).toBe('ion');
    expect(values.serialNumber).toBe('9988776655');
    expect(values.lastMaintenanceDate).toBe('2023-03-15');
    expect(values.remarks.toLowerCase()).toContain('slight wear');
  }, TEST_TIMEOUT);

  it('Test 13: extracts from long text with missing serial and remarks', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = `Paraglider information: Manufacturer: Gin, Model: Atlas, 
      serial number is missing, Last maintenance date: 2023-02-10, No further remarks.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('gin');
    expect(values.model).toBe('atlas');
    expect(values.serialNumber).toBe('');
    expect(values.lastMaintenanceDate).toBe('2023-02-10');
    expect(values.remarks).toBe('');
  }, TEST_TIMEOUT);

  it('Test 14: extracts from very complex unstructured text', async () => {
    if (!isOllamaAvailable) return;

    const form = createParagliderForm();
    const input = `It was a sunny day and I was out with my new paraglider. 
      The manufacturer is Ozone and the model is called Ion. 
      My serial number, if I remember correctly, is 9988112233. 
      I had it serviced last on 2022-10-10. 
      A few notes: Slightly used but functional. I checked it a few weeks ago 
      and found no major problems. The colors are still vibrant and the 
      materials seem to be in good condition.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getFormValues(form);

    expect(values.manufacturer).toBe('ozone');
    expect(values.model).toBe('ion');
    expect(values.serialNumber).toBe('9988112233');
    expect(values.lastMaintenanceDate).toBe('2022-10-10');
    expect(values.remarks.toLowerCase()).toContain('used');
  }, TEST_TIMEOUT);
});

/**
 * Creates the advanced job application form matching the advanced demo
 */
function createAdvancedForm(): HTMLFormElement {
  const form = document.createElement('form');
  form.id = 'testForm';
  form.innerHTML = `
    <label for="firstName">First Name</label>
    <input type="text" id="firstName" name="firstName" placeholder="First name" required />
    
    <label for="lastName">Last Name</label>
    <input type="text" id="lastName" name="lastName" placeholder="Last name" required />
    
    <label for="email">Email</label>
    <input type="email" id="email" name="email" placeholder="email@example.com" required />
    
    <label for="phone">Phone</label>
    <input type="tel" id="phone" name="phone" placeholder="+1234567890" />
    
    <label for="address">Address</label>
    <input type="text" id="address" name="address" placeholder="Street address" />
    
    <label for="city">City</label>
    <input type="text" id="city" name="city" placeholder="City" />
    
    <label for="country">Country</label>
    <input type="text" id="country" name="country" placeholder="Country" />
    
    <label for="gender">Gender</label>
    <select id="gender" name="gender">
      <option value="">Select</option>
      <option value="male">Male</option>
      <option value="female">Female</option>
      <option value="other">Other</option>
    </select>
    
    <label for="birthDate">Birth Date</label>
    <input type="date" id="birthDate" name="birthDate" />
    
    <label for="startDate">Start Date</label>
    <input type="date" id="startDate" name="startDate" data-aff-hint="When can the person start working" />
    
    <label for="preferredTime">Preferred Contact Time</label>
    <input type="time" id="preferredTime" name="preferredTime" />
    
    <label>Employment Type</label>
    <input type="radio" name="employmentType" value="full-time" /> Full-time
    <input type="radio" name="employmentType" value="part-time" /> Part-time
    <input type="radio" name="employmentType" value="contract" /> Contract
    <input type="radio" name="employmentType" value="freelance" /> Freelance
    
    <label>Experience Level</label>
    <input type="radio" name="experienceLevel" value="junior" /> Junior (0-2 years)
    <input type="radio" name="experienceLevel" value="mid" /> Mid-level (3-5 years)
    <input type="radio" name="experienceLevel" value="senior" /> Senior (5+ years)
    
    <label>Interests</label>
    <input type="checkbox" id="interest_tech" name="interest_tech" value="technology" /> Technology
    <input type="checkbox" id="interest_sports" name="interest_sports" value="sports" /> Sports
    <input type="checkbox" id="interest_arts" name="interest_arts" value="arts" /> Arts
    <input type="checkbox" id="interest_music" name="interest_music" value="music" /> Music
    <input type="checkbox" id="interest_travel" name="interest_travel" value="travel" /> Travel
    
    <label>Preferences</label>
    <input type="checkbox" id="newsletter" name="newsletter" value="yes" /> Subscribe to newsletter
    <input type="checkbox" id="notifications" name="notifications" value="yes" /> Enable notifications
    
    <label for="about">About Me</label>
    <textarea id="about" name="about" rows="3" placeholder="Briefly introduce yourself" data-aff-hint="If no useful information is provided dont return anything"></textarea>
  `;
  document.body.appendChild(form);
  return form;
}

/**
 * Helper to get advanced form values
 */
function getAdvancedFormValues(form: HTMLFormElement) {
  return {
    firstName: form.querySelector<HTMLInputElement>('[name="firstName"]')?.value || '',
    lastName: form.querySelector<HTMLInputElement>('[name="lastName"]')?.value || '',
    email: form.querySelector<HTMLInputElement>('[name="email"]')?.value || '',
    phone: form.querySelector<HTMLInputElement>('[name="phone"]')?.value || '',
    address: form.querySelector<HTMLInputElement>('[name="address"]')?.value || '',
    city: form.querySelector<HTMLInputElement>('[name="city"]')?.value || '',
    country: form.querySelector<HTMLInputElement>('[name="country"]')?.value || '',
    gender: form.querySelector<HTMLSelectElement>('[name="gender"]')?.value || '',
    birthDate: form.querySelector<HTMLInputElement>('[name="birthDate"]')?.value || '',
    startDate: form.querySelector<HTMLInputElement>('[name="startDate"]')?.value || '',
    preferredTime: form.querySelector<HTMLInputElement>('[name="preferredTime"]')?.value || '',
    employmentType: form.querySelector<HTMLInputElement>('[name="employmentType"]:checked')?.value || '',
    experienceLevel: form.querySelector<HTMLInputElement>('[name="experienceLevel"]:checked')?.value || '',
    interest_tech: form.querySelector<HTMLInputElement>('[name="interest_tech"]')?.checked || false,
    interest_sports: form.querySelector<HTMLInputElement>('[name="interest_sports"]')?.checked || false,
    interest_arts: form.querySelector<HTMLInputElement>('[name="interest_arts"]')?.checked || false,
    interest_music: form.querySelector<HTMLInputElement>('[name="interest_music"]')?.checked || false,
    interest_travel: form.querySelector<HTMLInputElement>('[name="interest_travel"]')?.checked || false,
    newsletter: form.querySelector<HTMLInputElement>('[name="newsletter"]')?.checked || false,
    notifications: form.querySelector<HTMLInputElement>('[name="notifications"]')?.checked || false,
    about: form.querySelector<HTMLTextAreaElement>('[name="about"]')?.value || '',
  };
}

describe('Advanced Form Integration Tests', () => {
  let provider: LocalOllamaProvider;
  let aiFormFill: AIFormFill;
  let isOllamaAvailable = false;

  beforeAll(async () => {
    provider = new LocalOllamaProvider({
      apiEndpoint: 'http://localhost:11434',
      model: 'gemma3:4b',
      timeout: TEST_TIMEOUT,
    });

    try {
      isOllamaAvailable = await provider.isAvailable();
    } catch {
      isOllamaAvailable = false;
    }

    if (!isOllamaAvailable) {
      console.warn('Ollama is not available for Advanced Form tests.');
    }
  });

  beforeEach(() => {
    aiFormFill = new AIFormFill(provider);
  });

  it('Advanced Test 1: fills complete job application with all fields', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `My name is John Doe. My email is john.doe@example.com and my phone number is +1 555 123 4567.
      I live at 123 Main Street, New York, USA. I am male and was born on 1990-05-15.
      I can start working on 2024-02-01 and prefer to be contacted at 14:00.
      I am looking for full-time employment and I have senior level experience (5+ years).
      My interests include technology, music, and travel. Please subscribe me to the newsletter.
      About me: I am a passionate software developer with 7 years of experience.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('john');
    expect(values.lastName.toLowerCase()).toBe('doe');
    expect(values.email).toBe('john.doe@example.com');
    expect(values.phone).toContain('555');
    expect(values.address).toContain('123');
    expect(values.city.toLowerCase()).toBe('new york');
    expect(values.country.toLowerCase()).toContain('usa');
    expect(values.gender).toBe('male');
    expect(values.birthDate).toBe('1990-05-15');
    expect(values.startDate).toBe('2024-02-01');
    expect(values.employmentType).toBe('full-time');
    expect(values.experienceLevel).toBe('senior');
    expect(values.interest_tech).toBe(true);
    expect(values.interest_music).toBe(true);
    expect(values.interest_travel).toBe(true);
    expect(values.newsletter).toBe(true);
    expect(values.about.toLowerCase()).toContain('software developer');
  }, TEST_TIMEOUT);

  it('Advanced Test 2: handles natural language introduction', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Hi! I'm Jane Smith and I'd love to join your team. You can reach me at 
      jane.smith@company.org or call me at +49 170 9876543. I currently live in Berlin, Germany
      at Alexanderplatz 5. I'm a woman, born on March 20th, 1988. I'm interested in a part-time
      position since I have a mid-level experience of about 4 years. I love sports and arts!`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('jane');
    expect(values.lastName.toLowerCase()).toBe('smith');
    expect(values.email).toBe('jane.smith@company.org');
    expect(values.city.toLowerCase()).toBe('berlin');
    expect(values.country.toLowerCase()).toContain('germany');
    expect(values.gender).toBe('female');
    expect(values.employmentType).toBe('part-time');
    expect(values.experienceLevel).toBe('mid');
    expect(values.interest_sports).toBe(true);
    expect(values.interest_arts).toBe(true);
  }, TEST_TIMEOUT);

  it('Advanced Test 3: fills form with minimal required info', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Alice Johnson, alice@test.com`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('alice');
    expect(values.lastName.toLowerCase()).toBe('johnson');
    expect(values.email).toBe('alice@test.com');
    // Other fields should be empty or unchecked
    expect(values.phone).toBe('');
    expect(values.address).toBe('');
  }, TEST_TIMEOUT);

  it('Advanced Test 4: handles contact information only', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Contact: Bob Williams, bob.williams@mail.com, Phone: +44 20 7946 0958, 
      Address: 10 Downing Street, London, UK`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('bob');
    expect(values.lastName.toLowerCase()).toBe('williams');
    expect(values.email).toBe('bob.williams@mail.com');
    expect(values.phone).toContain('20');
    expect(values.address).toContain('Downing');
    expect(values.city.toLowerCase()).toBe('london');
    expect(values.country.toLowerCase()).toContain('uk');
  }, TEST_TIMEOUT);

  it('Advanced Test 5: handles employment preferences without personal details', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `I'm looking for a contract position. I have junior level experience with 
      about 1 year of work. I'm interested in technology and would like to receive notifications 
      about new opportunities. I can start on 2024-03-15 and prefer morning calls around 09:30.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.employmentType).toBe('contract');
    expect(values.experienceLevel).toBe('junior');
    expect(values.startDate).toBe('2024-03-15');
    expect(values.preferredTime).toBe('09:30');
    expect(values.interest_tech).toBe(true);
    expect(values.notifications).toBe(true);
  }, TEST_TIMEOUT);

  it('Advanced Test 6: handles freelance developer profile', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `I'm Max Mueller, a freelance developer based in Munich, Germany. 
      Email: max.mueller@dev.io, Phone: +49 89 1234567. Born 1985-12-01. 
      I have been working in tech for over 8 years (senior level). 
      My interests span technology, travel, and music. Don't subscribe me to any newsletters.
      About me: Experienced full-stack developer specializing in React and Node.js.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('max');
    expect(values.lastName.toLowerCase()).toContain('mueller');
    expect(values.email).toBe('max.mueller@dev.io');
    expect(values.city.toLowerCase()).toBe('munich');
    expect(values.country.toLowerCase()).toContain('germany');
    expect(values.birthDate).toBe('1985-12-01');
    expect(values.employmentType).toBe('freelance');
    expect(values.experienceLevel).toBe('senior');
    expect(values.interest_tech).toBe(true);
    expect(values.interest_travel).toBe(true);
    expect(values.interest_music).toBe(true);
    expect(values.newsletter).toBe(false);
    expect(values.about.toLowerCase()).toContain('full-stack');
  }, TEST_TIMEOUT);

  it('Advanced Test 7: handles international applicant with varied date formats', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Hi, I'm Yuki Tanaka from Tokyo, Japan. My email is yuki.tanaka@email.jp.
      I was born on July 7th, 1995 and I'm available to start working from April 1st, 2024.
      Please contact me in the afternoon around 3 PM. I identify as other gender.
      I'm interested in arts and music. Looking for full-time work as I'm mid-level (3 years exp).`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('yuki');
    expect(values.lastName.toLowerCase()).toBe('tanaka');
    expect(values.email).toBe('yuki.tanaka@email.jp');
    expect(values.city.toLowerCase()).toBe('tokyo');
    expect(values.country.toLowerCase()).toContain('japan');
    expect(values.gender).toBe('other');
    expect(values.birthDate).toBe('1995-07-07');
    expect(values.startDate).toBe('2024-04-01');
    expect(values.preferredTime).toBe('15:00');
    expect(values.employmentType).toBe('full-time');
    expect(values.experienceLevel).toBe('mid');
    expect(values.interest_arts).toBe(true);
    expect(values.interest_music).toBe(true);
  }, TEST_TIMEOUT);

  it('Advanced Test 8: handles complex paragraph with embedded information', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Let me introduce myself. My name is Sarah Connor and I'm reaching out 
      regarding your open position. I can be reached at sarah.connor@future.com or 
      by phone at +1-800-555-0199. I reside at 456 Oak Avenue in Los Angeles, California, USA.
      I am female and was born on November 13th, 1965. I've been in the industry for over 
      10 years and would be classified as senior level. I'm passionate about technology 
      and sports. I'd love to receive your newsletter and enable notifications for updates.
      I'm looking for a full-time position and can start immediately - let's say 2024-01-15.
      Best time to reach me would be around 10:30 in the morning.
      
      About me: Battle-hardened professional with experience in high-pressure situations.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('sarah');
    expect(values.lastName.toLowerCase()).toBe('connor');
    expect(values.email).toBe('sarah.connor@future.com');
    expect(values.phone).toContain('555');
    expect(values.city.toLowerCase()).toContain('los angeles');
    expect(values.country.toLowerCase()).toContain('usa');
    expect(values.gender).toBe('female');
    expect(values.birthDate).toBe('1965-11-13');
    expect(values.startDate).toBe('2024-01-15');
    expect(values.preferredTime).toBe('10:30');
    expect(values.employmentType).toBe('full-time');
    expect(values.experienceLevel).toBe('senior');
    expect(values.interest_tech).toBe(true);
    expect(values.interest_sports).toBe(true);
    expect(values.newsletter).toBe(true);
    expect(values.notifications).toBe(true);
    expect(values.about.toLowerCase()).toContain('battle-hardened');
  }, TEST_TIMEOUT);

  it('Advanced Test 9: handles bullet-point style information', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Applicant Information:
      - Name: David Lee
      - Email: david.lee@gmail.com
      - Phone: +82 10 1234 5678
      - Location: Seoul, South Korea
      - Gender: Male
      - Birth Date: 1992-08-22
      - Employment: Part-time
      - Experience: Junior (1 year)
      - Interests: Technology, Travel
      - Newsletter: Yes`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('david');
    expect(values.lastName.toLowerCase()).toBe('lee');
    expect(values.email).toBe('david.lee@gmail.com');
    expect(values.city.toLowerCase()).toBe('seoul');
    expect(values.country.toLowerCase()).toContain('korea');
    expect(values.gender).toBe('male');
    expect(values.birthDate).toBe('1992-08-22');
    expect(values.employmentType).toBe('part-time');
    expect(values.experienceLevel).toBe('junior');
    expect(values.interest_tech).toBe(true);
    expect(values.interest_travel).toBe(true);
    expect(values.newsletter).toBe(true);
  }, TEST_TIMEOUT);

  it('Advanced Test 10: handles only interests and preferences', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `I'm really into technology, sports, arts, and music. 
      Please send me the newsletter and enable all notifications!`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.interest_tech).toBe(true);
    expect(values.interest_sports).toBe(true);
    expect(values.interest_arts).toBe(true);
    expect(values.interest_music).toBe(true);
    expect(values.newsletter).toBe(true);
    expect(values.notifications).toBe(true);
    // Personal info should remain empty
    expect(values.firstName).toBe('');
    expect(values.lastName).toBe('');
  }, TEST_TIMEOUT);

  it('Advanced Test 11: handles nonsensical input gracefully', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    // All fields should remain empty/unchecked
    expect(values.firstName).toBe('');
    expect(values.lastName).toBe('');
    expect(values.email).toBe('');
    expect(values.employmentType).toBe('');
    expect(values.interest_tech).toBe(false);
  }, TEST_TIMEOUT);

  it('Advanced Test 12: handles email and phone only', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Please contact me at contact@example.org or call +1 212 555 1234`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.email).toBe('contact@example.org');
    expect(values.phone).toContain('212');
    expect(values.firstName).toBe('');
  }, TEST_TIMEOUT);

  it('Advanced Test 13: handles multi-paragraph about section', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Name: Emily Chen, Email: emily.chen@startup.io
      
      About me: I am a product manager with 5 years of experience in the tech industry.
      I have led multiple successful product launches and enjoy working with cross-functional teams.
      My background includes both technical and business roles, giving me a unique perspective.`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('emily');
    expect(values.lastName.toLowerCase()).toBe('chen');
    expect(values.email).toBe('emily.chen@startup.io');
    expect(values.about.toLowerCase()).toContain('product manager');
  }, TEST_TIMEOUT);

  it('Advanced Test 14: handles European address format', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Hans Schmidt, Musterstraße 42, 10115 Berlin, Deutschland
      Email: hans.schmidt@web.de, Tel: +49 30 12345678
      Männlich, geboren am 15.03.1980`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('hans');
    expect(values.lastName.toLowerCase()).toBe('schmidt');
    expect(values.email).toBe('hans.schmidt@web.de');
    expect(values.address).toContain('42');
    expect(values.city.toLowerCase()).toBe('berlin');
    expect(values.gender).toBe('male');
    expect(values.birthDate).toBe('1980-03-15');
  }, TEST_TIMEOUT);

  it('Advanced Test 15: handles all checkboxes scenario', async () => {
    if (!isOllamaAvailable) return;

    const form = createAdvancedForm();
    const input = `Tom Hardy, tom@movies.com. I love everything - technology, sports, arts, 
      music, and travel! Sign me up for the newsletter and all notifications please!`;

    await aiFormFill.parseAndFillForm(form, input);
    const values = getAdvancedFormValues(form);

    expect(values.firstName.toLowerCase()).toBe('tom');
    expect(values.lastName.toLowerCase()).toBe('hardy');
    expect(values.email).toBe('tom@movies.com');
    expect(values.interest_tech).toBe(true);
    expect(values.interest_sports).toBe(true);
    expect(values.interest_arts).toBe(true);
    expect(values.interest_music).toBe(true);
    expect(values.interest_travel).toBe(true);
    expect(values.newsletter).toBe(true);
    expect(values.notifications).toBe(true);
  }, TEST_TIMEOUT);
});
