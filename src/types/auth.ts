export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
  photoURL?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  photoURL?: string;
}

export interface DeleteUserRequest {
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  oobCode: string;
  newPassword: string;
}

export interface AuthResponse {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message: string;
  timestamp: string;
}

export interface FirebaseAuthError {
  code: string;
  message: string;
}

export interface DecodedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  sub: string;
}
