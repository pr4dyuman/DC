import Link from "next/link";

export default function RelatedArticlesSection({
  eyebrow = "Related Articles",
  title = "Keep Building Context",
  description,
  articles = [],
  actionLabel = "Read This Guide",
  className = "",
}) {
  if (!articles.length) {
    return null;
  }

  return (
    <section className={`mb-20 lg:mb-32 ${className}`}>
      <div className="mb-10 max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#F5EE30]"></span>
          <span className="font-glacial-bold text-sm uppercase tracking-widest text-white">{eyebrow}</span>
        </div>
        <h2 className="mb-5 text-3xl font-extrabold uppercase leading-tight md:text-5xl">
          <span className="text-white">{title}</span>
        </h2>
        {description ? (
          <p className="text-base leading-relaxed text-gray-300 md:text-lg">{description}</p>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            className="group flex min-h-[220px] flex-col justify-between border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#F5EE30]/60 hover:bg-[#F5EE30]/[0.06]"
          >
            <span>
              {article.category ? (
                <span className="mb-4 block font-glacial-bold text-xs uppercase tracking-widest text-[#F5EE30]">
                  {article.category}
                </span>
              ) : null}
              <span className="block text-xl font-bold uppercase leading-tight text-white transition-colors group-hover:text-[#F5EE30]">
                {article.title}
              </span>
              <span className="mt-4 block text-sm leading-relaxed text-gray-400">{article.description}</span>
            </span>
            <span className="mt-8 block font-glacial-bold text-sm uppercase tracking-widest text-white transition-colors group-hover:text-[#F5EE30]">
              {actionLabel}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
