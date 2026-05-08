export default function PropertyDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-20 rounded-lg bg-gray-800" />
        <div className="h-4 w-40 rounded bg-gray-800" />
      </div>

      <div className="rounded-3xl border border-gray-800 bg-black p-6">
        <div className="h-5 w-32 rounded bg-gray-800" />
        <div className="mt-2 h-8 w-2/3 rounded bg-gray-800" />
        <div className="mt-3 h-7 w-48 rounded bg-gray-800" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="h-72 rounded-3xl bg-gray-800 sm:h-96" />
            <div className="grid gap-3 sm:grid-rows-2">
              <div className="h-36 rounded-2xl bg-gray-800 sm:h-auto" />
              <div className="h-36 rounded-2xl bg-gray-800 sm:h-auto" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl border border-gray-800 bg-black" />
            ))}
          </div>
          <div className="h-48 rounded-3xl border border-gray-800 bg-black" />
        </div>
        <div className="h-64 rounded-3xl border border-gray-800 bg-black" />
      </div>
    </div>
  );
}
