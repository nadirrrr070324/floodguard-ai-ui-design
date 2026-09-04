// In-memory flood dataset for the National Flood Information Portal.
// Each request optionally mixes in a little noise so the portal feels "live".

const DISTRICTS = [
  { id: "d1", name: "Patna", state: "Bihar", region: "North East", latitude: 25.5941, longitude: 85.1376, population: 2200000, riskScore: 82 },
  { id: "d2", name: "Guwahati", state: "Assam", region: "North East", latitude: 26.1445, longitude: 91.7362, population: 1100000, riskScore: 91 },
  { id: "d3", name: "Dibrugarh", state: "Assam", region: "North East", latitude: 27.4728, longitude: 94.9120, population: 154000, riskScore: 86 },
  { id: "d4", name: "Muzaffarpur", state: "Bihar", region: "North East", latitude: 26.1209, longitude: 85.3647, population: 400000, riskScore: 77 },
  { id: "d5", name: "Silchar", state: "Assam", region: "North East", latitude: 24.8303, longitude: 92.7787, population: 172000, riskScore: 84 },
  { id: "d6", name: "Pasighat", state: "Arunachal Pradesh", region: "North East", latitude: 28.0665, longitude: 95.3187, population: 25000, riskScore: 88 },
  { id: "d7", name: "Dehradun", state: "Uttarakhand", region: "Himalayan", latitude: 30.3165, longitude: 78.0322, population: 580000, riskScore: 58 },
  { id: "d8", name: "Haridwar", state: "Uttarakhand", region: "Himalayan", latitude: 29.9457, longitude: 78.1642, population: 310000, riskScore: 64 },
  { id: "d9", name: "Vijayawada", state: "Andhra Pradesh", region: "South", latitude: 16.5062, longitude: 80.6480, population: 1100000, riskScore: 69 },
  { id: "d10", name: "Bhubaneswar", state: "Odisha", region: "East Coast", latitude: 20.2961, longitude: 85.8245, population: 880000, riskScore: 74 },
  { id: "d11", name: "Cuttack", state: "Odisha", region: "East Coast", latitude: 20.4625, longitude: 85.8828, population: 660000, riskScore: 72 },
  { id: "d12", name: "Mumbai", state: "Maharashtra", region: "West Coast", latitude: 19.0760, longitude: 72.8777, population: 12000000, riskScore: 61 },
];

const RIVERS = ["Brahmaputra", "Ganga", "Teesta", "Godavari", "Mahanadi", "Yamuna", "Barak", "Subansiri"];

const LEVELS = [
  { districtId: "d2", river: "Brahmaputra", level: 51.2, normal: 49.0, warning: 50.5, danger: 51.0, trend: "rising" },
  { districtId: "d3", river: "Brahmaputra", level: 48.6, normal: 47.2, warning: 48.4, danger: 49.0, trend: "steady" },
  { districtId: "d6", river: "Siang", level: 22.4, normal: 20.5, warning: 21.8, danger: 22.5, trend: "rising" },
  { districtId: "d1", river: "Ganga", level: 45.1, normal: 43.0, warning: 44.6, danger: 45.0, trend: "rising" },
  { districtId: "d4", river: "Gandak", level: 34.8, normal: 32.0, warning: 33.5, danger: 34.0, trend: "rising" },
  { districtId: "d5", river: "Barak", level: 18.9, normal: 17.0, warning: 18.2, danger: 18.8, trend: "rising" },
  { districtId: "d9", river: "Krishna", level: 27.4, normal: 25.0, warning: 26.6, danger: 27.2, trend: "steady" },
  { districtId: "d7", river: "Ganga", level: 40.2, normal: 38.5, warning: 39.8, danger: 40.4, trend: "rising" },
  { districtId: "d10", river: "Mahanadi", level: 55.6, normal: 53.0, warning: 54.5, danger: 55.2, trend: "falling" },
  { districtId: "d12", river: "Mithi", level: 12.3, normal: 11.0, warning: 11.8, danger: 12.5, trend: "steady" },
];

