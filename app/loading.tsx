export default function RootLoading() {
  return (
    <div aria-hidden="true">
      <div className="route-loading-bar" />
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[#F0F4FF]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/opt/logo-white.webp" alt="" className="w-14 h-14 object-contain rounded-2xl shadow-lg shadow-blue-500/20 animate-pulse" />
        <div className="skel h-2.5 w-28 rounded-full" />
      </div>
    </div>
  );
}
