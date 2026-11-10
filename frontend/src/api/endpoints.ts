import { qs, request, upload } from './client';
import type {
  DebtorDetail, DebtorFilter, DebtorPayload, DebtorSort, DebtorSummary, Entry, EntryPayload, LoginPayload, Photo,
  ProfilePayload, PublicSheet, RegisterPayload, Stats, TokenResponse, User,
} from '../types/api';

export const authApi = {
  login: (d: LoginPayload) => request<TokenResponse>('/auth/login', 'POST', d),
  register: (d: RegisterPayload) => request<TokenResponse>('/auth/register', 'POST', d),
  me: () => request<User>('/auth/me'),
  updateMe: (d: ProfilePayload) => request<User>('/auth/me', 'PUT', d),
};

export const debtorsApi = {
  list: (f: { q?: string; filter?: DebtorFilter; sort?: DebtorSort }) => request<DebtorSummary[]>(`/debtors${qs(f)}`),
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
