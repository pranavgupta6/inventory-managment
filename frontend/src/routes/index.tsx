import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout.js';
import { OverviewPage } from '@/features/overview/overview-page.js';
import { PlaceholderPage } from '@/components/placeholder-page.js';
import { InventoryPage } from '@/features/inventory/inventory-page.js';
import { AssignmentsPage } from '@/features/assignments/assignments-page.js';
import { RequestsPage } from '@/features/requests/requests-page.js';
import { AuditPage } from '@/features/audit/audit-page.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'requests',
        element: <RequestsPage />,
      },
      {
        path: 'assignments',
        element: <AssignmentsPage />,
      },
      {
        path: 'employees',
        element: (
          <PlaceholderPage
            title="Employees"
            description="Browse the organizational employee directory, synced from Lark."
          />
        ),
      },
      {
        path: 'departments',
        element: (
          <PlaceholderPage
            title="Departments"
            description="View the departmental hierarchy from your Lark organization."
          />
        ),
      },
      {
        path: 'reports',
        element: <AuditPage />,
      },
      {
        path: 'settings',
        element: (
          <PlaceholderPage
            title="Settings"
            description="Configure integration settings, roles, and preferences."
          />
        ),
      },
      {
        path: '*',
        element: (
          <PlaceholderPage
            title="Page Not Found"
            description="The page you are looking for does not exist."
          />
        ),
      },
    ],
  },
]);
