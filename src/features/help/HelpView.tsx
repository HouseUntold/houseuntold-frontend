import { useSubmitHelp } from "@/api/hooks/useHelp";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { limitDigits, normalizeIndianMobile } from "@/lib/validation";
import { useUiStore } from "@/stores/ui.store";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  GlassWater,
  LifeBuoy,
  Send,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";

type Errors = { name?: string; phone?: string; message?: string };

const topics = [
  {
    icon: Ticket,
    title: "Tickets and entry",
    body: "Ask about tables, couple or single tickets, ticket transfers, missing tickets, and entry QR issues.",
  },
  {
    icon: CalendarClock,
    title: "Bookings and payments",
    body: "Ask about UPI payments, payment references, and confirmation times.",
  },
  {
    icon: GlassWater,
    title: "Bar credit",
    body: "Ask about bar credit, bar codes, menu items, and balances.",
  },
  {
    icon: ShieldCheck,
    title: "Safety and ID",
    body: "Ask about 21+ government photo ID, venue rules, and getting to the venue.",
  },
];

const faqs = [
  [
    "How do I get my ticket?",
    "After payment is confirmed, open My Ticket to see your entry QR code and 5-character bar code.",
  ],
  [
    "What is a single ticket?",
    "A single ticket is for one guest. Choose Single — Men or Single — Women; couple and table tickets are separate options.",
  ],
  ["Why is my booking still pending?", "We confirm your booking after you submit the 12-digit payment reference."],
  [
    "What should I carry?",
    "Carry a valid government photo ID. Show your entry QR code at the door and your bar code at the bar.",
  ],
];

export const HelpView: React.FC = () => {
  const { showToast } = useUiStore();
  const submitHelp = useSubmitHelp();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (name.trim().length < 2 || name.trim().length > 80) {
      nextErrors.name = "Enter a name between 2 and 80 characters.";
    }
    const phoneResult = normalizeIndianMobile(phone);
    if (phoneResult.error) nextErrors.phone = phoneResult.error;
    if (message.trim().length < 10 || message.trim().length > 1000) {
      nextErrors.message = "Write between 10 and 1000 characters.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await submitHelp.mutateAsync({
        name: name.trim(),
        phone: phoneResult.value,
        message: message.trim(),
      });
      setPhone(phoneResult.value);
      setMessage("");
      showToast("Your message has been sent. We'll reply shortly.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || "Could not send your message. Please try again.", "danger");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 space-y-8 text-left">
      <div className="space-y-3">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
        </Link>
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)] border border-[var(--color-brand)]/30">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-ink)]">Help &amp; Support</h1>
            <p className="text-sm text-[var(--color-muted)] mt-1 max-w-2xl">
              Answers for tickets, payments, entry QR codes, and bar credit — plus a direct line to our team.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {topics.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-4 space-y-2">
            <Icon className="w-5 h-5 text-[var(--color-brand)]" />
            <h3 className="text-sm font-bold text-[var(--color-ink)]">{title}</h3>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">{body}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] pb-4">
            <Send className="w-4 h-4 text-[var(--color-brand)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--color-ink)]">Contact Us</h2>
              <p className="text-[11px] text-[var(--color-muted)]">We'll reply on the mobile number you provide.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your name"
                value={name}
                maxLength={80}
                placeholder="Full name"
                error={errors.name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
              />
              <Input
                label="Mobile number"
                type="tel"
                inputMode="numeric"
                maxLength={12}
                value={phone}
                placeholder="919876543210"
                error={errors.phone}
                onChange={(e) => {
                  setPhone(limitDigits(e.target.value));
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-1.5">
                Your message
              </label>
              <textarea
                rows={6}
                value={message}
                maxLength={1000}
                placeholder="Describe your booking, payment or entry question..."
                onChange={(e) => {
                  setMessage(e.target.value);
                  setErrors((prev) => ({ ...prev, message: undefined }));
                }}
                className={`w-full p-3 rounded-xl bg-[var(--color-canvas)] border text-sm text-[var(--color-ink)] focus:outline-none resize-y ${
                  errors.message
                    ? "border-[var(--color-danger)]"
                    : "border-[var(--color-hairline)] focus:border-[var(--color-brand)]"
                }`}
              />
              {errors.message && <p className="mt-1 text-xs text-[var(--color-danger)]">{errors.message}</p>}
              <p className="mt-1 text-[10px] text-[var(--color-muted)]">{message.length}/1000 characters</p>
            </div>
            <Button type="submit" isLoading={submitHelp.isPending} className="w-full justify-center">
              <Send className="w-4 h-4 mr-1.5" /> Send request
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] pb-4">
            <CircleAlert className="w-4 h-4 text-[var(--color-brand)]" />
            <h2 className="text-sm font-bold text-[var(--color-ink)]">Quick answers</h2>
          </div>
          {faqs.map(([question, answer]) => (
            <div key={question} className="space-y-1">
              <p className="text-xs font-bold text-[var(--color-ink)]">{question}</p>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed">{answer}</p>
            </div>
          ))}
          <div className="pt-4 border-t border-[var(--color-hairline)] flex items-center gap-2 text-xs text-[var(--color-success)]">
            <CheckCircle2 className="w-4 h-4" /> We've received your message and will reply shortly.
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <Users className="w-4 h-4 text-[var(--color-brand)]" /> For urgent help at the event, ask venue staff.
          </div>
        </Card>
      </div>
    </div>
  );
};
