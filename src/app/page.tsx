import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-grad mx-auto mb-6 flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-white">H</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Houselights</h1>
        <p className="text-muted text-sm mb-8">Know the artists before you see them.</p>
        <Link
          href="/lineup"
          className="inline-block w-full bg-grad text-white py-4 rounded-2xl font-extrabold text-sm"
        >
          Build your lineup
        </Link>
      </div>
    </main>
  );
}
