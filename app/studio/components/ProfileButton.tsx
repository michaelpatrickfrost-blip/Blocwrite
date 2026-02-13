"use client";

type ProfileButtonProps = {
  onClick: () => void;
  "aria-label"?: string;
  title?: string;
};

export function ProfileButton({ onClick, "aria-label": ariaLabel = "Profile", title = "Profile" }: ProfileButtonProps) {
  return (
    <button
      type="button"
      className="pw-profile-round-btn"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    </button>
  );
}
