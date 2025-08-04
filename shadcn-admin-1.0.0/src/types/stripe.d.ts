/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'stripe' {
  const Stripe: any
  export default Stripe
  export type Stripe = any
}