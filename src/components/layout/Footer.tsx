import React from "react";
import type { User } from "../../lib/api/types";
import { VenuLogo } from "../ui/VenuLogo";
import { type AppRoute, homeRouteForRole } from "./TopNav";

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
  user: User | null;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, user }) => {
  return (
    <footer className="border-t border-[#875931]/40 bg-[#360D19] mt-16">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <VenuLogo onClick={() => onNavigate(homeRouteForRole(user))} />
          <span className="text-[13px] text-[#CFB790]">
            © 2026 House Untold. All rights reserved.
          </span>
        </div>
        <div className="text-[13px] text-[#CFB790]">
          Pune · Curated Parties &amp; Budget-Friendly Nights
        </div>
      </div>
    </footer>
  );
};
