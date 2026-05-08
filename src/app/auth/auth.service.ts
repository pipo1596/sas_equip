import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AuthState {
  authenticated: boolean;
  mfaRequired: boolean;
  pendingSessionId: string | null;
  email: string | null;
  token: string | null;
  error: string | null;
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'sas-equip-auth';

  private readonly loginEndpoint =
    `${environment.apiBaseUrl}${environment.endpoints.login}`;

  private readonly state = signal<AuthState>({
    authenticated: false,
    mfaRequired: false,
    pendingSessionId: null,
    email: null,
    token: null,
    error: null,
    loading: false,
  });

  readonly isAuthenticated = computed(() => this.state().authenticated);
  readonly pendingMfa = computed(() => this.state().mfaRequired);
  readonly loading = computed(() => this.state().loading);
  readonly errorMessage = computed(() => this.state().error);

  constructor() {
    this.restoreState();
  }

  get email() {
    return this.state().email;
  }

  async login(email: string, password: string) {
    this.patch({ loading: true, error: null });
    const action = 'LOGIN'
    try {
      const body = {
        email,
        password,
        action
        };

      const response = await fetch(this.loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const raw = await response.text();
      const payload = this.parseResponse(raw);

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message ?? 'Email or password is invalid.');
      }

      if (payload.mfaRequired ?? true) {
        this.patch({
          authenticated: false,
          mfaRequired: true,
          pendingSessionId: payload.sessionId ?? null,
          email,
          token: null,
          loading: false,
        });
        return;
      }

      this.patch({
        authenticated: true,
        mfaRequired: false,
        pendingSessionId: null,
        email,
        token: payload.token ?? null,
        loading: false,
      });
    } catch (error: unknown) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed.',
      });
      throw error;
    }
  }

  async verifyMfa(code: string) {
    this.patch({ loading: true, error: null });

    try {
      const body = new URLSearchParams({
        email: this.state().email ?? '',
        code,
        sessionId: this.state().pendingSessionId ?? '',
      });

      const response = await fetch(this.loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        credentials: 'include',
      });

      const raw = await response.text();
      const payload = this.parseResponse(raw);

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message ?? 'The verification code is invalid.');
      }

      this.patch({
        authenticated: true,
        mfaRequired: false,
        pendingSessionId: null,
        token: payload.token ?? null,
        loading: false,
      });
    } catch (error: unknown) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'MFA validation failed.',
      });
      throw error;
    }
  }

  logout() {
    this.state.set({
      authenticated: false,
      mfaRequired: false,
      pendingSessionId: null,
      email: null,
      token: null,
      error: null,
      loading: false,
    });
    this.persistState();
  }

  private patch(partial: Partial<AuthState>) {
    this.state.set({ ...this.state(), ...partial });
    this.persistState();
  }

  private parseResponse(raw: string) {
    try {
      return JSON.parse(raw) as {
        success?: boolean;
        mfaRequired?: boolean;
        sessionId?: string | null;
        token?: string | null;
        message?: string;
      };
    } catch {
      return {
        success: true,
        mfaRequired: true,
        sessionId: null,
        token: null,
        message: undefined,
      };
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' &&
           typeof localStorage !== 'undefined';
  }

  private persistState() {
    if (!this.isBrowser()) {
      return;
    }

    const payload = {
      authenticated: this.state().authenticated,
      token: this.state().token,
      email: this.state().email,
    };

    localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  private restoreState() {
    if (!this.isBrowser()) {
      return;
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        authenticated?: boolean;
        token?: string | null;
        email?: string | null;
      };

      if (parsed.authenticated && parsed.token) {
        this.state.set({
          authenticated: true,
          mfaRequired: false,
          pendingSessionId: null,
          email: parsed.email ?? null,
          token: parsed.token,
          error: null,
          loading: false,
        });
      }
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }
}