const ALERTS = [
  {
    id: "a1", title: "Severe Flood Alert — Guwahati", severity: "critical", status: "active",
    message: "Brahmaputra at danger level. Low-lying areas around the river expect inundation. Move to higher ground immediately.",
    districtId: "d2", createdAt: "2026-09-02T06:00:00Z",
  },
  {
    id: "a2", title: "Landslide Risk — Dibrugarh", severity: "high", status: "active",
    message: "Continuous rainfall has increased landslide risk in hilly terrain. Avoid hill slopes and river banks.",
    districtId: "d3", createdAt: "2026-09-02T05:00:00Z",
  },
  {
    id: "a3", title: "Water Rising — Patna", severity: "high", status: "active",
    message: "Ganga level crossing danger mark. River-side embankments under watch. Prepare for evacuation.",
    districtId: "d1", createdAt: "2026-09-02T04:30:00Z",
  },
  {
    id: "a4", title: "Flash Flood Watch — Pasighat", severity: "critical", status: "active",
    message: "Siang river rising rapidly due to glacier melt and rain. Flash floods possible within 12 hours.",
    districtId: "d6", createdAt: "2026-09-02T04:00:00Z",
  },
  {
    id: "a5", title: "Heavy Rainfall Warning — Assam", severity: "moderate", status: "acknowledged",
    message: "Isolated heavy rainfall (115mm+) expected across Upper Assam next 48 hours.",
    districtId: "d5", createdAt: "2026-09-01T22:00:00Z",
  },
  {
    id: "a6", title: "Cyclonic Circulation — Odisha Coast", severity: "moderate", status: "acknowledged",
    message: "Low pressure forming over Bay of Bengal. Coastal districts watch for heavy rain and sea surge.",
    districtId: "d10", createdAt: "2026-09-01T18:00:00Z",
  },
  {
    id: "a7", title: "Resolved — Cuttack Drainage", severity: "low", status: "resolved",
    message: "Urban drainage congestion cleared after pump operation. Normalcy restored.",
    districtId: "d11", createdAt: "2026-09-01T12:00:00Z",
  },
];

const WEATHER = [
  { districtId: "d2", temperature: 28, humidity: 91, rainfallMm: 86, windKmh: 18, condition: "Very Heavy Rain" },
  { districtId: "d3", temperature: 27, humidity: 93, rainfallMm: 124, windKmh: 15, condition: "Extreme Rain" },
  { districtId: "d6", temperature: 26, humidity: 88, rainfallMm: 96, windKmh: 12, condition: "Very Heavy Rain" },
  { districtId: "d1", temperature: 31, humidity: 82, rainfallMm: 54, windKmh: 22, condition: "Heavy Rain" },
  { districtId: "d4", temperature: 30, humidity: 84, rainfallMm: 47, windKmh: 20, condition: "Heavy Rain" },
  { districtId: "d5", temperature: 29, humidity: 89, rainfallMm: 78, windKmh: 14, condition: "Heavy Rain" },
  { districtId: "d9", temperature: 33, humidity: 72, rainfallMm: 12, windKmh: 30, condition: "Cloudy" },
  { districtId: "d10", temperature: 32, humidity: 78, rainfallMm: 22, windKmh: 26, condition: "Rain Showers" },
  { districtId: "d12", temperature: 30, humidity: 80, rainfallMm: 18, windKmh: 21, condition: "Rain Showers" },
];

const SHELTERS = [
  { id: "s1", name: "Govt. Higher Secondary School", districtId: "d2", latitude: 26.15, longitude: 91.75, capacity: 600, occupants: 210, isOpen: true, phone: "+91 98640 12345", facilities: ["Food", "Water", "Medical"] },
  { id: "s2", name: "Town Hall Relief Centre", districtId: "d2", latitude: 26.14, longitude: 91.74, capacity: 400, occupants: 340, isOpen: true, phone: "+91 98640 12346", facilities: ["Food", "Water"] },
  { id: "s3", name: "Community Hall, Chanakyapuri", districtId: "d1", latitude: 25.61, longitude: 85.13, capacity: 500, occupants: 90, isOpen: true, phone: "+91 98100 98765", facilities: ["Food", "Water", "Medical"] },
  { id: "s4", name: "High School, Silchar East", districtId: "d5", latitude: 24.83, longitude: 92.79, capacity: 450, occupants: 120, isOpen: true, phone: "+91 94350 11223", facilities: ["Food", "Child Care"] },
  { id: "s5", name: "Polytechnic Hostel Block", districtId: "d3", latitude: 27.47, longitude: 94.91, capacity: 800, occupants: 0, isOpen: false, phone: "+91 94350 33445", facilities: ["Food", "Water"] },
];

