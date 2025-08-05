export const plans = [
  {
    label: "Monthly" as const,
    price: 49.99,
    description: "Billed monthly",
    features: [
      "Dedicated Account Manager",
      "Community Access & Forum Participation",
      "Customizable Settings & Preferences",
      "Regular Performance Reports",
    ],
  },
  {
    label: "Annual" as const,
    price: 499.99,
    description: "$499.99 yearly",
    features: [
      "Dedicated Account Manager",
      "Community Access & Forum Participation",
      "Customizable Settings & Preferences",
      "Regular Performance Reports",
      "24/7 Availability & Support",
    ],
  },
] as const;

export type Plan = (typeof plans)[number];
export type PlanType = Plan["label"];

export const getPlan = new Map<PlanType, Plan>(plans.map((p) => [p.label, p]));