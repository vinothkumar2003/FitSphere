import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import './sidebar.css';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './utils/AuthProvider';
import MainRouter from './routers/MainRouter';
// import App from './App.jsx';

// If you use AuthProvider and MainRouter, make sure they are imported:
// import { AuthProvider } from './AuthProvider';
// import { MainRouter } from './path/to/MainRouter';

createRoot(document.getElementById('root')).render(
      <StrictMode>
            <AuthProvider>
                  <RouterProvider router={MainRouter} />
            </AuthProvider>
      </StrictMode>
);