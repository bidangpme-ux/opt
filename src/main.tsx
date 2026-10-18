import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { initAntiInspect } from './lib/antiInspect';

// Inisialisasi proteksi Anti-Inspect & keamanan browser
initAntiInspect();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
