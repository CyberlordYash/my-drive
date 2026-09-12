import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  Home,
  HardDrive,
  ChevronRight,
  Users,
  Clock,
  Star,
  AlertOctagon,
  Trash2,
} from 'lucide-react';
import { StorageMeter } from './StorageMeter';
import { NewMenu } from './NewMenu';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'focus-ring flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors',
    isActive ? 'bg-nav-active text-white' : 'text-text hover:bg-surface-hover',
  );

export function Sidebar({
  onCreateFolder,
  onUploadFiles,
}: {
  onCreateFolder: () => void;
  onUploadFiles: (files: File[]) => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 overflow-y-auto py-4 pr-2">
      <div className="px-3 pb-3">
        <NewMenu onCreateFolder={onCreateFolder} onUploadFiles={onUploadFiles} />
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        <NavLink to="/" end className={navItemClass}>
          <Home className="h-5 w-5" />
          Home
        </NavLink>
        <NavLink to="/drive" className={navItemClass}>
          <HardDrive className="h-5 w-5" />
          My Drive
        </NavLink>
        <div
          className="focus-ring flex items-center justify-between rounded-full px-4 py-2 text-sm text-text-muted"
          title="Not applicable in this project — Google-product-specific"
        >
          <span className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 opacity-50" />
            Computers
          </span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </nav>

      <div className="my-2 border-t border-border" />

      <nav className="flex flex-col gap-0.5 px-2">
        <NavLink to="/shared-with-me" className={navItemClass}>
          <Users className="h-5 w-5" />
          Shared with me
        </NavLink>
        <NavLink to="/recent" className={navItemClass}>
          <Clock className="h-5 w-5" />
          Recent
        </NavLink>
        <NavLink to="/starred" className={navItemClass}>
          <Star className="h-5 w-5" />
          Starred
        </NavLink>
      </nav>

      <div className="my-2 border-t border-border" />

      <nav className="flex flex-col gap-0.5 px-2">
        <div
          className="focus-ring flex items-center gap-3 rounded-full px-4 py-2 text-sm text-text-muted"
          title="Not applicable in this project — Google-product-specific"
        >
          <AlertOctagon className="h-5 w-5 opacity-50" />
          Spam
        </div>
        <NavLink to="/trash" className={navItemClass}>
          <Trash2 className="h-5 w-5" />
          Trash
        </NavLink>
      </nav>

      <div className="mt-auto border-t border-border">
        <StorageMeter />
      </div>
    </aside>
  );
}
