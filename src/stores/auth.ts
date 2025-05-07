import { createStore } from "solid-js/store";
import { AuthState, User, Session } from "~/types/auth";
import { authService } from "~/lib/Server/auth";

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
};

export const [auth, setAuth] = createStore<AuthState>(initialState);

export const initializeAuth = async () => {
  const token = localStorage.getItem("sessionToken");
  if (!token) {
    setAuth({ isLoading: false });
    return;
  }

  try {
    const session = await authService.validateSession(token);
    if (!session) {
      localStorage.removeItem("sessionToken");
      setAuth({ isLoading: false });
      return;
    }

    const user = await authService.getUserById(session.userId);
    setAuth({
      user,
      session,
      isAuthenticated: true,
      isLoading: false,
    });
  } catch (error) {
    localStorage.removeItem("sessionToken");
    setAuth({ isLoading: false });
  }
};

export const login = async (email: string, password: string) => {
  setAuth({ isLoading: true });
  try {
    const response = await authService.login({ email, password });
    localStorage.setItem("sessionToken", response.session.token);
    setAuth({
      user: response.user,
      session: response.session,
      isAuthenticated: true,
      isLoading: false,
    });
    return response;
  } catch (error) {
    setAuth({ isLoading: false });
    throw error;
  }
};

export const register = async (username: string, email: string, password: string) => {
  setAuth({ isLoading: true });
  try {
    const response = await authService.register({ username, email, password });
    localStorage.setItem("sessionToken", response.session.token);
    setAuth({
      user: response.user,
      session: response.session,
      isAuthenticated: true,
      isLoading: false,
    });
    return response;
  } catch (error) {
    setAuth({ isLoading: false });
    throw error;
  }
};

export const logout = async () => {
  const token = localStorage.getItem("sessionToken");
  if (token) {
    await authService.logout(token);
  }
  localStorage.removeItem("sessionToken");
  setAuth(initialState);
}; 