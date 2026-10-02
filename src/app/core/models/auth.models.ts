
export interface RegisterUserRequest {
  displayName: string | null;
  email: string;
  password: string;
  passwordConfimmation: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse extends RegisterTokenResponse {
}

export interface RegisterTokenResponse{
  access_token: string;
  token_type: string;
}


export interface AuthSession {
  user: User | null;
  accessToken: string | null;
}


export interface User {
  email: string;
  name: string | null;
}