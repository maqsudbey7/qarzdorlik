import { download, qs, request, upload } from './client';
import type {
  DebtorDetail, DebtorFilter, DebtorPayload, DebtorSort, DebtorSummary, Entry, EntryPayload, LoginPayload, Photo,
  Direction, ProfilePayload, PublicSheet, RegisterPayload, Stats, TokenResponse, User,
} from '../types/api';

export const authApi = {
  login: (d: LoginPayload) => request<TokenResponse>('/auth/login', 'POST', d),
  register: (d: RegisterPayload) => request<TokenResponse>('/auth/register', 'POST', d),
  me: () => request<User>('/auth/me'),
  updateMe: (d: ProfilePayload) => request<User>('/auth/me', 'PUT', d),
  changePassword: (current_password: string, new_password: string) =>
    request<TokenResponse>('/auth/password', 'POST', { current_password, new_password }),
  logoutAll: () => request<TokenResponse>('/auth/logout-all', 'POST'),
  exportData: () => download('/auth/export'),
  deleteAccount: (password: string) => request<void>('/auth/me', 'DELETE', { password }),
};

export const debtorsApi = {
  list: (f: { q?: string; filter?: DebtorFilter; sort?: DebtorSort; direction?: Direction }) => request<DebtorSummary[]>(`/debtors${qs(f)}`),
  get: (id: number) => request<DebtorDetail>(`/debtors/${id}`),
  create: (d: DebtorPayload) => request<DebtorDetail>('/debtors', 'POST', d),
  update: (id: number, d: DebtorPayload) => request<DebtorDetail>(`/debtors/${id}`, 'PUT', d),
  remove: (id: number) => request<void>(`/debtors/${id}`, 'DELETE'),
  resetShare: (id: number) => request<DebtorDetail>(`/debtors/${id}/share`, 'POST'),
};

export const entriesApi = {
  create: (debtorId: number, d: EntryPayload) => request<Entry>(`/debtors/${debtorId}/entries`, 'POST', d),
  update: (id: number, d: EntryPayload) => request<Entry>(`/entries/${id}`, 'PUT', d),
  remove: (id: number) => request<void>(`/entries/${id}`, 'DELETE'),
  uploadPhoto: (entryId: number, file: Blob) => upload<Photo>(`/entries/${entryId}/photos`, file),
  removePhoto: (id: number) => request<void>(`/photos/${id}`, 'DELETE'),
};

export const statsApi = { get: (year?: number) => request<Stats>(`/stats${qs({ year })}`) };
export const publicApi = { get: (token: string) => request<PublicSheet>(`/public/${token}`) };
