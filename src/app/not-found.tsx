import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-stone-600">We couldn&apos;t find what you were looking for.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to shop
      </Link>
    </div>
  );
}
