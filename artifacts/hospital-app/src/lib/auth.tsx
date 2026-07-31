import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  token: string | null;
  role: string | null;
  hospitalId: number | null;
  userName: string | null;
  login: (token: string, role: string, hospitalId: number | null, userName?: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("pbc_hospital_token"));
  const [role, setRole] = useState<string | null>(localStorage.getItem("pbc_hospital_role"));
  const [hospitalId, setHospitalId] = useState<number | null>(
    localStorage.getItem("pbc_hospital_hospitalId") ? Number(localStorage.getItem("pbc_hospital_hospitalId")) : null
  );
  const [userName, setUserName] = useState<string | null>(localStorage.getItem("pbc_hospital_userName"));

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const login = (newToken: string, newRole: string, newHospitalId: number | null, newUserName?: string | null) => {
    setToken(newToken);
    setRole(newRole);
    setHospitalId(newHospitalId);
    if (newUserName) setUserName(newUserName);
    else setUserName(null);
    
    localStorage.setItem("pbc_hospital_token", newToken);
    localStorage.setItem("pbc_hospital_role", newRole);
    if (newHospitalId !== null) {
      localStorage.setItem("pbc_hospital_hospitalId", newHospitalId.toString());
    } else {
      localStorage.removeItem("pbc_hospital_hospitalId");
    }
    if (newUserName) {
      localStorage.setItem("pbc_hospital_userName", newUserName);
    } else {
      localStorage.removeItem("pbc_hospital_userName");
    }
    setAuthTokenGetter(() => newToken);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setHospitalId(null);
    setUserName(null);
    localStorage.removeItem("pbc_hospital_token");
    localStorage.removeItem("pbc_hospital_role");
    localStorage.removeItem("pbc_hospital_hospitalId");
    localStorage.removeItem("pbc_hospital_userName");
    setAuthTokenGetter(() => null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        hospitalId,
        userName,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
