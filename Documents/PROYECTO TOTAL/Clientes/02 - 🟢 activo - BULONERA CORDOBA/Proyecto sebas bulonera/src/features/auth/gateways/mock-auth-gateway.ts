import type { AuthCredentials, AuthGateway, AuthSession, PasswordResetRequest, PasswordUpdateRequest } from "../types";
import { createMockSession } from "../services/auth-service";

const storageKey = "cordoba-bulones-auth-session";
const localEmail = "admin@cordobabulones.local";
const localPassword = "admin123";

function readSession(): AuthSession | null {
  const raw = globalThis.localStorage?.getItem(storageKey) ?? null;
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null): void {
  if (session === null) {
    globalThis.localStorage?.removeItem(storageKey);
    return;
  }

  globalThis.localStorage?.setItem(storageKey, JSON.stringify(session));
}

export class MockAuthGateway implements AuthGateway {
  private readonly listeners = new Set<(session: AuthSession | null) => void>();

  getSession(): Promise<AuthSession | null> {
    return Promise.resolve(readSession());
  }

  signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const email = credentials.email.trim().toLowerCase();
    if (email !== localEmail || credentials.password !== localPassword) {
      return Promise.reject(new Error("Correo o contraseña incorrectos."));
    }

    const session = createMockSession(localEmail);
    writeSession(session);
    this.notify(session);
    return Promise.resolve(session);
  }

  signOut(): Promise<void> {
    writeSession(null);
    this.notify(null);
    return Promise.resolve();
  }

  requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    void request;
    return Promise.resolve();
  }

  updatePassword(request: PasswordUpdateRequest): Promise<AuthSession> {
    void request;
    const session = readSession() ?? createMockSession();
    writeSession(session);
    this.notify(session);
    return Promise.resolve(session);
  }

  subscribe(onSessionChange: (session: AuthSession | null) => void): () => void {
    this.listeners.add(onSessionChange);
    return () => {
      this.listeners.delete(onSessionChange);
    };
  }

  private notify(session: AuthSession | null): void {
    for (const listener of this.listeners) {
      listener(session);
    }
  }
}
