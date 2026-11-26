import { LogOut, Mail, Phone, ShieldCheck, Ticket as TicketIcon } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import { Button } from "../../../components/ui/Button";
import type { User } from "../../../lib/api/types";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";
import { useAuth } from "../hooks/useAuth";

interface AccountPageProps {
  user: User;
  onOpenTickets: () => void;
  onOpenWorkspace: () => void;
  onSignedOut: () => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  user,
  onOpenTickets,
  onOpenWorkspace,
  onSignedOut,
  onNotify,
}) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      onNotify("Signed out cleanly.", "info");
      onSignedOut();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Sign-out failed", "error");
    }
  };

  return (
    <div className="max-w-[720px] mx-auto px-5 sm:px-10 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_SPATIAL}
        className="bg-white rounded-[14px] border border-[#E7E5E0] shadow-card p-7 sm:p-9 space-y-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#E7E5E0]">
          <div>
            <div className="num text-[11px] uppercase tracking-wider text-[#5C6570]">
              Verified Account
            </div>
            <h1 className="text-[28px] font-semibold text-[#0F1419] mt-1">{user.name}</h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[#E7E5E0] text-[13px] font-medium text-[#5C6570] hover:text-[#DC2626] hover:border-[#DC2626]/40 cursor-pointer active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-4 rounded-[12px] bg-[#FAFAF7] border border-[#E7E5E0] space-y-1">
            <div className="flex items-center gap-1.5 text-[12px] text-[#5C6570]">
              <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Email</span>
            </div>
            <div className="text-[14px] font-medium text-[#0F1419]">{user.email}</div>
          </div>

          <div className="p-4 rounded-[12px] bg-[#FAFAF7] border border-[#E7E5E0] space-y-1">
            <div className="flex items-center gap-1.5 text-[12px] text-[#5C6570]">
              <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Mobile Delivery</span>
            </div>
            <div className="num text-[14px] font-medium text-[#0F1419]">{user.phone}</div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[13px] text-[#0F766E]">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
            <span>Active JWT session with HTTP-only refresh rotation</span>
          </div>

          {user.role === "USER"
            ? (
              <Button variant="primary" size="lg" onClick={onOpenTickets}>
                <TicketIcon className="w-4 h-4" strokeWidth={1.75} />
                <span>Open My Tickets</span>
              </Button>
            )
            : (
              <Button variant="primary" size="lg" onClick={onOpenWorkspace}>
                <span>
                  Open {user.role === "ADMIN"
                    ? "Admin Console"
                    : user.role === "SCANNER"
                    ? "Gate Scanner"
                    : "Bartender POS"}
                </span>
              </Button>
            )}
        </div>
      </motion.div>
    </div>
  );
};
