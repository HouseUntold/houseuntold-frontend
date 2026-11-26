import type { Transition } from "motion/react";

export const SPRING_SPATIAL: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: SPRING_SPATIAL,
};

export const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: SPRING_SPATIAL,
  },
};
