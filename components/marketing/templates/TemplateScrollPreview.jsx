import Image from "next/image";

// Shows the top of a tall home-page screenshot. Hovering (or focusing a link in)
// the surrounding `group` scrolls slowly to the bottom, like browsing the page.
// The scroll is skipped for visitors who prefer reduced motion.
export default function TemplateScrollPreview({
  image,
  alt,
  sizes,
  priority = false,
  className = "aspect-[16/10]",
}) {
  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover object-top transition-[object-position] duration-[1200ms] ease-out motion-safe:group-focus-within:object-bottom motion-safe:group-focus-within:duration-[7000ms] motion-safe:group-focus-within:ease-linear motion-safe:group-hover:object-bottom motion-safe:group-hover:duration-[7000ms] motion-safe:group-hover:ease-linear"
      />
    </div>
  );
}
