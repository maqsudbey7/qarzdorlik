import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '.';
import { detectLang, type Lang } from '../i18n';

export interface Toast { id: string; message: string; type: 'ok' | 'err' }
interface UiState { toasts: Toast[]; sidebarOpen: boolean; lang: Lang }

const initialState: UiState = { toasts: [], sidebarOpen: false, lang: detectLang() };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toastAdded: (s, { payload }: PayloadAction<Toast>) => { s.toasts.push(payload); },
    toastRemoved: (s, { payload }: PayloadAction<string>) => { s.toasts = s.toasts.filter((t) => t.id !== payload); },
    setSidebarOpen: (s, { payload }: PayloadAction<boolean>) => { s.sidebarOpen = payload; },
    setLang: (s, { payload }: PayloadAction<Lang>) => { s.lang = payload; },
  },
});

export const { toastAdded, toastRemoved, setSidebarOpen, setLang } = uiSlice.actions;
export default uiSlice.reducer;

/** Thunk: toast ko‘rsatib, 3.5 soniyadan so‘ng yashiradi. */
export const toast = (message: string, type: Toast['type'] = 'ok') => (dispatch: AppDispatch) => {
  const id = nanoid();
  dispatch(toastAdded({ id, message, type }));
  setTimeout(() => dispatch(toastRemoved(id)), 3500);
};
