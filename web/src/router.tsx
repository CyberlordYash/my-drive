import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './components/RequireAuth';
import { Login } from './pages/Login';
import { MyDrive } from './pages/MyDrive';
import { SharedWithMe } from './pages/SharedWithMe';
import { Starred } from './pages/Starred';
import { Trash } from './pages/Trash';
import { Recent } from './pages/Recent';
import { SearchResults } from './pages/SearchResults';
import { PublicShare } from './pages/PublicShare';
import { Privacy } from './pages/Privacy';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/s/:token', element: <PublicShare /> },
  { path: '/privacy', element: <Privacy /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/drive" replace /> },
      { path: 'drive', element: <MyDrive /> },
      { path: 'drive/:folderId', element: <MyDrive /> },
      { path: 'shared-with-me', element: <SharedWithMe /> },
      { path: 'starred', element: <Starred /> },
      { path: 'recent', element: <Recent /> },
      { path: 'trash', element: <Trash /> },
      { path: 'search', element: <SearchResults /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
