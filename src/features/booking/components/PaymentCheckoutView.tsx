import { ArrowLeft, CheckCircle2, CreditCard, Lock, MessageSquare, QrCode, Smartphone, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { TierBadge } from "../../../components/ui/TierBadge";
import type { AttendeeDetailsForm, CheckoutInitResponse, PaymentMethod, Ticket } from "../../../lib/api/types";
import { formatINR } from "../../../lib/domain/rules";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";
import { useCheckout } from "../hooks/useCheckout";
import { useSeatSelection } from "../hooks/useSeatSelection";

interface PaymentCheckoutViewProps {
  eventId: string;
  attendeeForm: AttendeeDetailsForm;
  onBack: () => void;
  onCompleteToTickets: () => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

export const PaymentCheckoutView: React.FC<PaymentCheckoutViewProps> = ({
  eventId,
  attendeeForm,
  onBack,
  onCompleteToTickets,
  onNotify,
}) => {
  const { data: seatData } = useSeatSelection(eventId, onNotify);
  const { initCheckout, confirmCheckout } = useCheckout(eventId);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutInitResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI_QR");
  const [upiVpa, setUpiVpa] = useState("arjun.mehta@okaxis");
  const [vpaVerified, setVpaVerified] = useState(true);
  const [confirmedTicket, setConfirmedTicket] = useState<Ticket | null>(null);

  const selectedSeatIds = attendeeForm.attendees.map((a) => a.seatId);

  useEffect(() => {
    if (selectedSeatIds.length > 0 && !checkoutOrder && !initCheckout.isPending) {
      initCheckout
        .mutateAsync(selectedSeatIds)
        .then((res) => setCheckoutOrder(res))
        .catch((err) => {
          onNotify(err instanceof Error ? err.message : "Unable to initialize order", "error");
        });
    }
  }, [selectedSeatIds.join(",")]);

  const handlePayNow = async () => {
    if (!checkoutOrder) return;
    if (paymentMethod === "UPI_VPA" && !upiVpa.includes("@")) {
      onNotify("Enter a valid UPI ID (e.g. name@okaxis)", "error");
      return;
    }
    try {
      const ticket = await confirmCheckout.mutateAsync({
        eventId,
        seatIds: selectedSeatIds,
        razorpayOrderId: checkoutOrder.razorpayOrderId,
        paymentMethod,
        upiVpa: paymentMethod === "UPI_VPA" ? upiVpa : undefined,
        contactEmail: attendeeForm.contactEmail,
        contactPhone: attendeeForm.contactPhone,
        attendees: attendeeForm.attendees.map((a) => ({
          seatId: a.seatId,
          seatLabel: a.seatLabel,
          fullName: a.fullName,
          age: a.age,
          gender: a.gender ?? "MALE",
        })),
      });
      setConfirmedTicket(ticket);
      onNotify("Payment verified via Razorpay webhook. Digital Pass unlocked.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Payment confirmation failed", "error");
    }
  };

  const breakdown = checkoutOrder?.breakdown ?? seatData?.breakdown;
  const eventTitle = seatData?.event.title ?? "House Untold Live Event";
  const venueName = seatData?.event.venueName ?? "Venue";
  const dateLabel = seatData?.event
    ? `${seatData.event.dateLabel} · ${seatData.event.timeLabel}`
    : "";

  return (
    <div className="max-w-[1280px] mx-auto px-5 sm:px-10 pt-6 pb-16">
      {/* Top Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E7E5E0]">
        {!confirmedTicket
          ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#E7E5E0] text-[13px] font-medium text-[#0F1419] hover:bg-[#F4F3F0] cursor-pointer active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
              <span>Attendees</span>
            </button>
          )
          : (
            <div className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#16A34A]">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
              <span>Booking Confirmed</span>
            </div>
          )}

        <ol className="flex items-center gap-3 text-[13px]">
          <li className="text-[#16A34A] font-medium">1. Seat Selection ✓</li>
          <li className="text-[#E7E5E0]">/</li>
          <li className="text-[#16A34A] font-medium">2. Attendee Details ✓</li>
          <li className="text-[#E7E5E0]">/</li>
          <li className="text-[#2D2A6E] font-semibold">3. Payment &amp; Confirm</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 items-start">
        {/* Left Column: Payment Method OR Confirmed Receipt */}
        <div className="lg:col-span-7 space-y-6">
          {!confirmedTicket
            ? (
              <>
                <div>
                  <h1 className="text-[28px] font-semibold text-[#0F1419]">Payment Method</h1>
                  <p className="text-[14px] text-[#5C6570] mt-1">
                    Atomic Razorpay UPI checkout. Seats lock permanently only upon HMAC webhook confirmation.
                  </p>
                </div>

                {/* Method Selector */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI_QR")}
                    className={`p-4 rounded-[12px] border text-left cursor-pointer active:scale-95 transition-all ${
                      paymentMethod === "UPI_QR"
                        ? "bg-white border-[#2D2A6E] ring-2 ring-[#2D2A6E]/15"
                        : "bg-white border-[#E7E5E0] hover:bg-[#FAFAF7]"
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-[#2D2A6E] mb-2" strokeWidth={1.75} />
                    <div className="text-[14px] font-semibold text-[#0F1419]">Scan UPI QR</div>
                    <div className="text-[12px] text-[#5C6570]">GPay, PhonePe, Paytm</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("UPI_VPA")}
                    className={`p-4 rounded-[12px] border text-left cursor-pointer active:scale-95 transition-all ${
                      paymentMethod === "UPI_VPA"
                        ? "bg-white border-[#2D2A6E] ring-2 ring-[#2D2A6E]/15"
                        : "bg-white border-[#E7E5E0] hover:bg-[#FAFAF7]"
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-[#2D2A6E] mb-2" strokeWidth={1.75} />
                    <div className="text-[14px] font-semibold text-[#0F1419]">UPI ID / VPA</div>
                    <div className="text-[12px] text-[#5C6570]">Instant collect request</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`p-4 rounded-[12px] border text-left cursor-pointer active:scale-95 transition-all ${
                      paymentMethod === "CARD"
                        ? "bg-white border-[#2D2A6E] ring-2 ring-[#2D2A6E]/15"
                        : "bg-white border-[#E7E5E0] hover:bg-[#FAFAF7]"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-[#2D2A6E] mb-2" strokeWidth={1.75} />
                    <div className="text-[14px] font-semibold text-[#0F1419]">Card</div>
                    <div className="text-[12px] text-[#5C6570]">Visa, Mastercard, RuPay</div>
                  </button>
                </div>

                {/* Payment Surface */}
                <div className="bg-white rounded-[14px] border border-[#E7E5E0] p-6 space-y-6">
                  {paymentMethod === "UPI_QR" && (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="p-4 rounded-[12px] bg-[#FAFAF7] border border-[#E7E5E0] shrink-0">
                        <QRCodeSVG
                          value={`upi://pay?pa=venu@razorpay&pn=VenuLive&am=${breakdown?.totalPayable ?? 0}&tr=${
                            checkoutOrder?.razorpayOrderId ?? "order"
                          }`}
                          size={148}
                          bgColor="#FAFAF7"
                          fgColor="#0F1419"
                        />
                      </div>
                      <div className="space-y-2 text-center sm:text-left">
                        <div className="text-[16px] font-semibold text-[#0F1419]">
                          Scan &amp; Pay via any UPI App
                        </div>
                        <p className="text-[13px] text-[#5C6570]">
                          Instant verification via Google Pay, PhonePe, BHIM, or Paytm. Order ID{" "}
                          <span className="num font-medium text-[#0F1419]">
                            {checkoutOrder?.razorpayOrderId ?? "Initializing..."}
                          </span>
                        </p>
                        <div className="pt-1 text-[12px] text-[#5C6570]">
                          Zero surcharge on UPI payments.
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "UPI_VPA" && (
                    <div className="space-y-3">
                      <label
                        htmlFor="upi-vpa"
                        className="block text-[13px] font-medium text-[#0F1419]"
                      >
                        Enter UPI ID / VPA
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="upi-vpa"
                          type="text"
                          value={upiVpa}
                          onChange={(e) => {
                            setUpiVpa(e.target.value);
                            setVpaVerified(false);
                          }}
                          placeholder="username@okaxis"
                          className="flex-1 h-11 px-3.5 rounded-[8px] bg-white border border-[#E7E5E0] text-[14px] num focus:outline-none focus:border-[#2D2A6E]"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setVpaVerified(upiVpa.includes("@"));
                            if (upiVpa.includes("@")) {
                              onNotify("UPI handle verified.", "info");
                            }
                          }}
                        >
                          {vpaVerified ? "Verified ✓" : "Verify"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "CARD" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[13px] font-medium text-[#0F1419] mb-1.5">
                          Card Number
                        </label>
                        <input
                          type="text"
                          defaultValue="4532 •••• •••• 8841"
                          className="w-full h-11 px-3.5 rounded-[8px] bg-white border border-[#E7E5E0] text-[14px] num"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#0F1419] mb-1.5">
                          Expiry
                        </label>
                        <input
                          type="text"
                          defaultValue="09/28"
                          className="w-full h-11 px-3.5 rounded-[8px] bg-white border border-[#E7E5E0] text-[14px] num"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#0F1419] mb-1.5">
                          CVV
                        </label>
                        <input
                          type="password"
                          defaultValue="841"
                          className="w-full h-11 px-3.5 rounded-[8px] bg-white border border-[#E7E5E0] text-[14px] num"
                        />
                      </div>
                    </div>
                  )}

                  {/* Server-verified breakdown */}
                  {breakdown && (
                    <div className="pt-4 border-t border-[#E7E5E0] space-y-2 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-[#5C6570]">Base Tickets ({breakdown.seatCount})</span>
                        <span className="num text-[#0F1419]">{formatINR(breakdown.baseAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5C6570]">Convenience Fee &amp; GST</span>
                        <span className="num text-[#0F1419]">
                          {formatINR(breakdown.convenienceFee + breakdown.gstAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#E7E5E0] text-[16px] font-semibold">
                        <span className="text-[#0F1419]">Total Payable</span>
                        <span className="num text-[#0F1419]">{formatINR(breakdown.totalPayable)}</span>
                      </div>
                    </div>
                  )}

                  {/* ONE Primary CTA */}
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={!checkoutOrder}
                    isLoading={confirmCheckout.isPending}
                    onClick={handlePayNow}
                  >
                    <Lock className="w-4 h-4" strokeWidth={1.75} />
                    <span>
                      Pay {formatINR(breakdown?.totalPayable ?? 0)} &amp; Unlock Pass
                    </span>
                  </Button>
                </div>
              </>
            )
            : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING_SPATIAL}
                className="bg-white rounded-[14px] border border-[#E7E5E0] p-6 sm:p-8 space-y-6"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <h1 className="text-[26px] font-semibold text-[#0F1419]">
                      Your pass is unlocked
                    </h1>
                    <p className="text-[14px] text-[#5C6570] mt-1">
                      Order <span className="num font-medium text-[#0F1419]">{confirmedTicket.orderId}</span>{" "}
                      confirmed atomically. Your signed JWT QR pass is active.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-[12px] bg-[#FAFAF7] border border-[#E7E5E0] flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-[13px] text-[#0F1419]">
                    WhatsApp &amp; SMS confirmation dispatched to{" "}
                    <span className="num font-medium">{confirmedTicket.contactPhone}</span> and{" "}
                    <span className="font-medium">{confirmedTicket.contactEmail}</span>.
                  </div>
                </div>

                {/* ONE Primary CTA */}
                <Button variant="primary" size="lg" onClick={onCompleteToTickets}>
                  Open My Tickets Wallet
                </Button>
              </motion.div>
            )}
        </div>

        {/* Right Column: Ticket Pass Preview (Locked -> Unlocked) */}
        <aside className="lg:col-span-5">
          <div className="bg-white rounded-[14px] border border-[#E7E5E0] shadow-card overflow-hidden">
            <div className="p-6 border-b border-dashed border-[#E7E5E0] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="num text-[11px] font-semibold uppercase tracking-wider text-[#5C6570]">
                  {confirmedTicket ? confirmedTicket.code : "Booking in progress"}
                </span>
                <TierBadge
                  tier={confirmedTicket?.tier ?? attendeeForm.attendees[0]?.tier ?? "VIP"}
                />
              </div>
              <h2 className="text-[20px] font-semibold text-[#0F1419]">{eventTitle}</h2>
              <p className="text-[13px] text-[#5C6570]">
                {dateLabel} · {venueName}
              </p>
            </div>

            {confirmedTicket
              ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING_SPATIAL}
                  className="p-6 space-y-5"
                >
                  <div className="flex justify-center p-5 rounded-[12px] bg-[#FAFAF7] border border-[#E7E5E0]">
                    <QRCodeSVG
                      value={confirmedTicket.qrToken}
                      size={180}
                      bgColor="#FAFAF7"
                      fgColor="#0F1419"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <div>
                      <div className="text-[#5C6570]">Entry Gate</div>
                      <div className="num font-medium text-[#0F1419] mt-0.5">
                        {confirmedTicket.gate}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#5C6570]">Seats</div>
                      <div className="num font-medium text-[#0F1419] mt-0.5">
                        {confirmedTicket.seatLabels.join(", ")}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[10px] bg-[#CCFBF1]/45 border border-[#0F766E]/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-[#0F766E]">
                      <Wallet className="w-4 h-4" strokeWidth={1.75} />
                      <span>Wallet Wallet Balance</span>
                    </div>
                    <span className="num text-[16px] font-semibold text-[#0F766E]">
                      {formatINR(confirmedTicket.foodBalance)}
                    </span>
                  </div>
                </motion.div>
              )
              : (
                <div className="p-10 text-center space-y-3 bg-[#FAFAF7]/60">
                  <div className="w-12 h-12 rounded-full bg-white border border-[#E7E5E0] mx-auto flex items-center justify-center text-[#5C6570]">
                    <Lock className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div className="text-[15px] font-semibold text-[#0F1419]">
                    Complete payment to release pass
                  </div>
                  <p className="text-[13px] text-[#5C6570] max-w-xs mx-auto">
                    Seats{" "}
                    <span className="num font-medium text-[#0F1419]">
                      {attendeeForm.attendees.map((a) => a.seatLabel).join(", ")}
                    </span>{" "}
                    are held for your checkout session.
                  </p>
                </div>
              )}
          </div>
        </aside>
      </div>
    </div>
  );
};