// Inundation / flood-affected zones rendered as polygons on the live map.
const FLOODZONES = [
  {
    id: "z1", name: "Guwahati Metro Inundation", districtId: "d2", severity: "critical",
    affectedVillages: ["Pandu", "Uzan Bazar", "Gopal Nagar", "Hatimara"], affectedPopulation: 245000, areaSqKm: 95,
    ring: [[26.32, 91.5], [26.3, 91.95], [26.02, 91.98], [25.92, 91.76], [25.98, 91.48], [26.12, 91.46]],
  },
  {
    id: "z2", name: "Siang Basin Flash Flood", districtId: "d6", severity: "critical",
    affectedVillages: ["Jonai", "Rani", "Sodo", "Yingkiong"], affectedPopulation: 82000, areaSqKm: 140,
    ring: [[28.3, 95.08], [28.25, 95.5], [27.98, 95.52], [27.86, 95.26], [27.95, 95.02], [28.1, 95.0]],
  },
  {
    id: "z3", name: "Patna Ganga Riverine Belt", districtId: "d1", severity: "high",
    affectedVillages: ["Digha Ghat", "Kankarbagh", "Rukanpura"], affectedPopulation: 380000, areaSqKm: 88,
    ring: [[25.76, 84.92], [25.74, 85.34], [25.46, 85.32], [25.42, 85.0], [25.55, 84.88]],
  },
  {
    id: "z4", name: "Dibrugarh Upland Flooding", districtId: "d3", severity: "high",
    affectedVillages: ["Mohanpur", "Bamunbari", "Chabua"], affectedPopulation: 96000, areaSqKm: 110,
    ring: [[27.66, 94.68], [27.6, 95.14], [27.34, 95.14], [27.28, 94.82], [27.42, 94.66]],
  },
  {
    id: "z5", name: "Silchar Barak Bank Spill", districtId: "d5", severity: "moderate",
    affectedVillages: ["Sonapur", "Rongpur", "Tarapur"], affectedPopulation: 135000, areaSqKm: 76,
    ring: [[24.96, 92.58], [24.92, 92.96], [24.7, 92.94], [24.68, 92.66], [24.8, 92.56]],
  },
  {
    id: "z6", name: "Vijayawada Krishna Floodplain", districtId: "d9", severity: "moderate",
    affectedVillages: ["Ajit Singh Nagar", "Patamata", "Benz Circle"], affectedPopulation: 210000, areaSqKm: 64,
    ring: [[16.66, 80.52], [16.64, 80.78], [16.4, 80.76], [16.4, 80.54], [16.52, 80.48]],
  },
];

// Roads blocked by debris / flooding that the route engine must avoid.
const ROADBLOCKS = [
  { id: "rb1", name: "NH-715 flood closure", districtId: "d2", latitude: 26.08, longitude: 91.82, radiusKm: 2.0, source: "flood", note: "Underwater — impassable" },
  { id: "rb2", name: "Digha Ghat road washed out", districtId: "d1", latitude: 25.62, longitude: 85.08, radiusKm: 1.5, source: "flood", note: "Bridge approach eroded" },
  { id: "rb3", name: "Siang landslide slip", districtId: "d6", latitude: 28.05, longitude: 95.28, radiusKm: 2.5, source: "landslide", note: "Landslide blocked road" },
  { id: "rb4", name: "Hill road subsidence", districtId: "d7", latitude: 30.4, longitude: 78.1, radiusKm: 2.0, source: "landslide", note: "Subsidence — avoid" },
  { id: "rb5", name: "Mahanadi embankment breach", districtId: "d10", latitude: 20.4, longitude: 85.9, radiusKm: 2.0, source: "flood", note: "Embankment breach area" },
];

// Near-river crossings flagged so the route engine avoids unsafe river crossings.
const RIVERCROSSINGS = [
  { id: "rc1", name: "Brahmaputra crossing (Guwahati)", districtId: "d2", latitude: 26.17, longitude: 91.7, river: "Brahmaputra", unsafe: true },
  { id: "rc2", name: "Ganga ford (Patna)", districtId: "d1", latitude: 25.61, longitude: 85.16, river: "Ganga", unsafe: true },
  { id: "rc3", name: "Siang ferry (Jonai)", districtId: "d6", latitude: 28.0, longitude: 95.4, river: "Siang", unsafe: true },
];

