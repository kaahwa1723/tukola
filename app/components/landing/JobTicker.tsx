'use client';

const jobTypes = [
  "Cleaner", "Plumber", "Electrician", "Driver", "Cook", 
  "Gardner", "Builder", "Security Guard", "Tailor", 
  "Delivery", "Events", "Beauty", "Mechanic", "Farmer", 
  "Painter", "Welder", "Mason", "Carpenter"
];

const items = [...jobTypes, ...jobTypes];

export default function JobTicker() {
  return (
    <div className="w-full bg-dark-bg py-4 overflow-hidden border-y border-white/5 relative flex items-center">
      <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-dark-bg to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-dark-bg to-transparent z-10 pointer-events-none"></div>
      
      <div className="flex w-max animate-marquee">
        {items.map((job, idx) => (
          <div key={idx} className="flex items-center text-gray-400 font-medium whitespace-nowrap">
            <span className="px-6 text-lg hover:text-accent transition-colors cursor-default">{job}</span>
            <span className="text-gray-700 text-xs opacity-50">&bull;</span>
          </div>
        ))}
      </div>
    </div>
  );
}
