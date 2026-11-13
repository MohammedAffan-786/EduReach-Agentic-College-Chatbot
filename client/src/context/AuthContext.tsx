import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getMe } from "../services/auth.service";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getMe()
        .then((data) => setUser(data.user))
        .catch(() => {
          const cached = localStorage.getItem("user");
          if (cached) {
            try {
              setUser(JSON.parse(cached));
              return;
            } catch {}
          }
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData?: User) => {
    localStorage.setItem("token", token);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      return;
    }
    getMe()
      .then((data) => {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch(() => {
        const cached = localStorage.getItem("user");
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {}
        }
      });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
