import { SearchLoadingSkeleton } from "./search-page.components";

export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-3xl border border-gray-800 bg-black" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="h-72 animate-pulse rounded-3xl border border-gray-800 bg-black" />
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-2xl border border-gray-800 bg-black" />
          <SearchLoadingSkeleton />
        </div>
      </div>
    </div>
  );
}
