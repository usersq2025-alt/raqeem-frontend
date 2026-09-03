import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type ButtonVariant = "primary" | "secondary";

const baseClass =
  "inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-base font-bold disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none";

const variants: Record<ButtonVariant, string> = {
  primary: "btn-sticker bg-primary-orange text-white",
  secondary: "btn-sticker-secondary bg-white text-primary-orange",
};

type CommonProps = {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
};

type ButtonAsLink = CommonProps & {
  href: ComponentProps<typeof Link>["href"];
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

type ButtonAsButton = CommonProps & {
  href?: never;
} & Omit<ComponentProps<"button">, "className" | "children">;

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  children,
  fullWidth = false,
  ...props
}: ButtonAsLink | ButtonAsButton) {
  const classes = cx(
    baseClass,
    fullWidth ? "" : "md:w-auto md:min-w-[260px]",
    variants[variant],
    className
  );

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  const { type, ...rest } = buttonProps;
  return (
    <button type={type ?? "button"} className={classes} {...rest}>
      {children}
    </button>
  );
}

export function RocketIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cx("h-5 w-5", className)}
      aria-hidden="true"
    >
      <path
        d="M12.5 3.5c2.8 1.4 5.2 4.2 6 7.8-2.2.4-4.6-.2-6.5-1.6-1.4-1.9-2-4.3-1.6-6.5.7.1 1.4.2 2.1.3Z"
        fill="currentColor"
      />
      <path
        d="M9.2 9.8 5 14l2.2.8.8 2.2 4.2-4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 16.8 4.5 19.5M8.6 18.6 6.8 20.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="14.2" cy="8.4" r="1.15" fill="white" />
    </svg>
  );
}

export function DoorIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cx("h-5 w-5", className)}
      aria-hidden="true"
    >
      <path
        d="M8 4.5h8.5A1.5 1.5 0 0 1 18 6v12.5A1.5 1.5 0 0 1 16.5 20H8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 4.5v15.5H6.2A1.2 1.2 0 0 1 5 18.8V5.7A1.2 1.2 0 0 1 6.2 4.5H8Z"
        fill="currentColor"
      />
      <circle cx="14.3" cy="12.2" r="1" fill="currentColor" />
    </svg>
  );
}
