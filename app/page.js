import WorkRestTimeline from '@/components/WorkRestTimeline';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-4">
        <h1 className="text-xl font-semibold sm:text-2xl">Work &amp; Rest</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          A driver&rsquo;s work and rest periods, one 24-hour day at a time.
        </p>
      </div>

      <WorkRestTimeline />
    </main>
  );
}
