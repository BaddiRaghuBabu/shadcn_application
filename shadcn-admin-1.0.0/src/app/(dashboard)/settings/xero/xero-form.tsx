"use client"

import { useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabaseClient"
import { toast, Toaster } from "sonner"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

const schema = z.object({
  client_id: z.string().min(1, "Client ID is required"),
  client_secret: z.string().min(1, "Client secret is required"),
  redirect_uri: z.string().url("Must be a valid URL"),
  scopes: z.string().min(1, "At least one scope is required"),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

export default function XeroForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: "",
      client_secret: "",
      redirect_uri: "",
      scopes: "",
      is_active: true,
    },
  })

  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch("/api/xero-settings", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const { settings } = await res.json()
      if (settings && settings.length > 0) {
        const s = settings[0]
        form.reset({
          client_id: s.client_id || "",
          client_secret: s.client_secret || "",
          redirect_uri: s.redirect_uri || "",
          scopes: Array.isArray(s.scopes) ? s.scopes.join(" ") : "",
          is_active: s.is_active ?? true,
        })
      }
    })()
  }, [form])

  const onSubmit = async (data: FormValues) => {
    const scopes = data.scopes
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      toast.error("Not authenticated")
      return
    }

    const res = await fetch("/api/xero-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        client_id: data.client_id,
        client_secret: data.client_secret,
        redirect_uri: data.redirect_uri,
        scopes,
        is_active: data.is_active,
      }),
    })

    if (res.ok) {
      toast.success("Xero settings saved")
    } else {
      toast.error("Save failed")
    }
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client ID</FormLabel>
                <FormControl>
                  <Input placeholder="Client ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="client_secret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Secret</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Client Secret" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="redirect_uri"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Redirect URI</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/callback" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="scopes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scopes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="accounting.transactions accounting.contacts"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit">Save</Button>
        </form>
      </Form>
    </>
  )
}
