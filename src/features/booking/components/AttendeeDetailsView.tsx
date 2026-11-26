import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, ShieldAlert, Users } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "../../../components/ui/Button";
import { TierBadge } from "../../../components/ui/TierBadge";
import { type AttendeeDetailsForm, AttendeeDetailsFormSchema } from "../../../lib/api/schemas";
import type { TierType } from "../../../lib/api/types";
import { formatINR, validateAttendeeAgesForSections, validateCoupleComposition } from "../../../lib/domain/rules";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCheckout } from "../hooks/useCheckout";
import { useSeatSelection } from "../hooks/useSeatSelection";

interface AttendeeDetailsViewProps {
  eventId: string;
  onBack: () => void;
  onNext: (formData: AttendeeDetailsForm) => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

const VALID_TIERS: readonly TierType[] = ["TABLE", "COUPLE", "STAG"];

function normalizeTier(tier: string | undefined, isClub: boolean): TierType {
  if (isClub) return "TABLE";
  if (tier && (VALID_TIERS as readonly string[]).includes(tier)) {
    return tier as TierType;
  }
  return "TABLE";
}

export const AttendeeDetailsView: React.FC<AttendeeDetailsViewProps> = ({
  eventId,
  onBack,
  onNext,
  onNotify,
}) => {
  const { user } = useAuth();
  const { data: seatData, isLoading } = useSeatSelection(eventId, onNotify);
  const { sendOtp, verifyOtp } = useCheckout(eventId);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [validationErrorSummary, setValidationErrorSummary] = useState<string | null>(null);

  const selectedSeats = useMemo(
    () => (seatData?.seats ?? []).filter((s) => s.status === "SELECTED_BY_ME"),
    [seatData?.seats],
  );

  const sectionMap = useMemo(
    () => new Map((seatData?.event.sections ?? []).map((sec) => [sec.id, sec])),
    [seatData?.event.sections],
  );

  const isClub = seatData?.event.layoutType === "CLUB" || seatData?.event.layoutType === "Lounge";

  const hasCoupleSeats = useMemo(
    () => !isClub && selectedSeats.some((s) => normalizeTier(s.tier, false) === "COUPLE"),
    [isClub, selectedSeats],
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<AttendeeDetailsForm, unknown, AttendeeDetailsForm>({
    resolver: zodResolver(AttendeeDetailsFormSchema) as never,
    defaultValues: {
      contactEmail: user?.email ?? "arjun.mehta@gmail.com",
      contactPhone: user?.phone ?? "+91 98204 11220",
      phoneOtpVerified: user?.phoneVerified ? true : (false as unknown as true),
      attendees: [],
    },
  });

  const { fields, replace } = useFieldArray({ control, name: "attendees" });
  const phoneOtpVerified = watch("phoneOtpVerified");
  const contactPhone = watch("contactPhone");

  useEffect(() => {
    if (selectedSeats.length > 0 && fields.length !== selectedSeats.length) {
      let coupleIdx = 0;
      replace(
        selectedSeats.map((seat, idx) => {
          const sec = sectionMap.get(seat.sectionId);
          const effectiveTier = normalizeTier(seat.tier, isClub);
          const defaultGender = effectiveTier === "COUPLE"
            ? coupleIdx++ % 2 === 0
              ? ("MALE" as const)
              : ("FEMALE" as const)
            : ("MALE" as const);
          return {
            seatId: seat.id,
            seatLabel: seat.label,
            tier: effectiveTier,
            minAge: sec?.minAge ?? 0,
            fullName: idx === 0 ? user?.name ?? "Arjun Mehta" : "",
            age: idx === 0 ? user?.age ?? 27 : 24,
            gender: defaultGender,
          };
        }),
      );
    }
  }, [selectedSeats, fields.length, replace, sectionMap, isClub, user?.name, user?.age]);

  if (isLoading || !seatData) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-10">
        <div className="h-[460px] rounded-[14px] bg-[#5B342E]/50 border border-[#875931]/40 animate-pulse" />
      </div>
    );
  }

