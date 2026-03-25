import React from 'react';
import { Outlet } from 'react-router-dom';

export const PublicLayout = () => {
  return (
    // <div style={{ display: 'flex', minHeight: '100vh' }}>
    //   <Sidebar />
    //   <div style={{ flex: 1, background: '#f8f9fa' }}>
        <Outlet />
      // </div>
    // </div>
  );
}