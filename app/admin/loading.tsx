export default function AdminLoading() {
  return (
    <div aria-hidden="true">
      <div className="route-loading-bar" />
      <div className="flex min-h-dvh bg-[#F5F7FF]">
        {/* sidebar */}
        <div className="hidden lg:flex flex-col w-60 bg-[#0A1260] p-5 gap-3">
          <div className="skel h-10 w-32 rounded-xl !bg-white/10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skel h-9 rounded-lg !bg-white/10" />
          ))}
        </div>
        <div className="flex-1 p-6 lg:p-8">
          <div className="skel h-8 w-52 rounded-xl" />
          <div className="skel h-4 w-72 rounded-full mt-2" />
          {/* stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skel h-28 rounded-2xl" />
            ))}
          </div>
          {/* content panels */}
          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <div className="skel h-72 rounded-2xl" />
            <div className="skel h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
