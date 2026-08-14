import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext } from "./auth-context";
import { createAuthGateway } from "./services/auth-service";
import type { AuthContextValue, AuthSession, AuthCredentials, PasswordResetRequest, PasswordUpdateRequest } from "./types";

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const gateway = useMemo(() => createAuthGateway(), []);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void gateway.getSession()
      .then((nextSession) => {
        if (!active) {
          return;
        }

        setSession(nextSession);
      })
      .catch((error_: unknown) => {
        if (!active) {
          return;
        }

        setError(error_ instanceof Error ? error_.message : "No fue posible cargar la sesión.");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    const unsubscribe = gateway.subscribe((nextSession) => {
      if (active) {
        setSession(nextSession);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [gateway]);

  const value: AuthContextValue = {
    session,
    isLoading,
    error,
    async signIn(credentials: AuthCredentials) {
      setError(null);
      setIsLoading(true);
      try {
        const nextSession = await gateway.signIn(credentials);
        setSession(nextSession);
        return nextSession;
      } catch (error_: unknown) {
        setError(error_ instanceof Error ? error_.message : "No fue posible iniciar sesión.");
        throw error_;
      } finally {
        setIsLoading(false);
      }
    },
    async signOut() {
      await gateway.signOut();
      setSession(null);
    },
    async requestPasswordReset(request: PasswordResetRequest) {
      await gateway.requestPasswordReset(request);
    },
    async updatePassword(request: PasswordUpdateRequest) {
      const nextSession = await gateway.updatePassword(request);
      setSession(nextSession);
      return nextSession;
    },
    async refreshSession() {
      setIsLoading(true);
      try {
        const nextSession = await gateway.getSession();
        setSession(nextSession);
        return nextSession;
      } finally {
        setIsLoading(false);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
