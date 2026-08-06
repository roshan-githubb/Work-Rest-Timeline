import WorkRestTimeline from '@/components/WorkRestTimeline';
import { DAY_LABEL } from '@/lib/config';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-xl font-semibold sm:text-2xl">Work &amp; Rest</h1>
        <p className="mt-0.5 text-sm text-slate-600">{DAY_LABEL}</p>
      </div>

      <WorkRestTimeline />
    </main>
  );
}
