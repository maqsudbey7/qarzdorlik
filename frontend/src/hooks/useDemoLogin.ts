import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAppDispatch } from '../store/hooks';
import { loggedIn } from '../store/authSlice';
import { toast } from '../store/uiSlice';

export const DEMO = { phone: '+998900000000', password: 'demo123' };

/** Bir bosishda demo hisobga kirish. */
export function useDemoLogin() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  return useMutation({
    mutationFn: () => authApi.login(DEMO),
    onSuccess: (r) => { dispatch(loggedIn(r)); nav('/app'); },
    onError: (e: Error) => dispatch(toast(e.message, 'err')),
  });
}
