import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TokenResponse, User } from '../types/api';
import { load } from '../lib/storage';

export interface AuthState { token: string | null; user: User | null }

const initialState: AuthState = load<AuthState>('qarz-auth', { token: null, user: null });

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loggedIn: (_s, { payload }: PayloadAction<TokenResponse>) => ({ token: payload.access_token, user: payload.user }),
    userLoaded: (s, { payload }: PayloadAction<User>) => { s.user = payload; },
    logout: () => ({ token: null, user: null }),
  },
});

export const { loggedIn, userLoaded, logout } = authSlice.actions;
export default authSlice.reducer;
