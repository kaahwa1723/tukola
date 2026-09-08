export default function WorkerLoading() {
  return (
    <div aria-hidden="true">
      <div className="route-loading-bar" />
      <div className="mobile-container pb-nav">
        {/* greeting header */}
        <div className="mx-4 mt-4 rounded-3xl skel h-40" />
        {/* search */}
        <div className="mx-4 mt-4 skel h-12 rounded-2xl" />
        {/* category chips */}
        <div className="mx-4 mt-6 skel h-5 w-36 rounded-full" />
        <div className="px-4 mt-3 grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="skel w-12 h-12 rounded-2xl" />
              <div className="skel h-2 w-10 rounded-full" />
            </div>
          ))}
        </div>
        {/* banner */}
        <div className="mx-4 mt-6 skel h-16 rounded-2xl" />
        {/* job cards */}
        <div className="mx-4 mt-6 skel h-5 w-44 rounded-full" />
        <div className="px-4 mt-3 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skel h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
