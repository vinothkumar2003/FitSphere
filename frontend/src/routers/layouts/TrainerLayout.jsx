import React from "react";
import { Outlet } from "react-router-dom";
import TrainerSidebar from "../../components/TrainerSidebar";

export const TrainerLayout = () => {
  return (
    <div className="app-shell">
      <TrainerSidebar />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
};
