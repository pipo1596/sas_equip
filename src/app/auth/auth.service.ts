import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AuthState {
  authenticated: boolean;
  mfaRequired: boolean;
  pendingSessionId: string | null;
  email: string | null;
  userid: string | null;
  token: string | null;
  error: string | null;
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'sas-equip-auth';
  private readonly sessionKey = 'sas-equip-session';

  private readonly loginEndpoint =
    `${environment.apiBaseUrl}${environment.endpoints.login}`;

  private readonly state = signal<AuthState>({
    authenticated: false,
    mfaRequired: false,
    pendingSessionId: null,
    email: null,
    userid: null,
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
    const action = 'LOGIN1';
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
          userid: payload.userid ?? null,  
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
        userid: payload.userid ?? null,
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
    const action = 'MFA1';
    try {
      
      const body = {
        action,
        userid: this.state().userid ?? '',
        code,
        sessionId: this.state().pendingSessionId ?? ''
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

      if (!response || !response.ok || payload.success !== true) {
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
      userid: null,
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
        userid?: string | null;
        success?: boolean;
        mfaRequired?: boolean;
        sessionId?: string | null;
        token?: string | null;
        message?: string;
      };
    } catch {
      return {
        userid: null,
        success: false,
        mfaRequired: false,
        sessionId: null,
        token: null,
        message: undefined,
      };
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' &&
           typeof localStorage !== 'undefined' &&
           typeof sessionStorage !== 'undefined';
  }

  private persistState() {
    if (!this.isBrowser()) {
      return;
    }

    const payload = {
      authenticated: this.state().authenticated,
      token: this.state().token,
      email: this.state().email,
      userid: this.state().userid
    };

    localStorage.setItem(this.storageKey, JSON.stringify(payload));

    if (this.state().authenticated) {
      sessionStorage.setItem(this.sessionKey, '1');
    } else {
      sessionStorage.removeItem(this.sessionKey);
    }
  }

  private restoreState() {
    if (!this.isBrowser()) {
      return;
    }

    // Session sentinel is set on login and survives F5, but cleared when the
    // browser closes. Without it, skip restore so closing the browser logs out.
    if (!sessionStorage.getItem(this.sessionKey)) {
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
        userid?: string | null;
      };

      if (parsed.authenticated && parsed.token) {
        this.state.set({
          authenticated: true,
          mfaRequired: false,
          pendingSessionId: null,
          email: parsed.email ?? null,
          userid: parsed.userid ?? null,
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