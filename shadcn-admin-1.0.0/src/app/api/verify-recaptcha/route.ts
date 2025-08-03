import { NextResponse } from "next/server";

const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

export async function POST(req: Request) {
  if (!SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: "Missing reCAPTCHA secret" },
      { status: 500 }
    );
  }

  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== "string") {
    return NextResponse.json(
      { success: false, error: "Token required" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    secret: SECRET_KEY,
    response: token,
  });

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: params,
    });
    const data = await res.json();
    return NextResponse.json({ success: data.success === true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
