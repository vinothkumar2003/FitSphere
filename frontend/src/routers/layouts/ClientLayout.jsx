import React from "react";
import { Outlet } from "react-router-dom";
import ClientSidebar from "../../components/ClientSidebar";

export const ClientLayout = () => {
  return (
    <div className="app-shell">
      <ClientSidebar />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
};
