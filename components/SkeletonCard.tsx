export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-32 mx-auto mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="h-3 bg-gray-200 rounded w-16 mt-2" />
        </div>
        <div className="flex flex-col items-center gap-2 px-4">
          <div className="h-4 bg-gray-200 rounded w-8" />
          <div className="flex gap-2">
            <div className="w-11 h-10 bg-gray-200 rounded-lg" />
            <div className="w-11 h-10 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="h-3 bg-gray-200 rounded w-16 mt-2" />
        </div>
      </div>
    </div>
  );
}
