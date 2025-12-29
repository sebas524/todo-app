import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-input-bar-with-button',
  imports: [],
  templateUrl: './input-bar-with-button.component.html',
  styleUrl: './input-bar-with-button.component.css',
})
export class InputBarWithButtonComponent {
  // UI config:
  placeholder = input<string>('Enter text...');
  buttonLabel = input<string>('Submit');

  // Tailwind hooks to keep exact styles per usage:
  containerClass = input<string>('');
  inputClass = input<string>('');
  buttonClass = input<string>(
    'bg-slate-900 hover:bg-slate-800 focus:ring-slate-200'
  );

  // Behavior
  clearOnSubmit = input<boolean>(true);
  submitted = output<string>();

  value = signal<string>('');
  isDisabled() {
    return this.value().trim().length === 0;
  }
  submit() {
    const trimmed = this.value().trim();
    if (!trimmed) return;

    this.submitted.emit(trimmed);

    if (this.clearOnSubmit()) {
      this.value.set('');
    }
  }
}
