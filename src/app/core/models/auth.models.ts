
export interface RegisterUserRequest {
  displayName: string | null;
  email: string;
  password: string;
  passwordConfimmation: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  email: string;
  accessToken: string;
}

export interface RegisterTokenResponse{
  access_token: string;
  token_type: string;
}


export interface AuthSession {
  email: string;
  accessToken: string | null;
  isAuthenticated: boolean;
}