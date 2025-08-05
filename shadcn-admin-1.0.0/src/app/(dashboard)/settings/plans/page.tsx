"use client";

import { motion } from "framer-motion";
import InvoiceHistory from "./invoice-history";
import PlanDetail from "./plan-detail";

// Fullscreen section with scroll-snap, entry animation, and optional inner scroll
const Section: React.FC<{
  children: React.ReactNode;
  className?: string;
  innerScroll?: boolean;
}> = ({ children, className, innerScroll = false }) => (
  <motion.section
    className={
      `
      snap-start
      min-h-screen
      flex flex-col
      ${innerScroll ? "overflow-y-auto" : ""}
      ${className || ""}
      `
    }
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
  >
    {children}
  </motion.section>
);

export default function SettingsPlansPage() {
  return (
    <div className="
      min-h-screen
      overflow-y-auto
      snap-y snap-proximity
      scroll-smooth
      scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-gray-400
    ">
      <Section>
        <PlanDetail />
      </Section>

      {/* Invoice section can scroll internally if content exceeds viewport */}
      <Section innerScroll>
        <div className="p-6 flex-1 flex flex-col">
          <InvoiceHistory />
        </div>
      </Section>
    </div>
  );
}
