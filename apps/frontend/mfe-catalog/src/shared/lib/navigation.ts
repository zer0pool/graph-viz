/**
 * MFE Navigation Utility
 * Synchronizes internal MFE navigation with the parent Shell.
 */

export const MFE_NAVIGATE_EVENT = "mfe:navigate";

export const mfeNavigate = (path: string) => {
  console.log(`[MFE:mfeNavigate] Navigating to ${path} and notifying shell`);

  // 1. Dispatch custom event for Shell to update its breadcrumbs/sidebar
  const event = new CustomEvent(MFE_NAVIGATE_EVENT, {
    detail: { path },
  });
  window.dispatchEvent(event);
};

/**
 * Hook to use MFE navigation
 */
import { useNavigate } from "react-router-dom";

export const useMfeNavigate = () => {
  const navigate = useNavigate();

  return (path: string) => {
    // Internal MFE transition
    navigate(path);
    // Shell sync
    mfeNavigate(path);
  };
};
