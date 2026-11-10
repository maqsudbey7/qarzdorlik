import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { store } from './store';
import { clearUserData, setupPwa } from './lib/pwa';
import App from './App';
import './index.css';

setupPwa();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
});

// Foydalanuvchi chiqqanda — telefonda saqlangan ma'lumotlarni tozalaymiz
let lastToken = store.getState().auth.token;
store.subscribe(() => {
  const token = store.getState().auth.token;
  if (lastToken && !token) { clearUserData(); queryClient.clear(); }
  lastToken = token;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MotionConfig>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
