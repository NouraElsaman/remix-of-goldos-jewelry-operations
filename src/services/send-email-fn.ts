import { createServerFn } from "@tanstack/react-start";

interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  apiKey?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 string
  }>;
}

/**
 * Server function to send emails via Resend API on the server side.
 * Bypasses CORS and reads process.env.RESEND_API_KEY or explicit apiKey.
 */
export const sendEmailViaResend = createServerFn({ method: "POST" })
  .validator((payload: SendEmailPayload) => payload)
  .handler(async ({ data }): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const apiKey =
        data.apiKey ||
        process.env.RESEND_API_KEY ||
        process.env.VITE_RESEND_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          error: "مفتاح API الخاص بـ Resend غير مفعل. يرجى إضافة RESEND_API_KEY في الإعدادات أو البيئة.",
        };
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "جوهرة تك <onboarding@resend.dev>",
          to: [data.to],
          subject: data.subject,
          html: data.html,
          attachments: data.attachments,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        console.error("Resend API Error:", responseData);
        return {
          success: false,
          error: responseData.message || responseData.error || "فشل إرسال البريد الإلكتروني عبر Resend",
        };
      }

      return {
        success: true,
        id: responseData.id,
      };
    } catch (err: any) {
      console.error("Error in sendEmailViaResend serverFn:", err);
      return {
        success: false,
        error: err.message || "حدث خطأ غير متوقع أثناء إرسال البريد الإلكتروني",
      };
    }
  });
