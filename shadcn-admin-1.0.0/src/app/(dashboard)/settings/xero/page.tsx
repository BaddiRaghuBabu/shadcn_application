import ContentSection from "../components/content-section"
import XeroForm from "./xero-form"

export default function XeroSettingsPage() {
  return (
    <ContentSection
      title="Xero"
      desc="Configure your Xero integration."
      className="w-full lg:max-w-full"
    >
      <XeroForm />
    </ContentSection>
  )
}
