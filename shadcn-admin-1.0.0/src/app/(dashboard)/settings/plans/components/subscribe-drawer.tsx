"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
// @ts-expect-error: the library doesn't support d.ts
import countryRegionData from "country-region-data/dist/data-umd"
import { CountryRegion, filterCountries } from "@/lib/filter-countries"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Plan } from "../data/data"
import { X } from "lucide-react"

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string }
  handler: (response: RazorpayResponse) => Promise<void>
  modal: { ondismiss: () => Promise<void> }
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void }
  }
}


interface Props {
  plan: Plan
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Enter your name" }),
  address: z.string().min(1, { message: "Enter your address" }),
  country: z.string({ required_error: "Select Country" }),
  zip_code: z.string().min(1, { message: "Fill Zip Code" }),
})

type FormValues = z.infer<typeof formSchema>

export default function SubscribeModal({ plan }: Props) {
  const [open, setOpen] = useState(false)
  const [countries, setCountries] = useState<CountryRegion[]>([])

  useEffect(() => {
    setCountries(filterCountries(countryRegionData, [], [], []))
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      country: "",
      zip_code: "",
    },
  })

   useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      document.body.appendChild(script)
      return () => {
        document.body.removeChild(script)
      }
    }
  }, [])

  const onSubmit = async (values: FormValues) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) {
        throw new Error("Not authenticated")
      }

      const amount = Math.round(plan.price * 100)
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: plan.label,
          amount,
          currency: "INR",
          name: values.name,
          address: values.address,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create order")
      }

      const options: RazorpayOptions = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Subscription",
        description: plan.label,
        order_id: data.order.id,
        prefill: {
          name: values.name,
        },
        handler: async function (response: RazorpayResponse) {
          await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              paymentId: data.paymentId,
              ...response,
            }),
          })
        },
        modal: {
          ondismiss: async () => {
            await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ paymentId: data.paymentId, failed: true }),
            })
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
      setOpen(false)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Start Subscribe</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 py-10 px-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-lg max-h-[calc(100vh-5rem)] overflow-auto">
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="px-6 py-4 border-b">
              <h2 className="text-2xl font-semibold">Subscription Summary</h2>
              <p className="text-sm text-gray-600">
                Start on {format(new Date(), "yyyy-MMM-dd")}
              </p>
            </div>

            {/* Pricing */}
            <div className="px-6 pt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-lg">Monthly</span>
                <span className="text-lg font-bold">
                  ${plan.price.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-lg">Total after trial</span>
                <span className="text-lg font-bold">
                  ${plan.price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Form (horizontal) */}
            <div className="px-6 py-8">
              <Form {...form}>
                <form
                  id="subscribe-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full border rounded-md px-3 py-2"
                          >
                            <option value="">Select country</option>
                            {countries.map(({ countryName, countryShortCode }) => (
                              <option
                                key={countryShortCode}
                                value={countryShortCode}
                              >
                                {countryName}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Zip Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t">
              <Button form="subscribe-form" type="submit" className="w-full">
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
