import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  error = signal<string | null>(null);
  loading = signal(false);
  form: any;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get emailControl() {
    return this.form.get('email');
  }

  get passwordControl() {
    return this.form.get('password');
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    try {
      const email = this.form.value.email ?? '';
      const password = this.form.value.password ?? '';
      await this.auth.login(email, password);

      if (this.auth.pendingMfa()) {
        await this.router.navigate(['/mfa']);
      } else {
        await this.router.navigate(['/dashboard']);
      }
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      this.loading.set(false);
    }
  }
}
