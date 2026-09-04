import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { LiveMapPage } from "@/pages/LiveMapPage";
import { FloodAlertsPage } from "@/pages/FloodAlertsPage";
import { WeatherPage } from "@/pages/WeatherPage";
import { SirenSystemPage } from "@/pages/SirenSystemPage";
import { ResourcesPage } from "@/pages/ResourcesPage";
import { EmergencyAppPage } from "@/pages/EmergencyAppPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { GuidelinesPage } from "@/pages/GuidelinesPage";
import { ContactPage } from "@/pages/ContactPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="live-map" element={<LiveMapPage />} />
        <Route path="flood-alerts" element={<FloodAlertsPage />} />
        <Route path="siren-system" element={<SirenSystemPage />} />
        <Route path="emergency" element={<EmergencyAppPage />} />
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="weather" element={<WeatherPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="guidelines" element={<GuidelinesPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
}