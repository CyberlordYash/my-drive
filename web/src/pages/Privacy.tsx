import { Link } from 'react-router-dom';

/**
 * A plain, honest privacy policy — required by Google to switch the OAuth
 * consent screen to production, even for an app using only basic scopes.
 * Says what's actually true for this project: it's a small personal/demo
 * Drive clone, not a commercial product.
 */
export function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-text">
      <Link to="/" className="text-sm text-accent hover:underline">
        &larr; Back to Drive
      </Link>
      <h1 className="mt-6 text-2xl font-medium">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-text-muted">
        <p>
          Drive is a personal project — a Google Drive–style file manager built as a
          demonstration/portfolio application. It is not a commercial product, and this
          policy describes exactly what it does with your data.
        </p>

        <section>
          <h2 className="mb-1 text-base font-medium text-text">What we collect</h2>
          <p>
            When you sign in with Google, we receive your name, email address, and
            profile picture — nothing else. We do not request access to your Google
            Drive, Gmail, contacts, or any other Google service.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-medium text-text">Files you upload</h2>
          <p>
            Files you upload are stored to provide the app's core functionality (listing,
            renaming, searching, and sharing your own files) and are only accessible to
            you, unless you explicitly share a file with another user or create a public
            link for it.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-medium text-text">What we don't do</h2>
          <p>
            We do not sell, rent, or share your data with third parties. We do not use
            your data for advertising. We do not analyze file contents beyond what's
            needed to detect file type for display and safety purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-medium text-text">Data deletion</h2>
          <p>
            Deleting a file moves it to trash, where it is permanently removed after 30
            days (or immediately if you empty the trash). To have your account and all
            associated data removed entirely, contact the email below.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-base font-medium text-text">Contact</h2>
          <p>Questions about this policy: yashsachan321@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