// Offline safe-zone database — shelters, hospitals, schools, community centres,
// police stations and evacuation points. Cached locally for offline navigation.
const SAFEZONES = [
  // Shelters (mirrors SHELTERS with a type + safety score)
  { id: "sz1", type: "shelter", name: "Govt. Higher Secondary School", districtId: "d2", latitude: 26.15, longitude: 91.75, phone: "+91 98640 12345", capacity: 600, safetyScore: 92 },
  { id: "sz2", type: "shelter", name: "Town Hall Relief Centre", districtId: "d2", latitude: 26.14, longitude: 91.74, phone: "+91 98640 12346", capacity: 400, safetyScore: 88 },
  { id: "sz3", type: "shelter", name: "Community Hall, Chanakyapuri", districtId: "d1", latitude: 25.61, longitude: 85.13, phone: "+91 98100 98765", capacity: 500, safetyScore: 90 },
  { id: "sz4", type: "shelter", name: "High School, Silchar East", districtId: "d5", latitude: 24.83, longitude: 92.79, phone: "+91 94350 11223", capacity: 450, safetyScore: 84 },
  { id: "sz5", type: "shelter", name: "Polytechnic Hostel Block", districtId: "d3", latitude: 27.47, longitude: 94.91, phone: "+91 94350 33445", capacity: 800, safetyScore: 80 },
  // Hospitals
  { id: "sz6", type: "hospital", name: "GMCH Guwahati", districtId: "d2", latitude: 26.16, longitude: 91.72, phone: "+91 361 233 3000", capacity: 1200, safetyScore: 94 },
  { id: "sz7", type: "hospital", name: "PMCH Patna", districtId: "d1", latitude: 25.6, longitude: 85.11, phone: "+91 612 220 1343", capacity: 1500, safetyScore: 91 },
  { id: "sz8", type: "hospital", name: "Silchar Medical College", districtId: "d5", latitude: 24.83, longitude: 92.79, phone: "+91 3842 256 100", capacity: 900, safetyScore: 86 },
  // Schools / colleges
  { id: "sz9", type: "school", name: "Cotton University", districtId: "d2", latitude: 26.18, longitude: 91.74, phone: "+91 361 273 2761", capacity: 2000, safetyScore: 87 },
  { id: "sz10", type: "school", name: "Patna University Campus", districtId: "d1", latitude: 25.62, longitude: 85.14, phone: "+91 612 267 0534", capacity: 2500, safetyScore: 89 },
  // Community centres
  { id: "sz11", type: "community", name: "Pandu Community Centre", districtId: "d2", latitude: 26.12, longitude: 91.63, phone: "+91 98640 55611", capacity: 350, safetyScore: 82 },
  { id: "sz12", type: "community", name: "Kankarbagh Community Hall", districtId: "d1", latitude: 25.58, longitude: 85.16, phone: "+91 98100 55612", capacity: 400, safetyScore: 83 },
  // Police stations (command/control points)
  { id: "sz13", type: "police", name: "Guwahati District HQ", districtId: "d2", latitude: 26.16, longitude: 91.75, phone: "100", capacity: 300, safetyScore: 95 },
  { id: "sz14", type: "police", name: "Patna City Police", districtId: "d1", latitude: 25.6, longitude: 85.13, phone: "100", capacity: 250, safetyScore: 93 },
  // Evacuation points / high ground
  { id: "sz15", type: "evacuation", name: "Kamakhya High Ground", districtId: "d2", latitude: 26.17, longitude: 91.72, phone: "", capacity: 1500, safetyScore: 96 },
  { id: "sz16", type: "evacuation", name: "Gandhi Maidan (Patna)", districtId: "d1", latitude: 25.61, longitude: 85.14, phone: "", capacity: 3000, safetyScore: 95 },
  { id: "sz17", type: "evacuation", name: "Jonai Upland", districtId: "d6", latitude: 28.03, longitude: 95.39, phone: "", capacity: 1200, safetyScore: 94 },
];

const ZONE_TYPES = ["shelter", "hospital", "school", "community", "police", "evacuation"];

