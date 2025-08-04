import ContentSection from "../components/content-section"
import BillingForm from "./billing-form"
import PaymentHistory from "./payment-history"


export default function SettingsBillingPage() {
  return (
    <ContentSection title="Billing" desc="Update your payment plan details.">
      <BillingForm />
     <PaymentHistory />
    </ContentSection>
  )
}
