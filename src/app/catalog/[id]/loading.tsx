export default function CatalogDetailLoading() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 animate-pulse">
        <div className="h-5 bg-gray-800 rounded w-32 mb-8" />
        <div className="h-72 sm:h-96 bg-gray-900 rounded-2xl mb-6" />
        <div className="bg-black rounded-2xl border border-gray-800 p-8 space-y-4">
          <div className="h-9 bg-gray-800 rounded w-2/3" />
          <div className="flex gap-4">
            <div className="h-4 bg-gray-800 rounded w-32" />
            <div className="h-4 bg-gray-800 rounded w-24" />
          </div>
          <div className="h-10 bg-gray-800 rounded w-48" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-800 rounded w-full" />
            <div className="h-4 bg-gray-800 rounded w-5/6" />
            <div className="h-4 bg-gray-800 rounded w-4/6" />
          </div>
        </div>
      </div>
    </main>
  );
}