// Offline-first IoT village siren units with SMS fallback for no-network villages.
const SIRENS = [
  { id: "sr1", villageName: "Rajapara", districtId: "d2", latitude: 26.128, longitude: 91.72, status: "operational", batteryPct: 92, coverageRadiusKm: 3.5, lastTested: "2026-08-30", network: "gsm", smsFallbackEnabled: true, phone: "+91 98640 55301", poweredBy: "Solar", alarmed: true },
  { id: "sr2", villageName: "Hatimara", districtId: "d2", latitude: 26.075, longitude: 91.813, status: "battery_low", batteryPct: 34, coverageRadiusKm: 3.0, lastTested: "2026-08-28", network: "gsm", smsFallbackEnabled: true, phone: "+91 98640 55302", poweredBy: "Solar", alarmed: false },
  { id: "sr3", villageName: "Uzan Bazar", districtId: "d2", latitude: 26.172, longitude: 91.753, status: "offline", batteryPct: 18, coverageRadiusKm: 2.5, lastTested: "2026-08-25", network: "none", smsFallbackEnabled: true, phone: "+91 98640 55303", poweredBy: "Grid", alarmed: false },
  { id: "sr4", villageName: "Jonai", districtId: "d6", latitude: 28.02, longitude: 95.385, status: "operational", batteryPct: 87, coverageRadiusKm: 4.0, lastTested: "2026-08-31", network: "satellite", smsFallbackEnabled: true, phone: "+91 94360 77410", poweredBy: "Solar", alarmed: true },
  { id: "sr5", villageName: "Pasighat Town", districtId: "d6", latitude: 28.066, longitude: 95.318, status: "offline", batteryPct: 12, coverageRadiusKm: 3.0, lastTested: "2026-08-20", network: "none", smsFallbackEnabled: true, phone: "+91 94360 77411", poweredBy: "Solar", alarmed: false },
  { id: "sr6", villageName: "Digha Ghat", districtId: "d1", latitude: 25.616, longitude: 85.088, status: "operational", batteryPct: 88, coverageRadiusKm: 3.5, lastTested: "2026-09-01", network: "gsm", smsFallbackEnabled: true, phone: "+91 98100 33001", poweredBy: "Grid", alarmed: true },
  { id: "sr7", villageName: "Kankarbagh", districtId: "d1", latitude: 25.594, longitude: 85.16, status: "operational", batteryPct: 76, coverageRadiusKm: 3.0, lastTested: "2026-09-01", network: "gsm", smsFallbackEnabled: true, phone: "+91 98100 33002", poweredBy: "Grid", alarmed: false },
  { id: "sr8", villageName: "Mohanpur", districtId: "d3", latitude: 27.44, longitude: 94.94, status: "maintenance", batteryPct: 41, coverageRadiusKm: 3.5, lastTested: "2026-08-27", network: "gsm", smsFallbackEnabled: true, phone: "+91 94350 22111", poweredBy: "Solar", alarmed: false },
  { id: "sr9", villageName: "Sonapur", districtId: "d5", latitude: 24.8, longitude: 92.81, status: "battery_low", batteryPct: 28, coverageRadiusKm: 3.0, lastTested: "2026-08-26", network: "gsm", smsFallbackEnabled: true, phone: "+91 94350 11990", poweredBy: "Solar", alarmed: false },
  { id: "sr10", villageName: "Ajit Singh Nagar", districtId: "d9", latitude: 16.52, longitude: 80.63, status: "operational", batteryPct: 95, coverageRadiusKm: 3.0, lastTested: "2026-09-01", network: "gsm", smsFallbackEnabled: true, phone: "+91 98499 44001", poweredBy: "Grid", alarmed: false },
];

// Mock citizens being monitored for the admin safety dashboard.
const USERS = [
  { id: "u1", name: "Rajesh Kumar", phone: "+91 98100 10001", districtId: "d1", village: "Digha Ghat", latitude: 25.616, longitude: 85.09 },
  { id: "u2", name: "Anima Das", phone: "+91 98640 20002", districtId: "d2", village: "Rajapara", latitude: 26.13, longitude: 91.72 },
  { id: "u3", name: "Tashi Wangyal", phone: "+91 94360 30003", districtId: "d6", village: "Jonai", latitude: 28.02, longitude: 95.38 },
  { id: "u4", name: "Mohammed Irfan", phone: "+91 94350 40004", districtId: "d5", village: "Sonapur", latitude: 24.8, longitude: 92.81 },
  { id: "u5", name: "Sneha Reddy", phone: "+91 98499 50005", districtId: "d9", village: "Benz Circle", latitude: 16.44, longitude: 80.63 },
  { id: "u6", name: "Deepak Thakur", phone: "+91 98970 60006", districtId: "d7", village: "Rajpur", latitude: 30.42, longitude: 78.06 },
];

const CONTACTS = [
  { id: "c1", name: "National Emergency", category: "Emergency", phone: "112", region: "National" },
  { id: "c2", name: "Flood Helpline", category: "Flood Control", phone: "1070", region: "National" },
  { id: "c3", name: "NDRF Control Room", category: "Rescue", phone: "011-24363260", region: "National" },
  { id: "c4", name: "Ambulance", category: "Medical", phone: "102", region: "National" },
  { id: "c5", name: "Disaster Management", category: "Disaster", phone: "108", region: "National" },
  { id: "c6", name: "Central Water Commission", category: "Water", phone: "011-26187805", region: "National" },
  { id: "c7", name: "IMD Weather Helpline", category: "Weather", phone: "011-24321979", region: "National" },
];