  if (selectedSeats.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-16 text-center space-y-4">
        <h1 className="text-[24px] font-semibold text-[#F1DAA5]">No seats held yet</h1>
        <p className="text-[14px] text-[#CFB790]">
          Select at least one seat or table on the floor map before entering attendee details.
        </p>
        <Button variant="primary" onClick={onBack}>
          Return to Seat Map
        </Button>
      </div>
    );
  }

  const handleSendOtp = async () => {
    try {
      const res = await sendOtp.mutateAsync(contactPhone);
      setOtpSent(true);
      onNotify(`SMS OTP sent to ${res.maskedPhone} (demo code: 123456)`, "info");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to send OTP", "error");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await verifyOtp.mutateAsync({ phone: contactPhone, otp: otpInput });
      setValue("phoneOtpVerified", true, { shouldValidate: true });
      onNotify("Phone number verified via SMS OTP.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Invalid OTP", "error");
    }
  };

  const onSubmit = (values: AttendeeDetailsForm) => {
    setValidationErrorSummary(null);
    const ageIssues = validateAttendeeAgesForSections(
      values.attendees,
      selectedSeats,
      seatData.event.sections,
    );
    if (ageIssues.length > 0) {
      ageIssues.forEach((issue) => {
        const idx = values.attendees.findIndex((a) => a.seatId === issue.seatId);
        if (idx !== -1) {
          setError(`attendees.${idx}.age`, { message: issue.message });
        }
      });
      setValidationErrorSummary(ageIssues[0].message);
      onNotify(ageIssues[0].message, "error");
      return;
    }

    if (!isClub) {
      const coupleIssue = validateCoupleComposition(values.attendees, selectedSeats);
      if (coupleIssue) {
        setValidationErrorSummary(coupleIssue.message);
        onNotify(coupleIssue.message, "error");
        return;
      }
    }

    onNext(values);
  };

  const { event, breakdown } = seatData;

  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-10 pt-6 pb-16">
      {/* Progress Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#875931]/40">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#5B342E]/75 border border-[#875931]/50 text-[13px] font-medium text-[#F1DAA5] hover:bg-[#5B342E] cursor-pointer active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Seats</span>
        </button>

        <ol className="flex items-center gap-3 text-[13px]">
          <li className="text-[#A7F3D0] font-medium">1. Seat Selection ✓</li>
          <li className="text-[#875931]">/</li>
          <li className="text-[#F1DAA5] font-semibold">2. Attendee Details</li>
          <li className="text-[#875931]">/</li>
          <li className="text-[#CFB790]">3. Payment &amp; Confirm</li>
        </ol>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start"
      >
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="text-[28px] font-semibold text-[#F1DAA5]">Who is attending?</h1>
            <p className="text-[14px] text-[#CFB790] mt-1">
              Enter each guest&apos;s full name, age, and gender as shown on government photo ID.
            </p>
          </div>

          {/* Ticket Delivery Contact & Firebase SMS OTP */}
          <section className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 space-y-4">
            <h2 className="text-[17px] font-semibold text-[#F1DAA5]">Ticket Delivery Contact</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contactEmail"
                  className="block text-[13px] font-medium text-[#F1DAA5] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  {...register("contactEmail")}
                  className="w-full h-11 px-3.5 rounded-[8px] bg-[#360D19] border border-[#875931]/60 text-[14px] text-[#F1DAA5] focus:outline-none focus:border-[#F1DAA5]"
                />
                {errors.contactEmail && (
                  <p className="text-[12px] text-[#FCA5A5] mt-1">{errors.contactEmail.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contactPhone"
                  className="block text-[13px] font-medium text-[#F1DAA5] mb-1.5"
                >
                  Mobile Number (WhatsApp / SMS Pass)
                </label>
                <div className="flex gap-2">
                  <input
                    id="contactPhone"
                    type="tel"
                    {...register("contactPhone")}
                    onChange={(e) => {
                      register("contactPhone").onChange(e);
                      setValue("phoneOtpVerified", false as unknown as true);
                    }}
                    className="flex-1 h-11 px-3.5 rounded-[8px] bg-[#360D19] border border-[#875931]/60 text-[14px] text-[#F1DAA5] num focus:outline-none focus:border-[#F1DAA5]"
                  />
                  {!phoneOtpVerified && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSendOtp}
                      isLoading={sendOtp.isPending}
                    >
                      Send OTP
                    </Button>
                  )}
                </div>
                {errors.contactPhone && (
                  <p className="text-[12px] text-[#FCA5A5] mt-1">{errors.contactPhone.message}</p>
                )}
              </div>
            </div>

            {phoneOtpVerified
              ? (
                <div className="flex items-center gap-2 text-[13px] text-[#A7F3D0] font-medium pt-1">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                  <span>Mobile number verified for instant WhatsApp &amp; SMS ticket delivery</span>
                </div>
              )
              : (
                <div className="p-4 rounded-[10px] bg-[#360D19]/75 border border-[#875931]/50 space-y-2.5">
                  <div className="text-[13px] font-medium text-[#F1DAA5]">
                    SMS OTP Verification Required
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="h-10 w-44 px-3 rounded-[8px] bg-[#360D19] border border-[#875931]/60 text-[14px] text-[#F1DAA5] num tracking-widest focus:outline-none focus:border-[#F1DAA5]"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleVerifyOtp}
                      isLoading={verifyOtp.isPending}
                    >
                      Verify OTP
                    </Button>
                    {otpSent && <span className="text-[12px] text-[#CFB790] num">Demo OTP: 123456</span>}
                  </div>
                  {errors.phoneOtpVerified && (
                    <p className="text-[12px] text-[#FCA5A5]">
                      {errors.phoneOtpVerified.message}
                    </p>
                  )}
                </div>
              )}
          </section>

          {/* Per-Seat Attendee Inputs */}
          <section className="space-y-4">
            <h2 className="text-[17px] font-semibold text-[#F1DAA5]">
              Attendee Details ({fields.length} {fields.length === 1 ? "Guest" : "Guests"})
            </h2>

            {hasCoupleSeats && (
              <div className="flex items-start gap-2.5 p-4 rounded-[10px] bg-[#5B342E]/70 border border-[#875931]/50 text-[13px] text-[#F1DAA5]">
                <Users className="w-4 h-4 text-[#FBCFE8] shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>
                  <strong className="font-semibold text-[#FBCFE8]">Couple Entry Rule:</strong>{" "}
                  Couple section bookings require 2 guests per pair — strictly 1 Male and 1 Female.
                </span>
              </div>
            )}

            {validationErrorSummary && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-[10px] bg-[#360D19] border border-[#FCA5A5]/50 text-[13px] text-[#FCA5A5]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{validationErrorSummary}</span>
              </div>
            )}

            {fields.map((field, index) => {
              const badgeTier = normalizeTier(field.tier, isClub);
              return (
                <div
                  key={field.id}
                  className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#875931]/40">
                    <div className="flex items-center gap-2.5">
                      <span className="num text-[14px] font-semibold text-[#F1DAA5]">
                        Seat {field.seatLabel}
                      </span>
                      <TierBadge tier={badgeTier} />
                    </div>
                    {field.minAge > 0 && (
                      <span className="num text-[12px] font-medium text-[#CFB790]">
                        {field.minAge}+ Alcohol Zone
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`attendee-name-${index}`}
                        className="block text-[13px] font-medium text-[#F1DAA5] mb-1.5"
                      >
                        Full Name (as on Gov ID)
                      </label>
                      <input
                        id={`attendee-name-${index}`}
                        type="text"
                        {...register(`attendees.${index}.fullName`)}
                        placeholder="e.g. Pooja Mehta"
                        className="w-full h-11 px-3.5 rounded-[8px] bg-[#360D19] border border-[#875931]/60 text-[14px] text-[#F1DAA5] focus:outline-none focus:border-[#F1DAA5]"
                      />
                      {errors.attendees?.[index]?.fullName && (
                        <p className="text-[12px] text-[#FCA5A5] mt-1">
                          {errors.attendees[index]?.fullName?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`attendee-age-${index}`}
                        className="block text-[13px] font-medium text-[#F1DAA5] mb-1.5"
                      >
                        Age
                      </label>
                      <input
                        id={`attendee-age-${index}`}
                        type="number"
                        {...register(`attendees.${index}.age`, { valueAsNumber: true })}
                        className="w-full h-11 px-3.5 rounded-[8px] bg-[#360D19] border border-[#875931]/60 text-[14px] text-[#F1DAA5] num focus:outline-none focus:border-[#F1DAA5]"
                      />
                      {errors.attendees?.[index]?.age && (
                        <p className="text-[12px] text-[#FCA5A5] mt-1">
                          {errors.attendees[index]?.age?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`attendee-gender-${index}`}
                        className="block text-[13px] font-medium text-[#F1DAA5] mb-1.5"
                      >
                        Gender
                      </label>
                      <select
                        id={`attendee-gender-${index}`}
                        {...register(`attendees.${index}.gender`)}
                        className="w-full h-11 px-3 rounded-[8px] bg-[#360D19] border border-[#875931]/60 text-[14px] text-[#F1DAA5] focus:outline-none focus:border-[#F1DAA5]"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        {badgeTier !== "COUPLE" && <option value="OTHER">Other</option>}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Sticky Server-Calculated Order Summary */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-[#5B342E]/65 rounded-[14px] border border-[#875931]/50 shadow-card p-6 space-y-5">
            <div>
              <div className="text-[11px] font-medium text-[#CFB790] uppercase tracking-wider">
                Order Summary
              </div>
              <h2 className="text-[18px] font-semibold text-[#F1DAA5] mt-1">{event.title}</h2>
              <p className="text-[13px] text-[#CFB790] mt-0.5">
                {event.dateLabel} · {event.timeLabel} · {event.venueName}
              </p>
            </div>

            <div className="divide-y divide-[#875931]/40 border-y border-[#875931]/40 text-[13px]">
              <div className="py-3 flex justify-between">
                <span className="text-[#CFB790]">
                  Tickets ({breakdown.seatCount} × {selectedSeats.map((s) => s.label).join(", ")})
                </span>
                <span className="num font-medium text-[#F1DAA5]">
                  {formatINR(breakdown.baseAmount)}
                </span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-[#CFB790]">Booking &amp; Venue Convenience Fee</span>
                <span className="num font-medium text-[#F1DAA5]">
                  {formatINR(breakdown.convenienceFee)}
                </span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-[#CFB790]">Taxes &amp; GST</span>
                <span className="num font-medium text-[#F1DAA5]">
                  {formatINR(breakdown.gstAmount)}
                </span>
              </div>
              {breakdown.fnbCreditTotal > 0 && (
                <div className="py-3 flex justify-between">
                  <span className="text-[#A7F3D0] font-medium">Pre-loaded Wallet Credit</span>
                  <span className="num font-semibold text-[#A7F3D0]">
                    +{formatINR(breakdown.fnbCreditTotal)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold text-[#F1DAA5]">Total Amount</span>
              <span className="num text-[24px] font-semibold text-[#F1DAA5]">
                {formatINR(breakdown.totalPayable)}
              </span>
            </div>

            {/* ONE Primary CTA */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full !bg-[#F1DAA5] !text-[#360D19] hover:!bg-[#CFB790]"
            >
              <span>Continue to Payment</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#CFB790]">
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Prices verified atomically by HouseUntold server</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};
