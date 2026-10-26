import { Shield, UserCheck, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUserRole } from '@/context/user-role-context.js';
import type { UserRole } from '@/types/api.js';

const pageTitles: Record<string, string> = {
  '/': 'Overview & Dashboard',
  '/inventory': 'Inventory Catalog',
  '/requests': 'Equipment Requests',
  '/assignments': 'Device Assignments',
  '/employees': 'Employees',
  '/reports': 'Audit & Compliance Reports',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (pathname in pageTitles) {
    return pageTitles[pathname] ?? 'Inventory';
  }
  const match = Object.keys(pageTitles).find(
    (key) => key !== '/' && pathname.startsWith(key),
  );
  return (match !== undefined ? pageTitles[match] : null) ?? 'Inventory';
}

export function TopBar() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const { role, user, setRole } = useUserRole();

  const getRoleIcon = () => {
    switch (role) {
      case 'Admin':
        return <Shield className="h-4 w-4 text-emerald-600" />;
      case 'TL':
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case 'Employee':
        return <User className="h-4 w-4 text-amber-600" />;
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Role Switcher & Active User Info */}
      <div className="flex items-center gap-3">
        {/* Role Selector */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-1 text-xs">
          <span className="font-medium text-muted-foreground px-2 flex items-center gap-1.5">
            {getRoleIcon()}
            Active Role:
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="h-7 rounded border-none bg-background px-2 text-xs font-semibold shadow-sm focus:ring-1 focus:ring-primary"
            aria-label="Switch User Role"
          >
            <option value="Admin">Admin (Upload & Audit)</option>
            <option value="TL">Team Lead (Approvals & Reallocation)</option>
            <option value="Employee">Employee (Requisitions & Returns)</option>
          </select>
        </div>

        {/* User profile details */}
        <div className="hidden sm:flex items-center gap-2 border-l pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="text-left text-xs leading-tight">
            <p className="font-semibold text-foreground">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">{user.department} • {user.employeeId}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