const GUIDELINES = [
  {
    category: "Before Floods",
    items: [
      "Monitor official warnings on this portal and local radio.",
      "Keep documents, valuables and medicines in waterproof bags.",
      "Prepare an emergency kit: torch, batteries, drinking water, dry food, first-aid.",
      "Know the nearest shelter and evacuation route in your area.",
    ],
  },
  {
    category: "During Floods",
    items: [
      "Move to higher ground immediately — do not wait for instructions.",
      "Avoid walking or driving through floodwater.",
      "Stay away from river banks, embankments and weakened structures.",
      "Do not touch electrical equipment that is wet or submerged.",
    ],
  },
  {
    category: "After Floods",
    items: [
      "Return home only when authorities declare it safe.",
      "Throw away food and water that may have been contaminated.",
      "Beware of venomous snakes that may have entered homes.",
      "Report damage and injuries to local authorities or the helpline.",
    ],
  },
];

function jitter(n, pct = 3) {
  const f = 1 + ((Math.random() - 0.5) * 2 * pct) / 100;
  return Math.round(n * f * 10) / 10;
}

// --- Geo helpers -----------------------------------------------------------
const EARTH_R = 6371;

function haversineKm(a, b) {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

function centroid(ring) {
  const lat = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lng = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [lat, lng];
}

// Distance from a point to a polygon ring (min over edges), for proximity checks.
function HaversineDistFromRing(point, zone) {
  let best = Infinity;
  const ring = zone.ring;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    // sample the segment for a cheap within-distance test
    const d = haversineKm(point, a);
    if (d < best) best = d;
  }
  return best;
}

// Ray-casting point-in-polygon. ring points are [lat, lng].
function pointInRing([lat, lng], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const RISK_LEVELS = ["low", "medium", "high", "extreme"];
const zoneRisk = { critical: "extreme", high: "high", moderate: "medium", low: "low" };

// The live risk engine: classifies a GPS point against inundation zones,
// river levels and rainfall, returning a full decision payload.
function classifyRisk(latitude, longitude, opts = {}) {
  const point = [latitude, longitude];
  const levels = LEVELS.map((l) => ({
    ...l,
    statusCustom: l.level >= l.danger ? "danger" : l.level >= l.warning ? "warning" : "normal",
  }));

  let riskIndex = 0;
  const reasons = [];
  let zone = null;
  const insideZones = [];

  for (const z of FLOODZONES) {
    if (pointInRing(point, z.ring)) insideZones.push(z);
  }
  for (const z of insideZones) {
    const r = zoneRisk[z.severity] || "low";
    const i = RISK_LEVELS.indexOf(r);
    if (i > riskIndex) {
      riskIndex = i;
      zone = z;
    }
    reasons.push(`Inside ${z.name} (${z.severity})`);
  }

  if (insideZones.length === 0) {
    // Proximity to a critical/high zone inflates risk — geofenced approach.
    for (const z of FLOODZONES) {
      const dist = haversineKm(point, centroid(z.ring));
      if (z.severity === "critical" && dist < 25) {
        riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("high"));
        reasons.push(`Within ${Math.round(dist)} km of critical zone "${z.name}"`);
      } else if (z.severity === "high" && dist < 15) {
        riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("medium"));
        reasons.push(`Within ${Math.round(dist)} km of high-risk zone "${z.name}"`);
      }
    }
  }

  // River telemetry + rainfall feed into the classification.
  let nearestLevel = null;
  let nearestLevelDist = Infinity;
  for (const d of DISTRICTS) {
    const dist = haversineKm(point, [d.latitude, d.longitude]);
    if (dist < nearestLevelDist) {
      nearestLevelDist = dist;
      nearestLevel = levels.find((l) => l.districtId === d.id) || null;
    }
  }
  if (nearestLevel && nearestLevel.statusCustom === "danger" && nearestLevelDist < 60) {
    riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("high"));
    reasons.push(`${nearestLevel.river} above danger level in nearby ${nearestLevel.district_name}`);
  } else if (nearestLevel && nearestLevel.statusCustom === "warning" && nearestLevelDist < 40) {
    riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("medium"));
    reasons.push(`${nearestLevel.river} at warning level in nearby ${nearestLevel.district_name}`);
  }

  const nearby = WEATHER.find((w) => w.districtId === nearestLevel?.districtId);
  if (nearby && nearby.rainfallMm >= 100) {
    riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("high"));
    reasons.push(`Extreme rainfall (${Math.round(nearby.rainfallMm)} mm) in ${district(nearby.districtId).name}`);
  } else if (nearby && nearby.rainfallMm >= 50) {
    riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("medium"));
    reasons.push(`Heavy rainfall (${Math.round(nearby.rainfallMm)} mm) in ${district(nearby.districtId).name}`);
  }

  const riskLevel = RISK_LEVELS[riskIndex];
  const active = ALERTS.filter((a) => a.status === "active");

  const shelters = SHELTERS.filter((s) => s.isOpen).map((s) => ({
    ...s,
    distanceKm: Number(haversineKm(point, [s.latitude, s.longitude]).toFixed(1)),
  }));
  shelters.sort((a, b) => a.distanceKm - b.distanceKm);
  const nearestShelter = shelters[0] || null;

  return {
    latitude,
    longitude,
    riskLevel,
    riskScore: Math.round((riskIndex / 3) * 100),
    timestamp: new Date().toISOString(),
    reasons,
    zone,
    zones: insideZones,
    nearestShelter,
    shelterCount: shelters.length,
    activeAlerts: active.slice(0, 3),
    nearestLevel: nearestLevel
      ? { river: nearestLevel.river, district_name: nearestLevel.district_name, level: nearestLevel.level, statusCustom: nearestLevel.statusCustom }
      : null,
    source: opts.offline ? "cache" : "live",
  };
}

