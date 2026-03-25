import logoIconDark from "./assets/logo-icon-dark.webp";
import logoIconLight from "./assets/logo-icon-light.webp";
import { cn } from "./lib/cn";

const SIZE_STYLES = {
  sm: {
    gap: "gap-2",
    image: "h-8 w-8 rounded-lg",
    title: "text-sm",
    subtitle: "text-[10px]",
  },
  md: {
    gap: "gap-2.5",
    image: "h-9 w-9 rounded-[10px]",
    title: "text-base",
    subtitle: "text-[11px]",
  },
  lg: {
    gap: "gap-3",
    image: "h-10 w-10 rounded-xl sm:h-11 sm:w-11",
    title: "text-xl",
    subtitle: "text-xs",
  },
};

export default function AppLogo({
  variant = "light",
  size = "md",
  showText = true,
  subtitle,
  className,
  imageClassName,
  titleClassName,
  subtitleClassName,
}) {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.md;
  const src = variant === "dark" ? logoIconDark : logoIconLight;
  const defaultTextColor = variant === "dark" ? "text-slate-900" : "text-white";

  return (
    <div className={cn("flex items-center", styles.gap, className)}>
      <img
        src={src}
        alt="FitControl"
        className={cn("shrink-0 object-cover", styles.image, imageClassName)}
      />
      {showText && (
        <div>
          <div className={cn("font-black", styles.title, defaultTextColor, titleClassName)}>
            FitControl
          </div>
          {subtitle && (
            <div className={cn(styles.subtitle, "text-slate-500", subtitleClassName)}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
