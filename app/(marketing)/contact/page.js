import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import ButtonLink from "@/components/marketing/ui/ButtonLink";
import PageHero from "@/components/marketing/ui/PageHero";
import { PageSection } from "@/components/marketing/ui/PageSection";
import { getMarketingWhatsAppHref } from "@/lib/marketing-contact";
import {
  MARKETING_EMAIL,
  MARKETING_PHONE,
  MARKETING_PHONE_E164,
  getMarketingContactPageJsonLd,
  serializeMarketingJsonLd,
} from "@/lib/marketing-seo";

import ContactForm from "./ContactForm";

// Metadata is in ./layout.js. Links can pre-fill the form's message with
// ?service=, ?intent=plan or ?template= (see ContactForm).
const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/digitalcorvids/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/digital-corvids/" },
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61571171168177" },
];

const nextSteps = [
  "We reply within 24 hours with any questions.",
  "We send a free plan for your goals, with a clear price.",
  "Once you approve it, we get started.",
];

export default function ContactPage() {
  const whatsappHref = getMarketingWhatsAppHref("/contact");
  const details = [
    { icon: Phone, label: MARKETING_PHONE, href: `tel:${MARKETING_PHONE_E164}` },
    { icon: MessageCircle, label: "Chat on WhatsApp", href: whatsappHref, external: true },
    { icon: Mail, label: MARKETING_EMAIL, href: `mailto:${MARKETING_EMAIL}` },
    { icon: MapPin, label: "Malviya Nagar, Jaipur, Rajasthan" },
    { icon: Clock, label: "We reply within 24 hours" },
  ];

  return (
    <main className="bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketingJsonLd(getMarketingContactPageJsonLd()) }}
      />

      <PageHero
        eyebrow="Contact Us"
        title="Let's Talk"
        intro={
          <p className="m-0">
            Tell us about your business and what you want to achieve, whether that is more customers, a new website or
            better ads. We usually reply within 24 hours.
          </p>
        }
        actions={
          <>
            <ButtonLink href={whatsappHref} external>
              Chat on WhatsApp
            </ButtonLink>
            <ButtonLink href={`tel:${MARKETING_PHONE_E164}`} variant="secondary">
              Call {MARKETING_PHONE}
            </ButtonLink>
          </>
        }
      />

      <PageSection labelledBy="contact-form-heading" bordered={false}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-16">
          <div>
            <p className="m-0 font-glacial-bold text-xs uppercase tracking-[0.35em] text-[#F5EE30] sm:text-sm">Send A Message</p>
            <h2 id="contact-form-heading" className="mt-4 text-3xl font-bold uppercase leading-none sm:text-4xl">
              Tell Us About Your Project
            </h2>
            <ContactForm className="mt-10" />
          </div>

          <aside aria-label="Other ways to reach us" className="flex flex-col gap-6">
            <div className="border border-white/10 bg-white/[0.03] p-6 sm:p-7">
              <h2 className="m-0 text-xl font-bold uppercase">Reach Us Directly</h2>
              <ul className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
                {details.map(({ icon: Icon, label, href, external }) => (
                  <li key={label} className="flex items-start gap-3 text-base leading-6 text-gray-300">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#F5EE30]" aria-hidden="true" />
                    {href ? (
                      <a
                        href={href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={`break-all transition-colors hover:text-white ${focusRing}`}
                      >
                        {label}
                        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                      </a>
                    ) : (
                      <span>{label}</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Follow us</p>
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
                  {socialLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:text-[#F5EE30] ${focusRing}`}
                      >
                        {link.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-[#F5EE30] p-6 text-black sm:p-7">
              <h2 className="m-0 text-xl font-bold uppercase">What Happens Next</h2>
              <ol className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
                {nextSteps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-base leading-6">
                    <span className="font-suifak text-2xl leading-none">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </PageSection>
    </main>
  );
}
