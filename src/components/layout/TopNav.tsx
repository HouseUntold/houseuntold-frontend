import { Calendar, LogIn, MapPin, Scissors, ShieldCheck, Ticket as TicketIcon, User as UserIcon } from "lucide-react";
import React from "react";
import type { User } from "../../lib/api/types";
import { Button } from "../ui/Button";
import { VenuLogo } from "../ui/VenuLogo";

export type AppRoute =
  | { name: "home" }
  | { name: "events" }
  | { name: "event-detail"; eventId: string }
  | { name: "seat-map"; eventId: string }
  | { name: "attendees"; eventId: string }
  | { name: "payment"; eventId: string }
  | { name: "login" }
  | { name: "admin-mfa" }
  | { name: "account" }
  | { name: "tickets" }
  | { name: "scan" }
  | { name: "counter" }
  | { name: "admin" }
  | { name: "forbidden" };

interface TopNavProps {
  onNavigate: (route: AppRoute) => void;
  user: User | null;
}

export function homeRouteForRole(user: User | null): AppRoute {
  if (!user) return { name: "home" };
  if (user.role === "SCANNER") return { name: "scan" };
  if (user.role === "BARTENDER") return { name: "counter" };
  if (user.role === "ADMIN") return { name: "admin" };
  return { name: "events" };
}

export const TopNav: React.FC<TopNavProps> = ({ onNavigate, user }) => {
  const logoDestination = homeRouteForRole(user);

  const navLinks = (): Array<{ label: string; route: AppRoute; icon?: React.ReactNode }> => {
    if (!user) {
      return [
        {
          label: "Events",
          route: { name: "events" },
          icon: <Calendar className="w-4 h-4" strokeWidth={1.75} />,
        },
      ];
    }
    if (user.role === "USER") {
      return [
        {
          label: "Events",
          route: { name: "events" },
          icon: <Calendar className="w-4 h-4" strokeWidth={1.75} />,
        },
        {
          label: "My Tickets",
          route: { name: "tickets" },
          icon: <TicketIcon className="w-4 h-4" strokeWidth={1.75} />,
        },
      ];
    }
    if (user.role === "SCANNER") {
      return [
        {
          label: "Gate Scanner",
          route: { name: "scan" },
          icon: <Scissors className="w-4 h-4" strokeWidth={1.75} />,
        },
      ];
    }
    if (user.role === "BARTENDER") {
      return [
        {
          label: "Bar Counter",
          route: { name: "counter" },
          icon: <MapPin className="w-4 h-4" strokeWidth={1.75} />,
        },
      ];
    }
    if (user.role === "ADMIN") {
      return [
        {
          label: "Admin Console",
          route: { name: "admin" },
          icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />,
        },
      ];
    }
    return [];
  };

  const links = navLinks();

  return (
    <header className="sticky top-0 z-40 bg-[#360D19]/95 backdrop-blur-sm border-b border-[#875931]/40">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 h-16 flex items-center justify-between gap-6">
        <VenuLogo onClick={() => onNavigate(logoDestination)} />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {links.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.route)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-[#F1DAA5] hover:text-[#CFB790] hover:bg-[#5B342E]/70 cursor-pointer active:scale-95 transition-all"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          {user
            ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate({ name: "account" })}
                className="!bg-[#5B342E] !text-[#F1DAA5] !border-[#875931] hover:!bg-[#875931] hover:!text-[#F1DAA5]"
              >
                <UserIcon className="w-4 h-4 text-[#F1DAA5]" strokeWidth={1.75} />
                <span className="max-w-[130px] truncate">{user.name.split(" ")[0]}</span>
              </Button>
            )
            : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate({ name: "login" })}
                className="!bg-[#F1DAA5] !text-[#360D19] hover:!bg-[#CFB790]"
              >
                <LogIn className="w-4 h-4" strokeWidth={1.75} />
                <span>Login</span>
              </Button>
            )}
        </div>
      </div>
    </header>
  );
};
