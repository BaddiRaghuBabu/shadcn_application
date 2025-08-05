import InvoiceHistory from "./invoice-history"
import PlanDetail from "./plan-detail"

export default function SettingsPlansPage() {
  return (
   <div>
      <PlanDetail />
      <div className="mt-10">
        <InvoiceHistory />
      </div>
  </div>

    
  )
}
