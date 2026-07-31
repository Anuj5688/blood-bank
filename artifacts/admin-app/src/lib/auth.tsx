import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AdminAuthContextType {
  token: string | null;
  adminName: string | null;
  isAuthenticated: boolean;
  login: (token: string, name: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("admin_token");
  });
  
  const [adminName, setAdminName] = useState<string | null>(() => {
    return localStorage.getItem("admin_name");
  });

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const login = (newToken: string, name: string) => {
    localStorage.setItem("admin_token", newToken);
    localStorage.setItem("admin_name", name);
    setToken(newToken);
    setAdminName(name);
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_name");
    setToken(null);
    setAdminName(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        adminName,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
