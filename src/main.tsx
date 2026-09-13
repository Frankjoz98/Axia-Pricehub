import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './context/AppContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { AlertsProvider } from './context/AlertsContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <CartProvider>
          <AlertsProvider>
            <App />
          </AlertsProvider>
        </CartProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
