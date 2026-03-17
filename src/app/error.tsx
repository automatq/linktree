"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-black px-6 text-center">
      <h1 className="text-4xl font-bold text-black dark:text-white">
        Something went wrong
      </h1>
      <p className="mt-3 text-base text-black/50 dark:text-white/50">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-black dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-black transition-opacity hover:opacity-80"
      >
        Try again
      </button>
    </div>
  );
}
