
import ContentSection from "../components/content-section";
import DeviceList from "./device-list";

export default function SettingsDevicesPage() {
  return (
    <ContentSection title="Connected Devices" desc="Manage your active sessions.">
      <DeviceList />
    </ContentSection>
  );
}