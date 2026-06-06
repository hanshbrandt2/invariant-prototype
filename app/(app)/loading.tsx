/** Route-level loading state for the app surfaces — a calm, on-brand skeleton
 *  rather than a spinner. */
export default function Loading() {
  return (
    <div className="px-6 md:px-10 py-10 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-24 rounded bg-paper-2" />
      <div className="mt-4 h-9 w-2/3 max-w-[420px] rounded bg-paper-2" />
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-7">
        <div className="lg:col-span-7 h-40 rounded-xl bg-paper-2" />
        <div className="lg:col-span-5 h-40 rounded-xl bg-paper-2" />
      </div>
      <div className="mt-8 h-5 w-40 rounded bg-paper-2" />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="h-48 rounded-xl bg-paper-2" />
        <div className="h-48 rounded-xl bg-paper-2" />
      </div>
    </div>
  );
}
