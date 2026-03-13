import Image from "next/image";

export function HeroCard({
  imageUrl,
  headline,
  subtitle,
  ctaText,
  ctaUrl,
  accentColor,
}: {
  imageUrl?: string;
  headline: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  accentColor?: string;
}) {
  const ctaStyle = accentColor
    ? { backgroundColor: accentColor, color: "#fff" }
    : { backgroundColor: "black", color: "white" };

  const inner = (
    <div className="w-full rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden flex flex-col group transition-transform hover:scale-[1.01] active:scale-[0.99]">
      {imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={imageUrl}
            alt={headline}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 448px"
          />
        </div>
      )}
      <div className={`flex flex-col gap-2 p-5 ${!imageUrl ? "bg-black/[0.02] dark:bg-white/[0.02]" : ""}`}>
        <h2 className="text-base font-bold text-black dark:text-white leading-snug">
          {headline}
        </h2>
        {subtitle && (
          <p className="text-sm text-black/55 dark:text-white/55 leading-relaxed">
            {subtitle}
          </p>
        )}
        {ctaText && (
          <div className="pt-1">
            <span
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity group-hover:opacity-85"
              style={ctaStyle}
            >
              {ctaText}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (ctaUrl) {
    return (
      <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
        {inner}
      </a>
    );
  }

  return <div className="w-full">{inner}</div>;
}
