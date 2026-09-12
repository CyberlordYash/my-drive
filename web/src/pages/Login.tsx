import { useSearchParams } from 'react-router-dom';
import { FileText, Image, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import { googleLoginUrl } from '../api/auth';
import { DeploymentNotice } from '../components/DeploymentNotice';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'Google sign-in failed. Please try again.',
};

export function Login() {
  const [params] = useSearchParams();
  const errorCode = params.get('error');

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg">
      <DeploymentNotice />
      <div className="relative flex flex-1">
        {/* Decorative panel — hidden on small screens. Purely visual, no
            functional content, so it's fine that it's absent on mobile. */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden lg:flex">
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, #8ab4f8, transparent 70%)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #0842a0, transparent 70%)' }}
          />

          <div className="relative flex flex-col items-start gap-10 px-16">
            <FloatingCards />
            <div>
              <h2 className="max-w-md text-3xl font-medium leading-tight text-text">
                All your files,
                <br />
                in one place.
              </h2>
              <p className="mt-3 max-w-sm text-sm text-text-muted">
                Upload, organize, and share your files with the people who need
                them — from anywhere, on any device.
              </p>
            </div>
          </div>
        </div>

        {/* Sign-in panel */}
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-9 shadow-2xl shadow-black/40">
            <div className="flex flex-col items-center text-center">
              <img src="/logo.svg" alt="" className="h-16 w-16 drop-shadow-lg" />
              <h1 className="mt-5 text-2xl font-medium text-text">Welcome to Drive</h1>
              <p className="mt-1.5 text-sm text-text-muted">
                Sign in to store, share, and find your files.
              </p>

              {errorCode && (
                <p className="mt-4 w-full rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {OAUTH_ERROR_MESSAGES[errorCode] ?? 'Something went wrong signing in.'}
                </p>
              )}

              {/* A real anchor navigation, not a fetch — OAuth requires the
                  browser to actually leave the SPA and follow Google's 302
                  redirect chain back to our callback. */}
              <a
                href={googleLoginUrl()}
                className="focus-ring mt-7 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-4 py-3 text-sm font-medium text-[#1b1b1b] shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md active:scale-[0.99]"
              >
                <GoogleIcon />
                Continue with Google
              </a>

              <div className="mt-6 flex items-center gap-1.5 text-xs text-text-muted">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secured by Google — we never see your password
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingCards() {
  const cards = [
    { Icon: FileText, label: 'quarterly-report.pdf', color: 'text-[#f28b82]', className: '-rotate-6' },
    { Icon: Image, label: 'team-photo.jpg', color: 'text-[#81c995]', className: 'translate-x-10 translate-y-14 rotate-3' },
    { Icon: Share2, label: 'shared with 3 people', color: 'text-accent', className: 'translate-x-4 translate-y-28 -rotate-2' },
  ];
  return (
    <div className="relative h-44 w-72">
      {cards.map(({ Icon, label, color, className }, i) => (
        <div
          key={label}
          className={`absolute flex items-center gap-2 whitespace-nowrap rounded-2xl border border-border bg-surface px-4 py-3 shadow-xl ${className}`}
          style={{ zIndex: i }}
        >
          <Icon className={`h-5 w-5 shrink-0 ${color}`} />
          <span className="text-xs text-text">{label}</span>
        </div>
      ))}
      <div className="absolute right-4 top-0 rounded-full bg-accent p-1.5 shadow-lg">
        <Sparkles className="h-3.5 w-3.5 text-[#1b1b1b]" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
