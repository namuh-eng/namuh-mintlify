export default function CustomDomainNotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-6 text-[#1f1d2c]">
      <section className="max-w-lg rounded-3xl border border-[#e5dfd0] bg-white p-8 text-center shadow-sm">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8b9ae8]">
          OpenDocs
        </p>
        <h1 className="[font-family:var(--font-display)] text-4xl tracking-[-0.02em]">
          Docs site not found
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#6b6878]">
          This hostname is not connected to a verified OpenDocs project yet.
          Check the custom domain settings for your project, then verify the DNS
          CNAME once it has propagated.
        </p>
      </section>
    </main>
  );
}
