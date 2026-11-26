import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../../components/ui/Button";
import { type AdminMfaInput, AdminMfaInputSchema } from "../../../lib/api/schemas";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";
import { useAuth } from "../hooks/useAuth";

interface AdminMfaPageProps {
  mfaChallengeToken: string | null;
  email: string;
  onBackToLogin: () => void;
  onVerified: () => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

export const AdminMfaPage: React.FC<AdminMfaPageProps> = ({
  mfaChallengeToken,
  email,
  onBackToLogin,
  onVerified,
  onNotify,
}) => {
  const { verifyAdminMfa } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminMfaInput>({
    resolver: zodResolver(AdminMfaInputSchema),
    defaultValues: {
      mfa_challenge_token: mfaChallengeToken ?? "",
      totp_code: "",
    },
  });

  const onSubmit = async (values: AdminMfaInput) => {
    try {
      const session = await verifyAdminMfa.mutateAsync({
        mfa_challenge_token: mfaChallengeToken ?? values.mfa_challenge_token,
        totp_code: values.totp_code,
      });
      onNotify(`Verified · Welcome ${session.user.name}`, "success");
      onVerified();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Invalid TOTP verification code", "error");
    }
  };

  return (
    <div className="max-w-[440px] mx-auto px-5 py-14 sm:py-20">
      <button
        type="button"
        onClick={onBackToLogin}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5C6570] hover:text-[#0F1419] mb-6 cursor-pointer active:scale-95 transition-all"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        <span>Back to Sign In</span>
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING_SPATIAL}
        className="bg-white rounded-[14px] border border-[#E7E5E0] shadow-editorial p-7 sm:p-8 space-y-6"
      >
        <div className="w-11 h-11 rounded-[10px] bg-[#FAFAF7] border border-[#E7E5E0] flex items-center justify-center text-[#2D2A6E]">
          <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
        </div>

        <div className="space-y-1.5">
          <div className="num text-[11px] uppercase tracking-wider text-[#5C6570]">
            Step 2 · Administrator MFA
          </div>
          <h1 className="text-[24px] font-semibold text-[#0F1419]">
            Enter authenticator code
          </h1>
          <p className="text-[14px] text-[#5C6570]">
            Enter the 6-digit TOTP code for{" "}
            <span className="font-medium text-[#0F1419]">{email || "administrator"}</span>.
          </p>
        </div>

        {!mfaChallengeToken
          ? (
            <div className="space-y-4">
              <p className="text-[13px] text-[#DC2626]">
                MFA verification session expired. Please sign in again.
              </p>
              <Button variant="primary" className="w-full" onClick={onBackToLogin}>
                Return to Sign In
              </Button>
            </div>
          )
          : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <input type="hidden" {...register("mfa_challenge_token")} />
              <div>
                <label
                  htmlFor="mfa-totp-code"
                  className="block text-[13px] font-medium text-[#0F1419] mb-1.5"
                >
                  6-Digit TOTP Code
                </label>
                <input
                  id="mfa-totp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="420911"
                  {...register("totp_code")}
                  className="w-full h-12 px-4 rounded-[8px] bg-white border border-[#E7E5E0] text-[18px] num tracking-[0.28em] text-center text-[#0F1419] focus:outline-none focus:border-[#2D2A6E] focus:ring-[3px] focus:ring-[#2D2A6E]/12"
                />
                {errors.totp_code && <p className="text-[12px] text-[#DC2626] mt-1.5">{errors.totp_code.message}</p>}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={verifyAdminMfa.isPending}
              >
                <span>Verify &amp; Continue</span>
              </Button>
            </form>
          )}
      </motion.div>
    </div>
  );
};
