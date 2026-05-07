export default function CatalogLoading() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 animate-pulse">
          <div className="h-10 bg-gray-800 rounded-xl w-80 mb-3" />
          <div className="h-5 bg-gray-800 rounded-lg w-64" />
        </div>
        <div className="mb-10 flex gap-3 animate-pulse">
          <div className="flex-1 h-12 bg-gray-900 rounded-2xl border border-gray-800" />
          <div className="w-40 h-12 bg-gray-900 rounded-2xl border border-gray-800" />
          <div className="w-32 h-12 bg-gray-900 rounded-2xl border border-gray-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-black rounded-2xl border border-gray-800 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-900" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-800 rounded w-3/4" />
                <div className="h-4 bg-gray-800 rounded w-1/2" />
                <div className="h-6 bg-gray-800 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
