import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  isRegisterMode = signal(false);
  error = signal<string | null>(null);
  isLoading = signal(false);

  myForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit() {
    this.error.set(null);

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.myForm.getRawValue();

    this.isLoading.set(true);
    try {
      if (this.isRegisterMode()) {
        await this.auth.register(email, password);
      } else {
        await this.auth.login(email, password);
      }

      await this.router.navigateByUrl('/todos');
    } catch (err: any) {
      this.error.set(err.message ?? 'An error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleMode() {
    this.error.set(null);
    this.isRegisterMode.update((prevValue) => {
      return !prevValue;
    });
  }
}
