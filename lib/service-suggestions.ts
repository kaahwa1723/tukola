/**
 * Service templates — what fundis actually sell, per category.
 *
 * Grounded in real Jiji.ug service listings (Sept 2026 research):
 * Jiji works in Uganda because listings are SPECIFIC
 * ("PVC Ceiling Installers — UGX 1,000,000 per service",
 *  "Bed Bugs Thorough Fumigation", "Washing Machine Repair —
 *  UGX 60,000 per service"), not broad ("repair services").
 *
 * Tapping a template pre-fills the worker's add-service form;
 * the worker only has to set their price. Standardised titles
 * also make employer search ("braiding", "fumigation") actually
 * find things, because listings stop being free-text guesswork.
 *
 * Titles/units are English by design — that is the language of
 * Ugandan classifieds — and they become the worker's own listing
 * text once saved (user content, not UI chrome).
 */

export interface ServiceTemplate {
  title: string;
  unit: string;
}

export const SERVICE_TEMPLATES: Record<string, ServiceTemplate[]> = {
  'Cleaning': [
    { title: 'House cleaning',            unit: 'per room' },
    { title: 'Full home deep cleaning',   unit: 'per house' },
    { title: 'Sofa & carpet cleaning',    unit: 'per seat' },
    { title: 'Office cleaning',           unit: 'per day' },
    { title: 'Compound cleaning',         unit: 'per day' },
    { title: 'Post-construction cleaning', unit: 'per house' },
  ],
  'Plumbing': [
    { title: 'Pipe & tap repairs',        unit: 'per job' },
    { title: 'Toilet & bathroom fitting', unit: 'per job' },
    { title: 'Water heater installation', unit: 'per unit' },
    { title: 'Tank installation',         unit: 'per tank' },
    { title: 'Drainage unblocking',       unit: 'per job' },
  ],
  'Electrical': [
    { title: 'House wiring',              unit: 'per room' },
    { title: 'Socket & switch repairs',   unit: 'per point' },
    { title: 'Lighting installation',     unit: 'per point' },
    { title: 'Solar installation',        unit: 'per job' },
    { title: 'Fridge & freezer repair',   unit: 'per job' },
  ],
  'Construction': [
    { title: 'Bricklaying & masonry',     unit: 'per day' },
    { title: 'Gypsum ceiling installation', unit: 'per room' },
    { title: 'PVC ceiling installation',  unit: 'per room' },
    { title: 'Terrazzo & tile floors',    unit: 'per square metre' },
    { title: 'Roofing & repairs',         unit: 'per job' },
    { title: 'Concrete & slab work',      unit: 'per day' },
  ],
  'Moving & Delivery': [
    { title: 'House shifting',            unit: 'per trip' },
    { title: 'Office relocation',         unit: 'per trip' },
    { title: 'Pickup truck hire with loader', unit: 'per trip' },
    { title: 'Parcel & goods delivery',   unit: 'per trip' },
  ],
  'Gardening': [
    { title: 'Compound slashing',         unit: 'per visit' },
    { title: 'Hedge & flower trimming',   unit: 'per visit' },
    { title: 'Garden design & planting',  unit: 'per job' },
    { title: 'Tree cutting & removal',    unit: 'per tree' },
  ],
  'Painting': [
    { title: 'Interior house painting',   unit: 'per room' },
    { title: 'Exterior wall painting',    unit: 'per job' },
    { title: 'Roof painting',             unit: 'per job' },
    { title: 'Furniture & door varnishing', unit: 'per item' },
  ],
  'Cooking & Catering': [
    { title: 'Event catering',            unit: 'per plate' },
    { title: 'Home cooking (daily meals)', unit: 'per day' },
    { title: 'Cake baking',               unit: 'per cake' },
    { title: 'Local dishes for functions', unit: 'per pot' },
  ],
  'Security': [
    { title: 'Night guard duty',          unit: 'per night' },
    { title: 'Day guard duty',            unit: 'per day' },
    { title: 'Event security',            unit: 'per event' },
    { title: 'CCTV installation',         unit: 'per camera' },
  ],
  'Driving': [
    { title: 'Personal driver',           unit: 'per day' },
    { title: 'Airport pickup & drop-off', unit: 'per trip' },
    { title: 'Delivery driving',          unit: 'per day' },
    { title: 'Boda boda errands',         unit: 'per trip' },
  ],
  'Events': [
    { title: 'Decor & venue setup',       unit: 'per event' },
    { title: 'Sound system & DJ',         unit: 'per event' },
    { title: 'Photography & video',       unit: 'per event' },
    { title: 'MC services',               unit: 'per event' },
    { title: 'Tent & chairs hire crew',   unit: 'per event' },
  ],
  'Tailoring': [
    { title: 'Dress & gomesi tailoring',  unit: 'per outfit' },
    { title: 'Suit tailoring',            unit: 'per suit' },
    { title: 'Uniform making',            unit: 'per piece' },
    { title: 'Clothing repairs & alterations', unit: 'per item' },
    { title: 'Curtains & soft furnishings', unit: 'per window' },
  ],
  'Technical Repair': [
    { title: 'Phone screen replacement',  unit: 'per phone' },
    { title: 'Laptop & computer repair',  unit: 'per job' },
    { title: 'TV repair & mounting',      unit: 'per job' },
    { title: 'Washing machine repair',    unit: 'per job' },
    { title: 'Generator repair',          unit: 'per job' },
    { title: 'Fumigation & pest control', unit: 'per house' },
  ],
  'Farming': [
    { title: 'Garden digging & tilling',  unit: 'per day' },
    { title: 'Harvesting help',           unit: 'per day' },
    { title: 'Animal care & feeding',     unit: 'per day' },
    { title: 'Fencing & farm structures', unit: 'per job' },
  ],
  'Beauty & Wellness': [
    { title: 'Hair braiding & plaiting',  unit: 'per head' },
    { title: 'Weaving & wig installation', unit: 'per head' },
    { title: 'Makeup for events',         unit: 'per session' },
    { title: 'Manicure & pedicure',       unit: 'per session' },
    { title: 'Massage therapy',           unit: 'per session' },
    { title: 'Haircut & barbering',       unit: 'per head' },
  ],
  'Other': [
    { title: 'General handyman work',     unit: 'per day' },
    { title: 'Errands & shopping help',   unit: 'per trip' },
    { title: 'Laundry & ironing',         unit: 'per basket' },
    { title: 'Elderly & home care',       unit: 'per day' },
  ],
};

/** Templates for a category; falls back to the Other list. */
export function templatesFor(category: string): ServiceTemplate[] {
  return SERVICE_TEMPLATES[category] ?? SERVICE_TEMPLATES['Other'];
}
