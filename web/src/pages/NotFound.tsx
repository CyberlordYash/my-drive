import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <FileQuestion className="h-16 w-16 text-text-muted opacity-40" />
      <div className="text-lg text-text">Page not found</div>
      <Link to="/drive" className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#1b1b1b]">
        Back to My Drive
      </Link>
    </div>
  );
}
