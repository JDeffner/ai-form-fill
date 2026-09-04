/**
 * The form the demos fill: an ordinary HTML form with `name` attributes. The
 * Advanced page adds dates, a time and two radio groups (`extended`).
 */
import type { ComponentProps } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { CheckOption, Field, Options, TextField } from './fields';

export function DemoForm({
  extended,
  children,
  ...form
}: ComponentProps<'form'> & { extended?: boolean }) {
  return (
    <form className="grid gap-5" {...form}>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="First name" name="firstName" placeholder="First name" required />
        <TextField label="Last name" name="lastName" placeholder="Last name" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <TextField
          label="Email"
          name="email"
          type="email"
          placeholder="email@example.com"
          required
        />
        <TextField label="Phone" name="phone" type="tel" placeholder="+1234567890" />
      </div>
      <TextField label="Address" name="address" placeholder="Street address" />
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr_1fr]">
        <TextField label="City" name="city" placeholder="City" />
        <TextField label="Country" name="country" placeholder="Country" />
        <Field label="Gender" htmlFor="gender">
          <NativeSelect id="gender" name="gender" defaultValue="">
            <NativeSelectOption value="">Select</NativeSelectOption>
            <NativeSelectOption value="male">Male</NativeSelectOption>
            <NativeSelectOption value="female">Female</NativeSelectOption>
            <NativeSelectOption value="other">Other</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>

      {extended && (
        <>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField label="Birth date" name="birthDate" type="date" />
            <TextField
              label="Start date"
              name="startDate"
              type="date"
              data-aff-hint="When can the person start working"
            />
            <TextField label="Preferred contact time" name="preferredTime" type="time" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Options label="Employment type">
              <CheckOption type="radio" name="employmentType" value="full-time">
                Full-time
              </CheckOption>
              <CheckOption type="radio" name="employmentType" value="part-time">
                Part-time
              </CheckOption>
              <CheckOption type="radio" name="employmentType" value="contract">
                Contract
              </CheckOption>
              <CheckOption type="radio" name="employmentType" value="freelance">
                Freelance
              </CheckOption>
            </Options>
            <Options label="Experience level">
              <CheckOption type="radio" name="experienceLevel" value="junior">
                Junior (0-2 years)
              </CheckOption>
              <CheckOption type="radio" name="experienceLevel" value="mid">
                Mid-level (3-5 years)
              </CheckOption>
              <CheckOption type="radio" name="experienceLevel" value="senior">
                Senior (5+ years)
              </CheckOption>
            </Options>
          </div>
        </>
      )}

      <Options label="Interests">
        <CheckOption type="checkbox" name="interest_tech" value="technology">
          Technology
        </CheckOption>
        <CheckOption type="checkbox" name="interest_sports" value="sports">
          Sports
        </CheckOption>
        <CheckOption type="checkbox" name="interest_arts" value="arts">
          Arts
        </CheckOption>
        <CheckOption type="checkbox" name="interest_music" value="music">
          Music
        </CheckOption>
        <CheckOption type="checkbox" name="interest_travel" value="travel">
          Travel
        </CheckOption>
      </Options>
      <Options label="Preferences">
        <CheckOption type="checkbox" name="newsletter" value="yes">
          Subscribe to newsletter
        </CheckOption>
        <CheckOption type="checkbox" name="notifications" value="yes">
          Enable notifications
        </CheckOption>
      </Options>

      <Field label="About me" htmlFor="about">
        <Textarea
          id="about"
          name="about"
          rows={3}
          placeholder="Briefly introduce yourself"
          data-aff-hint={
            extended ? 'If no useful information is provided return nothing' : undefined
          }
        />
      </Field>
      {children}
    </form>
  );
}

/** Plain object of the current form values, checkboxes as booleans. */
export function readForm(form: HTMLFormElement) {
  const data: Record<string, FormDataEntryValue | boolean> = {};
  new FormData(form).forEach((value, key) => (data[key] = value));
  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
    data[cb.name] = cb.checked;
  });
  return data;
}
