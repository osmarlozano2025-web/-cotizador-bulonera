import { useContext } from "react";
import { AuthContext } from "../auth-context";
import type { AuthContextValue } from "../types";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
