export const SKILL_GROUPS: Record<string, string[]> = {
  'Household': [
    'Cleaner', 'Cook', 'Housekeeper', 'Laundry & Ironing',
    'Nanny / Babysitter', 'House Helper', 'Dishwasher',
  ],
  'Construction': [
    'Builder / Mason', 'Plumber', 'Electrician', 'Carpenter',
    'Painter', 'Tiler', 'Welder', 'Roofer', 'Glass Fitter', 'Scaffolder',
  ],
  'Transport': [
    'Driver', 'Delivery Rider', 'Truck Driver', 'Porter / Mover', 'Courier',
  ],
  'Garden & Outdoor': [
    'Gardener', 'Landscaper', 'Pest Control', 'Tree Trimmer', 'Pool Cleaner',
  ],
  'Events & Hospitality': [
    'Event Staff', 'Waiter / Waitress', 'Bartender', 'DJ / Sound', 'Catering Assistant', 'Usher',
  ],
  'Security': [
    'Security Guard', 'Night Watchman', 'Bouncer',
  ],
  'Beauty & Fashion': [
    'Tailor', 'Hairdresser', 'Barber', 'Make-up Artist', 'Shoe Cobbler',
  ],
  'Technical & Repair': [
    'Mechanic', 'Phone Repair', 'AC Technician', 'Solar Installer',
    'IT Support', 'Appliance Repair', 'Borehole Driller',
  ],
  'Farming & Agriculture': [
    'Farm Worker', 'Harvester', 'Animal Handler', 'Irrigation Worker', 'Produce Grader',
  ],
  'Other': [
    'Photographer', 'Data Entry', 'Tutor / Teacher', 'Market Vendor',
    'Medical / First Aid', 'Graphic Design', 'Social Media',
  ],
};

export const SKILL_OPTIONS: string[] = Object.values(SKILL_GROUPS).flat();

export const JOB_CATEGORIES = [
  'Cleaning',
  'Plumbing',
  'Electrical',
  'Construction',
  'Moving & Delivery',
  'Gardening',
  'Painting',
  'Cooking & Catering',
  'Security',
  'Driving',
  'Events',
  'Tailoring',
  'Technical Repair',
  'Farming',
  'Beauty & Wellness',
  'Other',
];

export const LANDING_CATEGORIES = [
  { label: 'Cleaning',       image: '/images/slide-4.jpg',        color: '#059669' },
  { label: 'Construction',   image: '/images/service-construction.png', color: '#7C3AED' },
  { label: 'Driving',        image: '/images/slide-6.jpg',        color: '#DC2626' },
  { label: 'Cooking',        image: '/images/slide-5.jpg',        color: '#EA580C' },
  { label: 'Farming',        image: '/images/service-farming.png', color: '#16A34A' },
  { label: 'Security',       image: '/images/slide-8.jpg',        color: '#0F172A' },
  { label: 'Moving',         image: '/images/slide-3.jpg',        color: '#0369A1' },
  { label: 'Events',         image: '/images/slide-7.jpg',        color: '#9333EA' },
];

export const HERO_SLIDES = [
  { src: '/images/slide-1.jpg', caption: 'Find skilled workers near you',       sub: 'Plumbers · Builders · Electricians' },
  { src: '/images/slide-2.jpg', caption: 'Daily gigs. Instant pay.',             sub: 'Cleaners · Drivers · Cooks' },
  { src: '/images/slide-3.jpg', caption: 'Trusted workers across Uganda',        sub: 'Verified profiles · Rated by employers' },
  { src: '/images/slide-4.jpg', caption: 'Post a job. Hire in 60 seconds.',      sub: 'Immediate or scheduled · Any budget' },
];
