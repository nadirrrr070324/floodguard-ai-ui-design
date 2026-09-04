// Offline Safety Protocol System — locally packaged survival guidance.
// All content is shipped with the app bundle, so it works with zero network.
import type { FloodZone } from "@/lib/api";
import type { RiskLevel } from "@/lib/geo";

export type Lang = "en" | "te" | "hi";

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

export const FLASH_FLOOD_STEPS: Record<Lang, string[]> = {
  en: [
    "Move immediately to higher ground.",
    "Stay away from rivers, streams, drains, bridges, and flooded roads.",
    "Never walk or drive through moving water.",
    "Switch off electricity and gas if it is safe to do so.",
    "Keep drinking water, food, flashlight, power bank, medicines and important documents ready.",
    "Monitor local warnings whenever signal becomes available.",
    "Move toward the nearest shelter or safe zone shown on the offline map.",
  ],
  te: [
    "వెంటనే ఎత్తైన ప్రదేశానికి వెళ్లండి.",
    "నదులు, వాగులు, డ్రైన్లు, వంతెనలు, వరద వచ్చిన రోడ్లకు దూరంగా ఉండండి.",
    "కదిలే నీటి గుండా నడవడం లేదా డ్రైవ్ చేయడం ఎప్పుడూ చేయవద్దు.",
    "సురక్షితంగా ఉంటే విద్యుత్ మరియు గ్యాస్ను ఆపివేయండి.",
    "త్రాగునీరు, ఆహారం, టార్చ్, పవర్ బ్యాంక్, మందులు, ముఖ్య పత్రాలను సిద్ధంగా ఉంచుకోండి.",
    "సిగ్నల్ లభ్యమైనప్పుడు స్థానిక హెచ్చరికలను పరిశీలించండి.",
    "ఆఫ్లైన్ మ్యాప్లో చూపిన దగ్గరి ఆశ్రయం లేదా సురక్షిత ప్రాంతానికి వెళ్లండి.",
  ],
  hi: [
    "तुरंत ऊँचे स्थान पर चले जाएँ।",
    "नदियों, नालों, नालियों, पुलों और जलमग्न सड़कों से दूर रहें।",
    "बहते पानी से कभी न चलें और न ही गाड़ी चलाएँ।",
    "यदि सुरक्षित हो तो बिजली और गैस बंद कर दें।",
    "पेयजल, भोजन, टॉर्च, पावर बैंक, दवाइयाँ और महत्वपूर्ण दस्तावेज़ तैयार रखें।",
    "सिग्नल उपलब्ध होने पर स्थानीय चेतावनियों पर नज़र रखें।",
    "ऑफ़लाइन मैप पर दिखाए गए निकटतम आश्रय या सुरक्षित क्षेत्र की ओर बढ़ें।",
  ],
};

export const SURVIVAL_CHECKLIST: Record<Lang, { item: string; icon: string }[]> = {
  en: [
    { item: "Drinking water", icon: "💧" },
    { item: "Food (dry / non-perishable)", icon: "🍞" },
    { item: "Medicines", icon: "💊" },
    { item: "Phone", icon: "📱" },
    { item: "Power bank / charged battery", icon: "🔋" },
    { item: "Flashlight / torch", icon: "🔦" },
    { item: "Emergency contacts list", icon: "📞" },
    { item: "Identity documents (waterproof)", icon: "🪪" },
  ],
  te: [
    { item: "త్రాగునీరు", icon: "💧" },
    { item: "ఆహారం (పొడి / పాడవనిది)", icon: "🍞" },
    { item: "మందులు", icon: "💊" },
    { item: "ఫోన్", icon: "📱" },
    { item: "పవర్ బ్యాంక్ / ఛార్జ్డ్ బ్యాటరీ", icon: "🔋" },
    { item: "టార్చ్ / ఫ్లాష్లైట్", icon: "🔦" },
    { item: "అత్యవసర సంప్రదింపు జాబితా", icon: "📞" },
    { item: "గుర్తింపు పత్రాలు (నీటి నిరోధక)", icon: "🪪" },
  ],
  hi: [
    { item: "पेयजल", icon: "💧" },
    { item: "भोजन (सूखा / गैर-नाशवान)", icon: "🍞" },
    { item: "दवाइयाँ", icon: "💊" },
    { item: "फ़ोन", icon: "📱" },
    { item: "पावर बैंक / चार्ज बैटरी", icon: "🔋" },
    { item: "टॉर्च / फ्लैशलाइट", icon: "🔦" },
    { item: "आपातकालीन संपर्क सूची", icon: "📞" },
    { item: "पहचान पत्र (जलरोधी)", icon: "🪪" },
  ],
};

