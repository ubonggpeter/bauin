import type { Metadata } from "next";
import LegalLayout, { Section, SubHeading, Ul, Li } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How BAUIN collects, uses, and protects your personal data, including KYC and identity verification.",
};

const TOC = [
  { id: "collect",       label: "1. Data We Collect" },
  { id: "kyc",           label: "2. KYC & Identity Verification" },
  { id: "use",           label: "3. How We Use Your Data" },
  { id: "sharing",       label: "4. Data Sharing" },
  { id: "cookies",       label: "5. Cookies & Tracking" },
  { id: "retention",     label: "6. Data Retention" },
  { id: "rights",        label: "7. Your Rights" },
  { id: "security",      label: "8. Security Measures" },
  { id: "children",      label: "9. Children's Privacy" },
  { id: "changes",       label: "10. Policy Changes" },
  { id: "contact",       label: "11. Contact & DPO" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" effective="1 June 2026" toc={TOC}>

      <Section id="collect" title="1. Data We Collect">
        <SubHeading>Account Data</SubHeading>
        <Ul>
          <Li>Full name, email address, and phone number provided at registration.</Li>
          <Li>Profile photo (optional).</Li>
          <Li>Login credentials (passwords are hashed with bcrypt; never stored in plaintext).</Li>
        </Ul>
        <SubHeading>Financial Data</SubHeading>
        <Ul>
          <Li>Bank account number and bank name for withdrawal processing.</Li>
          <Li>Transaction history: deposits, withdrawals, earnings, and quiz payouts.</Li>
          <Li>BAUIN does not store card details; payment tokenisation is handled by Paystack.</Li>
        </Ul>
        <SubHeading>Usage Data</SubHeading>
        <Ul>
          <Li>Quiz session results, scores, and participation history.</Li>
          <Li>Stories purchased, reviewed, or reported.</Li>
          <Li>Referral network activity and commission events.</Li>
          <Li>Device type, browser, IP address, and approximate location (country/city).</Li>
        </Ul>
      </Section>

      <Section id="kyc" title="2. KYC & Identity Verification">
        <p>
          Nigerian law requires us to verify the identity of members who transact above certain
          thresholds. Our KYC process is designed to be both compliant and privacy-preserving.
        </p>
        <SubHeading>National Identification Number (NIN)</SubHeading>
        <p>
          Your NIN is <strong>cryptographically hashed</strong> before storage using a one-way
          algorithm. BAUIN never stores your raw NIN and cannot reconstruct it from the stored
          hash. The hash is used solely to detect and prevent duplicate account creation.
        </p>
        <SubHeading>Supporting Documents</SubHeading>
        <p>
          Government-issued ID scans and proof-of-address documents are stored in a
          <strong> private, access-controlled cloud storage bucket</strong> (Cloudflare R2).
          These files are never publicly accessible. Admins may access documents only through
          time-limited presigned URLs (1-hour expiry) generated on demand for review purposes.
        </p>
        <SubHeading>BVN Verification</SubHeading>
        <p>
          Bank Verification Number checks are performed via an authorised third-party identity
          provider. BAUIN receives only a verification pass/fail result; we do not store your
          full BVN.
        </p>
      </Section>

      <Section id="use" title="3. How We Use Your Data">
        <Ul>
          <Li>To create and manage your account and verify your identity.</Li>
          <Li>To process payments, withdrawals, and referral commissions.</Li>
          <Li>To deliver quiz content, calculate scores, and distribute prizes.</Li>
          <Li>To detect fraud, abuse, multi-accounting, and prohibited activity.</Li>
          <Li>To send transactional emails (quiz results, payment receipts, security alerts).</Li>
          <Li>To send marketing emails — only with your explicit consent, and always with a one-click unsubscribe link.</Li>
          <Li>To comply with legal and regulatory obligations under Nigerian law.</Li>
          <Li>To improve platform performance and personalise your experience.</Li>
        </Ul>
      </Section>

      <Section id="sharing" title="4. Data Sharing">
        <p>
          BAUIN does not sell your personal data. We share data only in the following limited
          circumstances:
        </p>
        <Ul>
          <Li><strong>Payment processors (Paystack):</strong> Transaction data needed to process payments and withdrawals.</Li>
          <Li><strong>Identity verification providers:</strong> Minimum data required for BVN and NIN validation checks.</Li>
          <Li><strong>Cloud infrastructure providers:</strong> Encrypted data stored on Cloudflare R2 and Vercel infrastructure under strict data-processing agreements.</Li>
          <Li><strong>Legal authorities:</strong> Where required by Nigerian law, court order, or regulatory direction.</Li>
          <Li><strong>Business transfers:</strong> In the event of a merger or acquisition, your data may transfer to the successor entity under equivalent privacy protections.</Li>
        </Ul>
      </Section>

      <Section id="cookies" title="5. Cookies & Tracking">
        <SubHeading>Essential Cookies</SubHeading>
        <p>
          We set session cookies to keep you logged in. These are strictly necessary and cannot be
          disabled without breaking the platform.
        </p>
        <SubHeading>Analytics</SubHeading>
        <p>
          We use privacy-focused analytics to measure page performance. No individual user profiles
          are built from analytics data.
        </p>
        <SubHeading>Marketing Cookies</SubHeading>
        <p>
          We do not currently use third-party advertising cookies. If this changes, we will update
          this policy and seek your consent before deployment.
        </p>
      </Section>

      <Section id="retention" title="6. Data Retention">
        <Ul>
          <Li><strong>Active accounts:</strong> Retained for as long as your account is open.</Li>
          <Li><strong>Closed accounts:</strong> Account data is retained for 7 years to meet Nigerian financial-record-keeping requirements, then securely deleted.</Li>
          <Li><strong>KYC documents:</strong> Retained for 5 years after account closure, or longer if required by law.</Li>
          <Li><strong>Marketing preferences:</strong> Retained until you unsubscribe or withdraw consent.</Li>
          <Li><strong>IP and usage logs:</strong> Rolling 90-day retention for fraud and security purposes.</Li>
        </Ul>
      </Section>

      <Section id="rights" title="7. Your Rights">
        <p>
          Under the Nigeria Data Protection Regulation (NDPR) you have the following rights:
        </p>
        <Ul>
          <Li><strong>Access:</strong> Request a copy of the personal data we hold about you.</Li>
          <Li><strong>Correction:</strong> Ask us to correct inaccurate or incomplete data.</Li>
          <Li><strong>Deletion:</strong> Request deletion of your data where there is no legal basis for retention.</Li>
          <Li><strong>Portability:</strong> Receive your data in a machine-readable format.</Li>
          <Li><strong>Objection:</strong> Object to processing based on legitimate interests.</Li>
          <Li><strong>Withdraw Consent:</strong> Withdraw marketing consent at any time via the unsubscribe link in any email.</Li>
        </Ul>
        <p>
          To exercise any right, email <strong>privacy@bauin.com</strong>. We will respond
          within 30 days.
        </p>
      </Section>

      <Section id="security" title="8. Security Measures">
        <Ul>
          <Li>All data in transit is encrypted using TLS 1.2 or higher.</Li>
          <Li>Passwords are hashed using bcrypt with a high work factor.</Li>
          <Li>NIN data is stored as a one-way cryptographic hash.</Li>
          <Li>KYC documents are stored in private, access-controlled cloud storage with no public URL.</Li>
          <Li>Admin access to sensitive data requires multi-factor authentication.</Li>
          <Li>We conduct regular security reviews and penetration tests.</Li>
        </Ul>
        <p>
          Despite these measures, no system is fully immune to breach. If a breach occurs that
          materially affects your data, we will notify you and the relevant authority within the
          timeframes required by Nigerian law.
        </p>
      </Section>

      <Section id="children" title="9. Children's Privacy">
        <p>
          BAUIN is strictly for users aged 18 and over. We do not knowingly collect data from
          anyone under 18. If we discover that a user is underage, their account will be
          immediately suspended and their data deleted. If you believe a minor has created an
          account, contact us at <strong>privacy@bauin.com</strong>.
        </p>
      </Section>

      <Section id="changes" title="10. Policy Changes">
        <p>
          We may update this Privacy Policy periodically. Material changes will be communicated by
          in-platform notification and email at least 7 days before taking effect. The "Effective
          date" at the top of this page reflects the most recent revision.
        </p>
      </Section>

      <Section id="contact" title="11. Contact & DPO">
        <p>
          For privacy questions, data requests, or to reach our Data Protection Officer:
        </p>
        <p className="bg-gray-50 rounded-lg p-4 text-sm">
          Email: <strong>privacy@bauin.com</strong><br />
          Subject line: <em>"Privacy / NDPR Request"</em><br /><br />
          BAUIN Platform Ltd. · Lagos, Nigeria
        </p>
      </Section>

    </LegalLayout>
  );
}
