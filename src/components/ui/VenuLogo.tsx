import React from "react";

interface VenuLogoProps {
  onClick?: () => void;
}

export const VenuLogo: React.FC<VenuLogoProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 text-left group whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F1DAA5] rounded-md"
      aria-label="House Untold Home"
    >
      <img
        src="/assets/images/Logo.jpeg"
        alt=""
        aria-hidden="true"
        className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 brightness-125 contrast-110"
      />
      <span className="font-[Space_Grotesk] text-[20px] sm:text-[22px] font-semibold tracking-[-0.02em] text-[#F1DAA5]">
        House Untold
      </span>
    </button>
  );
};