function district(cId, extra) {
  const d = DISTRICTS.find((x) => x.id === cId);
  return d ? { ...d, ...(extra || {}) } : { name: "Unknown", state: "Unknown" };
}

export const db = {
  districts: () => DISTRICTS,

  levels: () =>
    LEVELS.map((l) => ({
      ...l,
      level: jitter(l.level, 2),
      district_name: district(l.districtId).name,
      statusCustom: l.level >= l.danger ? "danger" : l.level >= l.warning ? "warning" : "normal",
    })),

  alerts: ({ status, severity } = {}) => {
    let rows = [...ALERTS];
    if (status && status !== "all") rows = rows.filter((a) => a.status === status);
    if (severity && severity !== "all") rows = rows.filter((a) => a.severity === severity);
    return rows.map((a) => ({ ...a, district_name: district(a.districtId).name }));
  },

  weather: ({ districtId } = {}) => {
    return WEATHER.filter((w) => !districtId || w.districtId === districtId).map((w) => ({
      ...w,
      district_name: district(w.districtId).name,
      rainfallMm: jitter(w.rainfallMm, 5),
      temperature: jitter(w.temperature, 2),
    }));
  },

  shelters: () =>
    SHELTERS.map((s) => ({
      ...s,
      district_name: district(s.districtId).name,
      occupancyPct: s.capacity ? Math.round((s.occupants / s.capacity) * 100) : 0,
    })),

  floodzones: () =>
    FLOODZONES.map((z) => ({ ...z, district_name: district(z.districtId).name })),

  // Safe-zone database for offline navigation (shelters, hospitals, etc.)
  safezones: () =>
    SAFEZONES.map((z) => ({ ...z, district_name: district(z.districtId).name })),

  roadblocks: () =>
    ROADBLOCKS.map((r) => ({ ...r, district_name: district(r.districtId).name })),

  rivercrossings: () =>
    RIVERCROSSINGS.map((r) => ({ ...r, district_name: district(r.districtId).name })),

  // Risk-aware "closest safe place": nearest safe zone, prioritising those
  // outside current flood-hazard polygons. Never returns an empty list so
  // offline navigation always has a target.
  closestSafeZone: (lat, lng, opts = {}) => {
    const point = [Number(lat), Number(lng)];
    const type = opts.type || "all";
    const zones = SAFEZONES.filter((z) => type === "all" || z.type === type).map((z) => {
      const distanceKm = Number(haversineKm(point, [z.latitude, z.longitude]).toFixed(2));
      // Destinations inside a hazard polygon are riskier (perimeter) than outside.
      const inHazard = FLOODZONES.some((f) => f.severity !== "low" && pointInRing([z.latitude, z.longitude], f.ring));
      const hazardsNearby = FLOODZONES.filter(
        (f) => HaversineDistFromRing(point, f) < (f.severity === "critical" ? 12 : 8)
      ).length;
      return { ...z, distanceKm, inHazard, hazardsNearby, district_name: district(z.districtId).name };
    });
    // Sort: outside-hazard first, then nearest, then highest safety score.
    const sorted = zones.sort(
      (a, b) => Number(a.inHazard) - Number(b.inHazard) || a.distanceKm - b.distanceKm || b.safetyScore - a.safetyScore
    );
    return { safe: sorted.slice(0, 6), all: zones };
  },

  sirens: () =>
    SIRENS.map((s) => ({ ...s, district_name: district(s.districtId).name })),

  contacts: () => CONTACTS,

  guidelines: () => GUIDELINES,

  summary: () => {
    const levels = db.levels();
    const alerts = ALERTS.filter((a) => a.status === "active");
    return {
      districts: DISTRICTS.length,
      activeAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
      rivers: RIVERS.length,
      dangerRivers: levels.filter((l) => l.statusCustom === "danger").length,
      warningRivers: levels.filter((l) => l.statusCustom === "warning").length,
      openShelters: SHELTERS.filter((s) => s.isOpen).length,
      sheltedCapacity: SHELTERS.reduce((a, s) => a + s.capacity, 0),
      sirenUnits: SIRENS.length,
      offlineSirens: SIRENS.filter((s) => s.status === "offline" || s.status === "battery_low").length,
      floodZones: FLOODZONES.length,
      affectedPopulation: FLOODZONES.reduce((a, z) => a + z.affectedPopulation, 0),
      updatedAt: new Date().toISOString(),
    };
  },

  topRisks: () =>
    [...DISTRICTS].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6),

  riskAt: (latitude, longitude, opts) => classifyRisk(Number(latitude), Number(longitude), opts || {}),

  // Admin dashboard — monitor citizens' live safety status.
  safety: ({ status } = {}) =>
    USERS.map((u) => {
      const r = classifyRisk(u.latitude + jitter(0.02, 100), u.longitude + jitter(0.02, 100));
      return {
        ...u,
        district_name: district(u.districtId).name,
        riskLevel: r.riskLevel,
        riskScore: r.riskScore,
        statusCustom:
          r.riskLevel === "extreme" || r.riskLevel === "high"
            ? "danger"
            : r.riskLevel === "medium"
              ? "warning"
              : "safe",
        lastSeen: new Date(Date.now() - Math.floor(Math.random() * 5) * 60 * 1000).toISOString(),
      };
    }).filter((u) => !status || status === "all" || u.statusCustom === status),

  createZone: (zone) => {
    const z = {
      id: `z${FLOODZONES.length + 1}`,
      name: zone.name,
      districtId: zone.districtId || "d1",
      severity: zone.severity || "moderate",
      affectedVillages: Array.isArray(zone.affectedVillages) && zone.affectedVillages.length ? zone.affectedVillages : ["Unnamed settlement"],
      affectedPopulation: Number(zone.affectedPopulation) || 5000,
      areaSqKm: Number(zone.areaSqKm) || 40,
      ring: Array.isArray(zone.ring) && zone.ring.length ? zone.ring : [[25.6, 85.1], [25.6, 85.2], [25.5, 85.2], [25.5, 85.1]],
    };
    FLOODZONES.push(z);
    return { ...z, district_name: district(z.districtId).name };
  },

  updateZone: (id, patch) => {
    const z = FLOODZONES.find((x) => x.id === id);
    if (!z) return null;
    for (const k of ["name", "districtId", "severity", "affectedVillages", "affectedPopulation", "areaSqKm", "ring"]) {
      if (patch[k] !== undefined) z[k] = patch[k];
    }
    return { ...z, district_name: district(z.districtId).name };
  },

  deleteZone: (id) => {
    const i = FLOODZONES.findIndex((x) => x.id === id);
    if (i === -1) return false;
    FLOODZONES.splice(i, 1);
    return true;
  },

  broadcast: (payload) => {
    const alert = {
      id: `a${ALERTS.length + 1}`,
      title: payload.title || "Emergency Broadcast",
      severity: payload.severity || "high",
      status: "active",
      message: payload.message,
      districtId: payload.districtId || "d1",
      createdAt: new Date().toISOString(),
    };
    ALERTS.unshift(alert);
    // Optional: tie the broadcast to a flood zone for geofenced targeting.
    if (payload.zoneId) {
      const z = FLOODZONES.find((x) => x.id === payload.zoneId);
      if (z) z.severity = payload.severity === "critical" ? "critical" : z.severity;
    }
    return { ...alert, district_name: district(alert.districtId).name };
  },

  sendSms: ({ to, message }) => ({
    to,
    messagePreview: message.slice(0, 40),
    delivered: !!to,
    provider: process.env.SMS_PROVIDER || "mock-sms-gateway",
    ackId: "ACK-" + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
  }),
};