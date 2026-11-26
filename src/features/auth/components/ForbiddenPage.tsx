import { ArrowLeft, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import { Button } from "../../../components/ui/Button";
import type { UserRole } from "../../../lib/api/types";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";

interface ForbiddenPageProps {
  currentRole?: UserRole;
  requiredRoles?: UserRole[];
  onReturnHome: () => void;
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({
  currentRole,
  requiredRoles,
  onReturnHome,
}) => {
  return (
    <div className="max-w-[560px] mx-auto px-5 py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_SPATIAL}
        className="bg-white rounded-[14px] border border-[#E7E5E0] shadow-editorial p-8 space-y-6"
      >
        <div className="w-11 h-11 rounded-[10px] bg-[#FEE2E2]/70 border border-[#DC2626]/25 flex items-center justify-center text-[#DC2626]">
          <ShieldAlert className="w-5 h-5" strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <div className="num text-[12px] font-semibold uppercase tracking-wider text-[#DC2626]">
            403 · Access Forbidden
          </div>
          <h1 className="text-[26px] font-semibold text-[#0F1419]">
            You don’t have permission to view this page
          </h1>
          <p className="text-[14px] text-[#5C6570] leading-relaxed">
            Your signed-in role <span className="num font-semibold text-[#0F1419]">{currentRole ?? "USER"}</span>{" "}
            is not authorized for this route
            {requiredRoles && requiredRoles.length > 0
              ? (
                <>
                  {" "}
                  (requires{" "}
                  <span className="num font-semibold text-[#0F1419]">
                    {requiredRoles.join(" or ")}
                  </span>
                  )
                </>
              )
              : null}
            .
          </p>
        </div>

        <Button variant="primary" size="lg" onClick={onReturnHome}>
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Return to Home</span>
        </Button>
      </motion.div>
    </div>
  );
};
