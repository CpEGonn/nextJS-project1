export default function Loading() {
  return (
    <section className="flex min-h-screen items-start justify-center pt-32">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-white"
        aria-label="Loading"
      />
    </section>
  );
}