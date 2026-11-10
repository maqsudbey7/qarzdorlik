import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import ui from './uiSlice';
import { save } from '../lib/storage';

export const store = configureStore({ reducer: { auth, ui } });

// Kirish ma'lumoti va tilni localStorage'da saqlash
let prev = store.getState();
document.documentElement.lang = prev.ui.lang;
store.subscribe(() => {
  const s = store.getState();
  if (s.auth !== prev.auth) save('qarz-auth', s.auth);
  if (s.ui.lang !== prev.ui.lang) {
    try { localStorage.setItem('qarz-lang', s.ui.lang); } catch { /* storage yo'q */ }
    document.documentElement.lang = s.ui.lang;
  }
  prev = s;
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
