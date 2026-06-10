import CookieSettingsButton from "@/components/marketing/CookieSettingsButton";
import { buildMarketingMetadata, MARKETING_EMAIL } from "@/lib/marketing-seo";

export const metadata = buildMarketingMetadata({
  title: "Privacy & Cookies | Digital Corvids",
  description:
    "Learn how Digital Corvids uses personal information, essential storage, and optional analytics technologies.",
  path: "/privacy",
});

const sectionClassName = "space-y-4 border-t border-white/15 pt-8";
const headingClassName = "font-suifak text-3xl text-white sm:text-4xl";
const paragraphClassName = "font-glacial leading-7 text-gray-300";

export default function PrivacyPage() {
  return (
    <main className="bg-black px-6 py-16 text-white sm:py-24">
      <article className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-5">
          <p className="font-glacial-bold text-sm uppercase tracking-[0.24em] text-[#F5EE30]">
            Last updated June 11, 2026
          </p>
          <h1 className="font-suifak text-5xl sm:text-7xl">Privacy &amp; Cookies</h1>
          <p className={`${paragraphClassName} max-w-3xl text-lg`}>
            This page explains the information Digital Corvids collects through this website,
            why we collect it, and the choices available to you.
          </p>
          <CookieSettingsButton />
        </header>

        <section className={sectionClassName}>
          <h2 className={headingClassName}>Information you provide</h2>
          <p className={paragraphClassName}>
            When you contact us, subscribe to updates, create an account, or use our services,
            we process the information you submit, such as your name, email address, phone
            number, company details, message, and account information. We use it to respond,
            provide requested services, secure accounts, and operate the website.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className={headingClassName}>Essential storage</h2>
          <p className={paragraphClassName}>
            Essential cookies and browser storage support functions you request and cannot be
            disabled through our analytics controls. They include authentication and security
            cookies, a contact-form device identifier used for abuse prevention, your cookie
            consent choice, and your light or dark appearance preference.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/15">
            <table className="w-full min-w-[620px] text-left font-glacial text-sm">
              <thead className="bg-white/10 text-white">
                <tr>
                  <th className="px-4 py-3">Storage</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Typical duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-gray-300">
                <tr>
                  <td className="px-4 py-3">Authentication and security cookies</td>
                  <td className="px-4 py-3">Sign-in, session security, and requested integrations</td>
                  <td className="px-4 py-3">Session-specific or up to 24 hours</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Contact device cookie</td>
                  <td className="px-4 py-3">Prevents repeated or abusive form submissions</td>
                  <td className="px-4 py-3">Up to 180 days</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Consent and theme preferences</td>
                  <td className="px-4 py-3">Remembers your privacy choice and appearance</td>
                  <td className="px-4 py-3">Consent: up to 180 days; theme: until removed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className={headingClassName}>Optional analytics</h2>
          <p className={paragraphClassName}>
            With your permission, we use Google Analytics, Vercel Analytics, and Vercel Speed
            Insights to understand visits, interactions, and website performance. Google
            Analytics may set first-party cookies such as <code>_ga</code>. Vercel Analytics
            and Speed Insights are configured as privacy-focused, cookieless tools. None of
            these analytics tools load or receive events from this site unless you allow
            analytics.
          </p>
          <p className={paragraphClassName}>
            You can reject analytics on your first visit or reopen Cookie settings at any time.
            Rejecting or withdrawing consent stops future analytics events and removes readable
            Google Analytics cookies from this website.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className={headingClassName}>Sharing and retention</h2>
          <p className={paragraphClassName}>
            We share information only with service providers needed to host, secure, analyze,
            communicate through, and operate the website, or when required by law. We retain
            information only as long as reasonably necessary for the purpose it was collected,
            legal obligations, security, and dispute resolution.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className={headingClassName}>Your choices</h2>
          <p className={paragraphClassName}>
            You may ask about, correct, or request deletion of personal information we hold,
            subject to applicable law and legitimate retention needs. You may also withdraw
            analytics consent at any time using Cookie settings.
          </p>
        </section>

        <section className={sectionClassName}>
          <h2 className={headingClassName}>Contact us</h2>
          <p className={paragraphClassName}>
            For privacy questions or requests, email{" "}
            <a
              href={`mailto:${MARKETING_EMAIL}`}
              className="text-[#F5EE30] underline underline-offset-4 hover:text-white"
            >
              {MARKETING_EMAIL}
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
