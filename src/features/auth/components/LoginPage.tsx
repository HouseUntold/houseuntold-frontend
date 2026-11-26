import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../../../components/ui/Button";
import { VenuLogo } from "../../../components/ui/VenuLogo";
import {
  type AdminLoginForm,
  AdminLoginFormSchema,
  type GoogleAuthInput,
  GoogleAuthInputSchema,
  type UserRole,
} from "../../../lib/api/schemas";
import { SPRING_SPATIAL } from "../../../lib/motion/variants";
import { useAuth } from "../hooks/useAuth";

interface LoginPageProps {
  onBackHome: () => void;
  onAuthenticated: (role: UserRole) => void;
  onRequireMfa: (mfaChallengeToken: string, email: string) => void;
  onNotify: (title: string, tone: "success" | "error" | "info") => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackHome,
  onAuthenticated,
  onRequireMfa,
  onNotify,
}) => {
  const { loginGoogle, loginStaffOrAdmin } = useAuth();
  const [googleEmailOpen, setGoogleEmailOpen] = useState(false);

  const googleForm = useForm<GoogleAuthInput>({
    resolver: zodResolver(GoogleAuthInputSchema),
    defaultValues: {
      name: "Arjun Mehta",
      email: "arjun.mehta@gmail.com",
    },
  });

  const credentialsForm = useForm<AdminLoginForm>({
    resolver: zodResolver(AdminLoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleSubmit = async (values: GoogleAuthInput) => {
    try {
      const session = await loginGoogle.mutateAsync(values);
      onNotify(`Signed in as ${session.user.name}`, "success");
      onAuthenticated(session.user.role);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Google sign-in failed", "error");
    }
  };

  const handleCredentialsSubmit = async (values: AdminLoginForm) => {
    try {
      const res = await loginStaffOrAdmin.mutateAsync(values);
      if (res.requires_mfa) {
        onNotify("Credentials verified. Enter 6-digit authenticator code.", "info");
        onRequireMfa(res.mfa_challenge_token, values.email);
        return;
      }
      onNotify(`Signed in · ${res.user.name}`, "success");
      onAuthenticated(res.user.role);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Invalid credentials", "error");
    }
  };

  return (
    <div className="max-w-[460px] mx-auto px-5 py-12 sm:py-16">
      <button
        type="button"
        onClick={onBackHome}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5C6570] hover:text-[#0F1419] mb-6 cursor-pointer active:scale-95 transition-all"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        <span>Back to Home</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_SPATIAL}
        className="bg-white rounded-[14px] border border-[#E7E5E0] shadow-editorial p-7 sm:p-8 space-y-6"
      >
        <div className="space-y-2">
          <VenuLogo />
          <h1 className="text-[26px] font-semibold tracking-tight text-[#0F1419] pt-2">
            Sign in to House Untold
          </h1>
          <p className="text-[14px] text-[#5C6570]">
            Sign in with your assigned ID and password.
          </p>
        </div>

        {/* Role-Blind Credentials Form — Backend determines role */}
        <form onSubmit={credentialsForm.handleSubmit(handleCredentialsSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-[13px] font-medium text-[#0F1419] mb-1.5"
            >
              Email / Login ID
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 text-[#5C6570] absolute left-3.5 top-1/2 -translate-y-1/2"
                strokeWidth={1.75}
              />
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="name@venu.live"
                {...credentialsForm.register("email")}
                className="w-full h-11 pl-10 pr-3.5 rounded-[8px] bg-white border border-[#E7E5E0] text-[14px] text-[#0F1419] focus:outline-none focus:border-[#2D2A6E] focus:ring-[3px] focus:ring-[#2D2A6E]/12"
              />
            </div>
            {credentialsForm.formState.errors.email && (
              <p className="text-[12px] text-[#DC2626] mt-1">
                {credentialsForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-[13px] font-medium text-[#0F1419] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <KeyRound
                className="w-4 h-4 text-[#5C6570] absolute left-3.5 top-1/2 -translate-y-1/2"
                strokeWidth={1.75}
              />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                {...credentialsForm.register("password")}
                className="w-full h-11 pl-10 pr-3.5 rounded-[8px] bg-white border border-[#E7E5E0] text-[14px] text-[#0F1419] focus:outline-none focus:border-[#2D2A6E] focus:ring-[3px] focus:ring-[#2D2A6E]/12"
              />
            </div>
            {credentialsForm.formState.errors.password && (
              <p className="text-[12px] text-[#DC2626] mt-1">
                {credentialsForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={loginStaffOrAdmin.isPending}
          >
            <span>Sign In</span>
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
