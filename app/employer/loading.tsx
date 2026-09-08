export default function EmployerLoading() {
  return (
    <div aria-hidden="true">
      <div className="route-loading-bar" />
      <div className="mobile-container pb-nav">
        <div className="mx-4 mt-4 rounded-3xl skel h-36" />
        <div className="mx-4 mt-3 rounded-2xl skel h-14" />
        <div className="mx-4 mt-6 skel h-5 w-40 rounded-full" />
        <div className="px-4 mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel h-24 rounded-2xl" />
          ))}
        </div>
        <div className="mx-4 mt-6 skel h-5 w-44 rounded-full" />
        <div className="px-4 mt-3 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="skel h-48 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