export const FIRST_AID: Record<Lang, string[]> = {
  en: [
    "If injured and bleeding, apply firm pressure with a clean cloth and keep the wound raised.",
    "Do not move someone with a suspected back or neck injury unless in immediate danger.",
    "If breathing stops, begin chest compressions (100–120 per minute) — call 108 / 102 as soon as signal returns.",
    "Keep the person warm and dry; treat for shock by laying them down and raising the legs.",
    "Do not give food or water to someone unconscious.",
  ],
  te: [
    "గాయపడి రక్తం కారుతుంటే, శుభ్రమైన గుడ్డతో గట్టిగా నొక్కి, గాయాన్ని ఎత్తుగా ఉంచండి.",
    "వెన్ను లేదా మెడ గాయం అనుమానం ఉంటే, తక్షణ ప్రమాదం లేకపోతే కదిలించవద్దు.",
    "శ్వాస ఆగితే, ఛాతీ కుదింపులు ప్రారంభించండి (నిమిషానికి 100–120) — సిగ్నల్ వచ్చాక 108 / 102 కాల్ చేయండి.",
    "వ్యక్తిని వెచ్చగా, పొడిగా ఉంచండి; కాళ్లు పైకి ఉంచి పడుకోబెట్టి షాక్ నివారించండి.",
    "స్పృహ లేని వ్యక్తికి ఆహారం లేదా నీరు ఇవ్వవద్దు.",
  ],
  hi: [
    "चोट लगकर खून बह रहा हो तो साफ कपड़े से जोर से दबाएँ और घाव को ऊपर रखें।",
    "पीठ या गर्दन की चोट का संदेह हो तो, तत्काल खतरा न हो तो न हिलाएँ।",
    "साँस रुक जाए तो छाती पर दबाव शुरू करें (प्रति मिनट 100–120) — सिग्नल आते ही 108 / 102 पर कॉल करें।",
    "व्यक्ति को गर्म और सूखा रखें; पैर ऊपर करके लिटाकर शॉक से बचाएँ।",
    "बेहोश व्यक्ति को खाना या पानी न दें।",
  ],
};

export const HELPLINE_INFO: Record<Lang, { label: string; number: string; note: string }[]> = {
  en: [
    { label: "National Emergency", number: "112", note: "All-emergency" },
    { label: "Flood Helpline", number: "1070", note: "Disaster control" },
    { label: "NDRF Control", number: "011-24363260", note: "Rescue force" },
    { label: "Ambulance", number: "102", note: "Medical" },
    { label: "Disaster Management", number: "108", note: "Emergency services" },
  ],
  te: [
    { label: "జాతీయ అత్యవసరం", number: "112", note: "అన్ని అత్యవసరాలు" },
    { label: "వరద హెల్ప్లైన్", number: "1070", note: "విపత్తు నియంత్రణ" },
    { label: "NDRF కంట్రోల్", number: "011-24363260", note: "రెస్క్యూ ఫోర్స్" },
    { label: "అంబులెన్స్", number: "102", note: "వైద్యం" },
    { label: "విపత్తు నిర్వహణ", number: "108", note: "అత్యవసర సేవలు" },
  ],
  hi: [
    { label: "राष्ट्रीय आपातकाल", number: "112", note: "सभी आपात स्थिति" },
    { label: "बाढ़ हेल्पलाइन", number: "1070", note: "आपदा नियंत्रण" },
    { label: "NDRF नियंत्रण", number: "011-24363260", note: "बचाव दल" },
    { label: "एम्बुलेंस", number: "102", note: "चिकित्सा" },
    { label: "आपदा प्रबंधन", number: "108", note: "आपातकालीन सेवाएँ" },
  ],
};

