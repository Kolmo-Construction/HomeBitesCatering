import { useContext } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  try {
    return useAuthContext();
  } catch (error) {
    // Return a default value if used outside of AuthProvider
    return {
      user: null,
      loading: false,
      error: null,
      login: async () => { throw new Error("Auth provider not initialized"); },
      logout: async () => { throw new Error("Auth provider not initialized"); }
    };
  }
}
