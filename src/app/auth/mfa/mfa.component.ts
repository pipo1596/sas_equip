import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mfa.component.html',
})
export class MfaComponent {
  error = signal<string | null>(null);
  loading = signal(false);
  form!: import('@angular/forms').FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(4)]],
    });

    if (!auth.pendingMfa() && !auth.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  get codeControl() {
    return this.form.get('code');
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    try {
      const code = this.form.value.code ?? '';
      await this.auth.verifyMfa(code);
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Verification failed.');
    } finally {
      this.loading.set(false);
    }
  }
}
