import { PropertyCardSkeleton } from "@/components/ui/property-card";

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
            <PropertyCardSkeleton key={`catalog-skeleton-${i}`} className="h-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
