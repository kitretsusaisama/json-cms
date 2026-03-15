export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Omit<RegisterData, 'confirmPassword'>) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}
