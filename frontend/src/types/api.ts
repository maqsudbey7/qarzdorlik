// Backend Pydantic sxemalariga mos TypeScript interfeyslari
export type EntryKind = 'debt' | 'payment';
export type DebtorFilter = 'all' | 'debt' | 'clear' | 'overdue';
export type DebtorSort = 'recent' | 'balance' | 'name' | 'number';

export interface User { id: number; name: string; phone: string; shop_name: string }
export interface TokenResponse { access_token: string; token_type: 'bearer'; user: User }
export interface RegisterPayload { name: string; phone: string; password: string; shop_name: string }
export interface LoginPayload { phone: string; password: string }
export interface ProfilePayload { name: string; shop_name: string }

export interface DebtorSummary {
  id: number;
  number: number;
  name: string;
  phone: string;
  note: string;
  created_at: string;
  total_debt: number;
  total_paid: number;
  balance: number;
  entries_count: number;
  last_entry_at: string | null;
  next_due: string | null;
  overdue: boolean;
}
export interface DebtorPayload { name: string; phone: string; note: string }

export interface Photo { id: number; content_type: string; size: number }
export interface Entry {
  id: number;
  kind: EntryKind;
  amount: number;
  happened_at: string;
  due_date: string | null;
  note: string;
  created_at: string;
  photos: Photo[];
}
export interface EntryPayload { kind: EntryKind; amount: number; happened_at: string | null; due_date: string | null; note: string }
export interface DebtorDetail extends DebtorSummary { share_token: string; entries: Entry[] }

export interface Stats {
  outstanding: number;
  debtors_total: number;
  debtors_with_debt: number;
  overdue_count: number;
  overdue_amount: number;
  month_given: number;
  month_paid: number;
  year_given: number;
  year_paid: number;
  year: number;
  monthly: { month: number; given: number; paid: number }[];
  top: DebtorSummary[];
  recent: { id: number; debtor_id: number; debtor_number: number; debtor_name: string; kind: EntryKind; amount: number; happened_at: string; photos: number }[];
}

export interface PublicSheet {
  shop_name: string;
  owner_name: string;
  number: number;
  name: string;
  total_debt: number;
  total_paid: number;
  balance: number;
  entries: Entry[];
}