export const PANIC_MESSAGE: Record<Lang, string> = {
  en: "Emergency Alert Detected. Stay Calm. Follow the steps below carefully. Panic can increase risk. Focus on safety and follow instructions one step at a time.",
  te: "అత్యవసర హెచ్చరిక కనుగొనబడింది. ప్రశాంతంగా ఉండండి. దిగువ దశలను జాగ్రత్తగా అనుసరించండి. భయాందోళన ప్రమాదాన్ని పెంచుతుంది. భద్రతపై దృష్టి పెట్టండి మరియు ఒక్కో దశను ఒక్కొక్కటిగా అనుసరించండి.",
  hi: "आपातकालीन चेतावनी मिली है। शांत रहें। नीचे दिए गए चरणों का ध्यानपूर्वक पालन करें। घबराहट जोखिम बढ़ा सकती है। सुरक्षा पर ध्यान दें और चरण-दर-चरण निर्देशों का पालन करें।",
};

export const VOICE_SCRIPT: Record<Lang, string> = {
  en: "Emergency alert detected. Stay calm. You are in a flood risk zone. Move immediately to higher ground. Do not walk or drive through flood water. Switch off electricity and gas if safe. Take your emergency kit, medicines and documents. Move to the nearest shelter. Help is on the way.",
  te: "అత్యవసర హెచ్చరిక. ప్రశాంతంగా ఉండండి. మీరు వరద ప్రమాద ప్రాంతంలో ఉన్నారు. వెంటనే ఎత్తైన ప్రదేశానికి వెళ్లండి. వరద నీటిలో నడవవద్దు లేదా వాహనం నడపవద్దు. సురక్షితంగా ఉంటే విద్యుత్, గ్యాస్ ఆపివేయండి. మీ అత్యవసర కిట్, మందులు, పత్రాలు తీసుకోండి. దగ్గరి ఆశ్రయానికి వెళ్లండి. సహాయం వస్తోంది.",
  hi: "आपातकालीन चेतावनी। शांत रहें। आप बाढ़ जोखिम क्षेत्र में हैं। तुरंत ऊँचे स्थान पर जाएँ। बाढ़ के पानी में न चलें और न ही गाड़ी चलाएँ। सुरक्षित हो तो बिजली और गैस बंद करें। अपनी आपातकालीन किट, दवाइयाँ और दस्तावेज़ लें। निकटतम आश्रय की ओर बढ़ें। मदद आ रही है।",
};

// ---- Text-to-speech voice guidance (works offline via system voices) --------
export function speak(text: string, opts: { lang: Lang; rate?: number } = { lang: "en", rate: 0.98 }): () => void {
  if (!("speechSynthesis" in window)) return () => {};
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const langMap: Record<Lang, string> = { en: "en-IN", te: "te-IN", hi: "hi-IN" };
    u.lang = langMap[opts.lang];
    u.rate = opts.rate ?? 0.98;
    u.pitch = 1;
    // Prefer an Indian male voice when available for clarity in noise.
    const voices = window.speechSynthesis?.getVoices() || [];
    const pick = voices.find((v) => /hi-IN|te-IN|en-IN/i.test(v.lang) && /male|google/i.test(v.name)) ||
      voices.find((v) => /en-IN|hi-IN/i.test(v.lang));
    if (pick) u.voice = pick;
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  } catch {
    return () => {};
  }
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ---- Safe route info derived from cached flood zones (offline) ---------------
export function safeExit(refPoint: [number, number], zone: FloodZone | null): {
  bearingHint: string;
  dirEmoji: string;
} {
  if (!zone) {
    return { bearingHint: "You are outside known hazard zones. Head away from rivers and low land.", dirEmoji: "↗️" };
  }
  const c = centroidOf(zone.ring);
  // Suggest moving away from the zone centroid.
  const dLat = refPoint[0] - c[0];
  const dLng = refPoint[1] - c[1];
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  const dirs = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
  const idx = Math.round(((angle + 360) % 360) / 45) % 8;
  const emoji = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"][idx];
  return { bearingHint: `Move ${dirs[idx]} — away from the hazard centre to reach safety.`, dirEmoji: emoji };
}

function centroidOf(ring: [number, number][]): [number, number] {
  return [
    ring.reduce((s, p) => s + p[0], 0) / ring.length,
    ring.reduce((s, p) => s + p[1], 0) / ring.length,
  ];
}

export type { RiskLevel };