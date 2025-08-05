"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { IconApple, IconBrandPaypal } from "@tabler/icons-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import RazorpayButton from "./razorpay-button"

const plans = [
  { value: "monthly", label: "Monthly", amount: 1000 },
  { value: "annual", label: "Annual (Save 100%)", amount: 10000 },
  { value: "lifetime", label: "Lifetime", amount: 50000 },
]

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Username is required.",
  }),
  city: z.string().min(1, {
    message: "City is required.",
  }),
  payment_method: z.enum(["Card", "Paypal", "Apple"], {
    required_error: "Payment method is required.",
  }),
  card_number: z.string().min(1, {
    message: "Card No is required.",
  }),
  expire: z.string({
    required_error: "Expire date is required.",
  }),
  year: z.string({
    required_error: "Year is required.",
  }),
  cv: z.string().min(1, {
    message: "Cv is required.",
  }),
    plan: z.enum(["monthly", "annual", "lifetime"], {
    required_error: "Plan is required.",
  }),
})

export default function BillingForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      city: "",
      card_number: "",
      cv: "",
      payment_method: "Card",
      plan: "monthly",

    },
    
  })

  const planValue = form.watch("plan")
  const selectedPlan = useMemo(
    () => plans.find((p) => p.value === planValue)!,
    [planValue]
  )

  function onSubmit() {
    toast({
      title: "Billing details saved",
      description: `${selectedPlan.label} - ₹${(selectedPlan.amount / 100).toFixed(2)}`,
    })
  }

  return (
      <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mb-4xx grid grid-cols-6 gap-5"
      >
            <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem className="col-span-6">
              <FormLabel>Plan</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid grid-cols-3 gap-4"
                >
                  {plans.map((plan) => (
                    <FormItem key={plan.value} className="col-span-1 flex items-center">
                      <FormControl>
                        <RadioGroupItem
                          value={plan.value}
                          id={plan.value}
                          className="peer sr-only"
                          aria-label={plan.label}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor={plan.value}
                        className="border-muted hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-1 flex-col items-center justify-between rounded-md border-2 bg-transparent p-4"
                      >
                        {plan.label}
                        <span className="mt-1 text-sm font-normal">
                          ₹{(plan.amount / 100).toFixed(2)}
                        </span>
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="col-span-6 rounded-md border p-4">
          <h3 className="mb-2 text-sm font-medium">Checkout Summary</h3>
          <div className="flex items-center justify-between text-sm">
            <span>{selectedPlan.label}</span>
            <span>₹{(selectedPlan.amount / 100).toFixed(2)}</span>
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem className="col-span-6">
              <FormLabel>Payment</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                  className="grid grid-cols-3 gap-4"
                >
                  <FormItem className="col-span-1 flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="Card"
                        id="card"
                        className="peer sr-only"
                        aria-label="Card"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="card"
                      className="border-muted hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-1 flex-col items-center justify-between rounded-md border-2 bg-transparent p-4"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="mb-3 h-6 w-6"
                      >
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <path d="M2 10h20" />
                      </svg>
                      Card
                    </FormLabel>
                  </FormItem>
                  <FormItem className="col-span-1 flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="Paypal"
                        id="paypal"
                        className="peer sr-only"
                        aria-label="Paypal"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="paypal"
                      className="border-muted hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-1 flex-col items-center justify-between rounded-md border-2 bg-transparent p-4"
                    >
                      <IconBrandPaypal className="mb-3 h-6 w-6" />
                      Paypal
                    </FormLabel>
                  </FormItem>
                  <FormItem className="col-span-1 flex items-center">
                    <FormControl>
                      <RadioGroupItem
                        value="Apple"
                        id="apple"
                        className="peer sr-only"
                        aria-label="Apple"
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="apple"
                      className="border-muted hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary flex flex-1 flex-col items-center justify-between rounded-md border-2 bg-transparent p-4"
                    >
                      <IconApple className="mb-3 h-6 w-6" />
                      Apple
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="card_number"
          render={({ field }) => (
            <FormItem className="col-span-6">
              <FormLabel>Card Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter Card No" {...field} />
              </FormControl>
              <FormDescription>This is number of your card No.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expire"
          render={({ field }) => (
            <FormItem className="col-span-3 md:col-span-2">
              <FormLabel>Expires</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <SelectTrigger id="month" aria-label="Month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>This is your card expire date.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem className="col-span-3 md:col-span-2">
              <FormLabel>Year</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <SelectTrigger id="year" aria-label="Year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem
                        key={i}
                        value={`${new Date().getFullYear() + i}`}
                      >
                        {new Date().getFullYear() + i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>This is your card expire year.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cv"
          render={({ field }) => (
            <FormItem className="col-span-6 md:col-span-2">
              <FormLabel>CV</FormLabel>
              <FormControl>
                <Input {...field} id="cvc" placeholder="CVC" />
              </FormControl>
              <FormDescription>This is your CV No.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="col-span-6" type="submit">
          Continue
        </Button>
      </form>
    <RazorpayButton plan={selectedPlan.label} amount={selectedPlan.amount} />
    </Form>
  )
}
