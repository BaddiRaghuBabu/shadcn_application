"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { plans, type Plan }  from "@/data/plans";

const billingSchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().min(5, "Address is required"),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/i, "Phone must be 10 digits"),
});

 type BillingForm = z.infer<typeof billingSchema>;

enum Step {
  Plan,
  Billing,
  Summary,
  Payment,
  Success,
}

export function CheckoutWizard() {
  const [step, setStep] = useState<Step>(Step.Plan);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [method, setMethod] = useState("upi");

  const form = useForm<BillingForm>({
    resolver: zodResolver(billingSchema),
    defaultValues: { name: "", address: "", phone: "" },
  });

  const next = async () => {
    if (step === Step.Billing) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => s - 1);

  const handlePayment = async () => {
    if (!selectedPlan) return;
    const values = form.getValues();
    await supabase.from("payments").insert({
      plan_id: selectedPlan.label,
      amount: Math.round(selectedPlan.price * 100),
      currency: "INR",
      status: "success",
      full_name: values.name,
      address: values.address,
      phone: values.phone,
    });
    setStep(Step.Success);
  };

  return (
    <Card className="mx-auto max-w-xl">
      {step === Step.Plan && (
        <>
          <CardHeader>
            <CardTitle>Choose Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={selectedPlan?.label}
              onValueChange={(val) =>
                setSelectedPlan(plans.find((p) => p.label === val) ?? null)
              }
            >
              {plans.map((plan) => (
                <div
                  key={plan.label}
                  className="flex items-start space-x-3 rounded-md border p-4"
                >
                  <RadioGroupItem value={plan.label} id={plan.label} />
                  <div className="space-y-1">
                    <Label htmlFor={plan.label} className="font-semibold">
                      {plan.label} - ₹{plan.price}
                    </Label>
                    <ul className="list-disc pl-4 text-sm">
                      {plan.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button disabled={!selectedPlan} onClick={next}>
              Continue
            </Button>
          </CardFooter>
        </>
      )}

      {step === Step.Billing && (
        <form onSubmit={form.handleSubmit(next)}>
          <CardHeader>
            <CardTitle>Billing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register("address")} />
              {form.formState.errors.address && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={back}>
              Back
            </Button>
            <Button type="submit">Continue</Button>
          </CardFooter>
        </form>
      )}

      {step === Step.Summary && selectedPlan && (
        <>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Plan:</strong> {selectedPlan.label} (₹{selectedPlan.price})
            </p>
            <p>
              <strong>Name:</strong> {form.getValues("name")}
            </p>
            <p>
              <strong>Address:</strong> {form.getValues("address")}
            </p>
            <p>
              <strong>Phone:</strong> {form.getValues("phone")}
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={back}>
              Back
            </Button>
            <Button onClick={next}>Continue to Payment</Button>
          </CardFooter>
        </>
      )}

      {step === Step.Payment && (
        <>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={method} onValueChange={setMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi">UPI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="qr" id="qr" />
                <Label htmlFor="qr">QR Code</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card">Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="netbanking" id="netbanking" />
                <Label htmlFor="netbanking">Net Banking</Label>
              </div>
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={back}>
              Back
            </Button>
            <Button onClick={handlePayment}>Pay</Button>
          </CardFooter>
        </>
      )}

      {step === Step.Success && (
        <>
          <CardHeader>
            <CardTitle>Payment Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Your subscription is active. You can view your payment history in
              your account.
            </p>
          </CardContent>
        </>
      )}
    </Card>
  );
}