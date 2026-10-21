import React, { createContext, useContext, useState } from 'react';
import type { UserProfile, UserRole } from '@/types/api.js';

interface UserRoleContextType {
  role: UserRole;
  user: UserProfile;
  setRole: (role: UserRole) => void;
}

const roleProfiles: Record<UserRole, UserProfile> = {
  Admin: {
    id: 'u-admin',
    name: 'IT Admin',
    email: 'admin@inventory.internal',
    role: 'Admin',
    employeeId: 'EMP-ADM-01',
    department: 'IT Operations',
  },
  TL: {
    id: 'u-tl',
    name: 'Sarah Team Lead',
    email: 'sarah.tl@transsion.com',
    role: 'TL',
    employeeId: 'EMP-TL-04',
    department: 'Hardware Testing',
  },
  Employee: {
    id: 'u-emp',
    name: 'Garima Bhatt',
    email: 'garima.bhatt@transsion.com',
    role: 'Employee',
    employeeId: 'EMP-DEV-88',
    department: 'QA Engineering',
  },
};

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('inventory_active_role');
    return saved === 'Admin' || saved === 'TL' || saved === 'Employee' ? saved : 'Admin';
  });

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('inventory_active_role', newRole);
  };

  const user = roleProfiles[role];

  return (
    <UserRoleContext.Provider value={{ role, user, setRole }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextType {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
