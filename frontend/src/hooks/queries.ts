import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { debtorsApi, entriesApi, publicApi, statsApi } from '../api/endpoints';
import type { Direction, DebtorFilter, DebtorPayload, DebtorSort } from '../types/api';
import { useAppDispatch } from '../store/hooks';
import { toast } from '../store/uiSlice';

export const keys = {
  debtors: (f: object) => ['debtors', f] as const,
  debtor: (id: number) => ['debtor', id] as const,
  stats: (year?: number) => ['stats', year ?? 'now'] as const,
  pub: (token: string) => ['public', token] as const,
};

export const useDebtors = (f: { q?: string; filter?: DebtorFilter; sort?: DebtorSort; direction?: Direction }) =>
  useQuery({ queryKey: keys.debtors(f), queryFn: () => debtorsApi.list(f), placeholderData: (prev) => prev });
export const useDebtor = (id: number) => useQuery({ queryKey: keys.debtor(id), queryFn: () => debtorsApi.get(id), enabled: id > 0 });
export const useStats = (year?: number) => useQuery({ queryKey: keys.stats(year), queryFn: () => statsApi.get(year), placeholderData: (prev) => prev });
export const usePublic = (token: string) => useQuery({ queryKey: keys.pub(token), queryFn: () => publicApi.get(token), retry: false });

/** Har qanday o'zgarishdan keyin ro'yxat, varaq va hisobot yangilanadi. */
export function useRefresh() {
  const qc = useQueryClient();
  return () => {
    for (const k of ['debtors', 'debtor', 'stats']) qc.invalidateQueries({ queryKey: [k] });
  };
}

function useErrorToast() {
  const dispatch = useAppDispatch();
  return (e: Error) => dispatch(toast(e.message, 'err'));
}

export function useSaveDebtor() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: DebtorPayload }) => (id ? debtorsApi.update(id, data) : debtorsApi.create(data)),
    onSuccess: refresh,
  });
}

export function useDeleteDebtor() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: debtorsApi.remove, onSuccess: refresh, onError: useErrorToast() });
}

export function useResetShare() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: debtorsApi.resetShare, onSuccess: refresh, onError: useErrorToast() });
}

export function useDeleteEntry() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: entriesApi.remove, onSuccess: refresh, onError: useErrorToast() });
}

export function useDeletePhoto() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: entriesApi.removePhoto, onSuccess: refresh, onError: useErrorToast() });
}
