import { Resend } from "resend";
import { EmailTemplate } from "@/components/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);
export async function notifyViaEmail(url: string, message: string = "") {
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: [process.env.TO_EMAIL!],
    subject: "AI detection",
    react: EmailTemplate({ url, message }),
    html: "",
  });
}
