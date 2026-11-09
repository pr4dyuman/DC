// Questions and answers that open one at a time (service pages and the
// homepage). The first one starts open. Pair it with FAQPage structured data
// built from the same list (getFaqJsonLd).
export default function FaqList({ items }) {
  return (
    // The section heading above already draws the top line.
    <div className="mt-2 border-b border-white/10">
      {items.map((item, index) => (
        <details key={item.question} open={index === 0} className="group border-b border-white/10 last:border-b-0">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30] [&::-webkit-details-marker]:hidden">
            <h3 className="m-0 text-lg font-bold uppercase leading-snug sm:text-xl">{item.question}</h3>
            <span
              aria-hidden="true"
              className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 text-lg leading-none text-[#F5EE30] transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="m-0 max-w-3xl pb-6 text-base leading-7 text-gray-300">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function getFaqJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
