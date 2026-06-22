import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Ange ditt namn").max(100),
  email: z.string().trim().email("Ogiltig e-postadress").max(255),
  subject: z.enum(["general", "access", "deletion", "other"]),
  message: z.string().trim().min(1, "Skriv ett meddelande").max(2000),
  consent: z.literal(true, { errorMap: () => ({ message: "Du måste godkänna integritetspolicyn" }) }),
});

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<"general" | "access" | "deletion" | "other">("general");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState(""); // honeypot

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return; // bot
    const parsed = schema.safeParse({ name, email, subject, message, consent });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    const subjMap = {
      general: "Förfrågan",
      access: "Begäran om utdrag av personuppgifter",
      deletion: "Begäran om radering av personuppgifter",
      other: "Övrigt",
    };
    const body = `Namn: ${name}\nE-post: ${email}\n\n${message}`;
    window.location.href = `mailto:kontakt@pmmaster.se?subject=${encodeURIComponent(subjMap[subject])}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 mx-auto max-w-2xl px-6 py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka</Link>
        <h1 className="mt-6 text-4xl font-bold text-foreground">Kontakt</h1>
        <p className="mt-3 text-muted-foreground">
          Använd formuläret nedan för frågor eller för att utöva dina rättigheter enligt GDPR
          (utdrag, rättelse eller radering). Du kan också mejla direkt till{" "}
          <a className="text-primary underline" href="mailto:kontakt@pmmaster.se">kontakt@pmmaster.se</a>.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-4">
          {/* honeypot */}
          <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

          <div>
            <label className="text-sm font-medium">Namn</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </div>
          <div>
            <label className="text-sm font-medium">E-post</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
          </div>
          <div>
            <label className="text-sm font-medium">Ärende</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as typeof subject)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="general">Allmän förfrågan</option>
              <option value="access">Begära utdrag av mina personuppgifter</option>
              <option value="deletion">Begära radering av mina personuppgifter</option>
              <option value="other">Övrigt</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Meddelande</label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={5} required />
          </div>

          <div className="flex items-start gap-2 pt-2">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
            <label htmlFor="consent" className="text-sm text-muted-foreground leading-tight">
              Jag godkänner{" "}
              <Link to="/integritetspolicy" className="text-primary underline">integritetspolicyn</Link>{" "}
              och att mina uppgifter behandlas för att besvara min förfrågan.
            </label>
          </div>

          <Button type="submit" className="gradient-primary text-primary-foreground">Skicka</Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
