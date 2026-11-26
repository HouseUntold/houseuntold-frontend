import { Calendar, History } from "lucide-react";
import { motion } from "motion/react";
import React, { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import type { Ticket } from "../../../lib/api/types";
import { partitionTicketsByLifecycle } from "../../../lib/domain/rules";
import { STAGGER_CONTAINER, STAGGER_ITEM } from "../../../lib/motion/variants";
import { useTickets } from "../hooks/useCheckout";
import { PaperTicketCard } from "./PaperTicketCard";
import { TicketQrModal } from "./TicketQrModal";

interface MyTicketsViewProps {
  onBrowseEvents: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ onBrowseEvents }) => {
  const { data: tickets = [], isLoading } = useTickets();
  const [activeQrTicket, setActiveQrTicket] = useState<Ticket | null>(null);

  const { incoming, used } = useMemo(() => partitionTicketsByLifecycle(tickets), [tickets]);

  return (
    <div className="max-w-[1160px] mx-auto px-5 sm:px-10 pt-8 pb-16 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E7E5E0]">
        <div>
          <h1 className="text-[30px] font-semibold text-[#0F1419]">My Tickets</h1>
          <p className="text-[14px] text-[#5C6570] mt-1">
            Tap any pass to reveal your Wallet wallet balance, expiry window, and bar code. Scanned passes trim the
            entry QR stub cleanly into Used Tickets.
          </p>
        </div>
        <Button variant="secondary" onClick={onBrowseEvents}>
          Explore Upcoming Shows
        </Button>
      </div>

      {isLoading
        ? (
          <div className="space-y-5">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-52 rounded-[16px] bg-white border border-[#E7E5E0] animate-pulse"
              />
            ))}
          </div>
        )
        : tickets.length === 0
        ? (
          <div className="bg-white rounded-[14px] border border-[#E7E5E0] p-12 text-center space-y-4">
            <h2 className="text-[20px] font-semibold text-[#0F1419]">No active tickets yet</h2>
            <p className="text-[14px] text-[#5C6570]">
              Select seats for any upcoming recital or club session to generate a mobile pass.
            </p>
            <Button variant="primary" onClick={onBrowseEvents}>
              Browse Events
            </Button>
          </div>
        )
        : (
          <div className="space-y-12">
            {/* Incoming Events Section (Sorted Soonest First) */}
            <section className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2D2A6E]" strokeWidth={1.75} />
                  <h2 className="text-[20px] font-semibold text-[#0F1419]">
                    Incoming Events ({incoming.length})
                  </h2>
                </div>
                <span className="text-[12px] text-[#5C6570]">Sorted by soonest show date</span>
              </div>

              {incoming.length === 0
                ? (
                  <div className="bg-white rounded-[14px] border border-[#E7E5E0] p-8 text-center space-y-3">
                    <p className="text-[14px] text-[#5C6570]">
                      No upcoming unscanned passes. Browse shows to book your next evening.
                    </p>
                    <Button variant="secondary" size="sm" onClick={onBrowseEvents}>
                      Browse Shows
                    </Button>
                  </div>
                )
                : (
                  <motion.div
                    variants={STAGGER_CONTAINER}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                  >
                    {incoming.map((ticket) => (
                      <motion.div key={ticket.id} variants={STAGGER_ITEM}>
                        <PaperTicketCard ticket={ticket} onShowQr={setActiveQrTicket} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
            </section>

            {/* Used & Past Tickets Section */}
            {used.length > 0 && (
              <section className="space-y-5 pt-8 border-t border-[#E7E5E0]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-[#5C6570]" strokeWidth={1.75} />
                    <h2 className="text-[20px] font-semibold text-[#0F1419]">
                      Used &amp; Past Tickets ({used.length})
                    </h2>
                  </div>
                  <span className="text-[12px] text-[#5C6570]">
                    Gate-scanned or expired passes
                  </span>
                </div>

                <motion.div
                  variants={STAGGER_CONTAINER}
                  initial="hidden"
                  animate="show"
                  className="space-y-6"
                >
                  {used.map((ticket) => (
                    <motion.div key={ticket.id} variants={STAGGER_ITEM}>
                      <PaperTicketCard ticket={ticket} onShowQr={setActiveQrTicket} />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}
          </div>
        )}

      <TicketQrModal ticket={activeQrTicket} onClose={() => setActiveQrTicket(null)} />
    </div>
  );
};
