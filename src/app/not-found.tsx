import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-black px-6 text-center">
      <h1 className="text-6xl font-bold text-black dark:text-white">404</h1>
      <p className="mt-3 text-lg text-black/50 dark:text-white/50">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-black dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-black transition-opacity hover:opacity-80"
      >
        Go home
      </Link>
    </div>
  );
}
