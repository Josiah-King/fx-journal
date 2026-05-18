import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return sessionStorage.getItem("fx_logged_in") === "true";
  });

  function login(email, password, credentials) {
    if (
      email === credentials.email &&
      password === credentials.password
    ) {
      sessionStorage.setItem("fx_logged_in", "true");
      setUser(true);
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem("fx_logged_in");
    setUser(false);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
