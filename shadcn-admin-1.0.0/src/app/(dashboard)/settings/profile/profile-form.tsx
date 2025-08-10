"use client"

import { useEffect, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast, Toaster } from "sonner"
import { supabase } from "@/lib/supabaseClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

const DOB_REGEX = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/
const AGE_CUTOFF = (() => {

 const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  return d
})()

const schema = z.object({
  name: z.string().min(2, "Name is required").max(30),
  username: z.string().min(2, "Username is required").max(30),
  email: z.string().email(),
  dob: z
    .string()
    .regex(DOB_REGEX, "Must be DD/MM/YYYY")
    .superRefine((val, ctx) => {
      const [, dd, mm, yyyy] = val.match(DOB_REGEX)!
      const day = +dd,
        month = +mm,
        year = +yyyy
      const date = new Date(year, month - 1, day)
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dob"],
          message: "Invalid date",
        })
        return
      }
      if (date > AGE_CUTOFF) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dob"],
          message: "Must be at least 18",
        })
      }
    }),
  avatar: z.any().optional(),
  language: z.string(),
  role: z.string().default("default"),

})



type FormValues = z.infer<typeof schema>

export function AccountForm() {
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
        defaultValues: {
      name: "",
      username: "",
      email: "",
      dob: "",
      language: "en",
      role: "default",
      avatar: undefined,
    },
    mode: "onChange",
  })


  useEffect(() => {
     ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      form.setValue("email", session.user.email!)
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, username, language, dob, avatar, role")
        .eq("user_id", session.user.id)
        .single()

      if (profile) {
        form.setValue("name", profile.name || "")
        form.setValue("username", profile.username || "")
        form.setValue("language", profile.language || "en")

                form.setValue("role", profile.role || "default")
        const d = new Date(profile.dob)
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const yyyy = d.getFullYear()
        form.setValue("dob", `${dd}/${mm}/${yyyy}`)

        if (profile.avatar) {
          setAvatarPreview(profile.avatar)
      }
      }
    })()
  }, [form])

  const onSubmit = async (data: FormValues) => {
    const [, dd, mm, yyyy] = data.dob.match(DOB_REGEX)!
    const iso = new Date(+yyyy, +mm - 1, +dd).toISOString().split("T")[0]

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    let avatarUrl = avatarPreview
    if (data.avatar instanceof File) {
      const fileExt = data.avatar.name.split(".").pop()
      const filePath = `${session.user.id}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, data.avatar, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath)
        avatarUrl = urlData.publicUrl
      }
    }


    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        username: data.username,
        language: data.language,
        dob: iso,
        avatar: avatarUrl,

      }),
    });

    if (res.ok) {
      toast.success("Profile updated!")
    } else {
      toast.error("Update failed");
    }
  };

  return (
    <>
      <Toaster position="bottom-right" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input readOnly {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

                    <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <Input readOnly {...field} /> 
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                                   <Input
                    placeholder="DD/MM/YYYY"
                    {...field}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 8)
                      const parts = [
                        digits.slice(0, 2),
                        digits.slice(2, 4),
                        digits.slice(4, 8),
                      ].filter(Boolean)
                      field.onChange(parts.join("/"))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avatar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile photo</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      field.onChange(file)
                      if (file) {
                        setAvatarPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                </FormControl>
                {avatarPreview && (
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarPreview} alt="Avatar preview" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">Update account</Button>
        </form>
      </Form>
    </>
  )
}
