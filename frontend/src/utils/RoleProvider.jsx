// Auth role context for FitSphere
// Usage: import { useRole } from './RoleProvider';
import React, { createContext, useContext, useState } from "react";

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  // Default role is 'client'. You can set this after login.
  const [role, setRole] = useState("client");

  // Switch role (simulate login as different user type)
  const loginAs = (newRole) => {
    setRole(newRole);
  };

  return (
    <RoleContext.Provider value={{ role, loginAs }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
