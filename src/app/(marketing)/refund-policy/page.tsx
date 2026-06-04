import type { Metadata } from "next";
import LegalLayout, { Section, SubHeading, Ul, Li } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "BAUIN refund policy for certification fees, story purchases, quiz entry fees, and bet stakes.",
};

const TOC = [
  { id: "certification",   label: "1. Certification Fees" },
  { id: "story",           label: "2. Story Purchases" },
  { id: "quiz",            label: "3. Quiz Entry Fees" },
  { id: "bets",            label: "4. Bet Stakes" },
  { id: "platform-errors", label: "5. Platform Errors" },
  { id: "fraud",           label: "6. Fraud & Chargebacks" },
  { id: "process",         label: "7. How to Request a Refund" },
  { id: "contact",         label: "8. Contact" },
];

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy" effective="1 June 2026" toc={TOC}>

      <Section id="certification" title="1. Certification Fees">
        <p>
          Certification fees are charged when a member registers under a paid income category and
          unlocks their certification exam.
        </p>
        <SubHeading>Before Exam Attempt</SubHeading>
        <p>
          If you have paid the certification fee but have <strong>not yet attempted</strong> the
          exam, you may request a full refund within <strong>7 days</strong> of payment. After 7
          days, certification fees are non-refundable regardless of exam status.
        </p>
        <SubHeading>After Exam Attempt</SubHeading>
        <p>
          Once you have started the certification exam, the fee is <strong>non-refundable</strong>,
          regardless of your result. Failed candidates may re-attempt the exam (a re-attempt fee
          may apply) but are not entitled to a refund of the original certification fee.
        </p>
        <SubHeading>Upgrade Fees</SubHeading>
        <p>
          Fees paid to upgrade to a higher income category are non-refundable once the upgrade
          has been processed and the new category features have been activated on your account.
        </p>
      </Section>

      <Section id="story" title="2. Story Purchases">
        <p>
          Story purchases are subject to a <strong>24-hour cooling-off period</strong> from the
          time of purchase.
        </p>
        <Ul>
          <Li>If you request a refund within 24 hours and have <strong>not read beyond the first chapter</strong>, a full refund will be issued to your BAUIN wallet within 24 hours.</Li>
          <Li>If you have read more than the first chapter, a refund will not be granted as the content has been substantially consumed.</Li>
          <Li>After 24 hours, story purchases are final and non-refundable.</Li>
          <Li>If a story is removed from the platform by BAUIN for policy violations, affected purchasers will receive a full wallet credit automatically.</Li>
        </Ul>
      </Section>

      <Section id="quiz" title="3. Quiz Entry Fees">
        <p>
          Quiz entry fees are pooled to fund prizes for that session. Refund eligibility depends
          on session status:
        </p>
        <Ul>
          <Li><strong>Before session starts:</strong> Full refund available if you withdraw before the quiz host opens the session for play.</Li>
          <Li><strong>After session starts:</strong> Entry fees are non-refundable once the quiz session transitions to "In Progress" status.</Li>
          <Li><strong>Cancelled session:</strong> If the host cancels before play begins, all entry fees are automatically refunded to participants' wallets within 24 hours.</Li>
          <Li><strong>Technical failure:</strong> If a session cannot be closed due to a platform error, all entry fees are refunded within 72 hours (see Section 5).</Li>
        </Ul>
      </Section>

      <Section id="bets" title="4. Bet Stakes">
        <p>
          Bet stakes placed on quiz outcomes are held in escrow until the session ends.
        </p>
        <Ul>
          <Li><strong>Before session starts:</strong> You may cancel a placed bet and receive a full refund to your wallet up to the moment the session starts.</Li>
          <Li><strong>After session starts:</strong> Bet stakes are <strong>non-refundable</strong> once the quiz session begins, regardless of outcome.</Li>
          <Li><strong>Platform error:</strong> If a betting session cannot be resolved due to a technical fault, all stakes are refunded automatically.</Li>
        </Ul>
        <p>
          Winnings from bets are credited within 1 hour of session close. If you believe a
          payout was miscalculated, contact support within 48 hours of session close.
        </p>
      </Section>

      <Section id="platform-errors" title="5. Platform Errors">
        <p>
          BAUIN takes full responsibility for refunds caused by verifiable platform or technical
          failures, including:
        </p>
        <Ul>
          <Li>Duplicate charges caused by payment gateway errors.</Li>
          <Li>Quiz sessions that start but cannot close due to server failure.</Li>
          <Li>Incorrect prize or commission calculations due to a verified platform bug.</Li>
          <Li>Unauthorised transactions on your account (subject to security investigation).</Li>
        </Ul>
        <p>
          Platform-error refunds are processed within <strong>72 hours</strong> once verified.
          They are credited to your BAUIN wallet or, at your request, returned to your bank
          account.
        </p>
      </Section>

      <Section id="fraud" title="6. Fraud & Chargebacks">
        <p>
          Initiating a payment chargeback through your bank or card provider without first
          contacting BAUIN support is a violation of these Terms. Chargeback abuse may result in:
        </p>
        <Ul>
          <Li>Immediate suspension of your account.</Li>
          <Li>Forfeiture of any wallet balance pending the chargeback investigation.</Li>
          <Li>A permanent ban if fraud is confirmed.</Li>
        </Ul>
        <p>
          We encourage all users to resolve disputes through our support channel first. We
          respond to all refund requests within 2 business days.
        </p>
      </Section>

      <Section id="process" title="7. How to Request a Refund">
        <p>To request a refund, follow these steps:</p>
        <Ul>
          <Li><strong>Step 1:</strong> Log in to your account and navigate to Dashboard → Wallet → Transaction History.</Li>
          <Li><strong>Step 2:</strong> Find the relevant transaction and tap "Request Refund" if the option is available, or note the Transaction ID.</Li>
          <Li><strong>Step 3:</strong> Email <strong>support@bauin.com</strong> with your Transaction ID, account email, and reason for the request.</Li>
          <Li><strong>Step 4:</strong> Our team will review and respond within 2 business days.</Li>
        </Ul>
        <p>
          Approved refunds are credited to your BAUIN wallet by default. Bank account refunds
          are available on request but may take an additional 1–3 business days.
        </p>
      </Section>

      <Section id="contact" title="8. Contact">
        <p className="bg-gray-50 rounded-lg p-4 text-sm">
          Email: <strong>support@bauin.com</strong><br />
          Subject line: <em>"Refund Request — [Transaction ID]"</em><br /><br />
          BAUIN Platform Ltd. · Lagos, Nigeria
        </p>
      </Section>

    </LegalLayout>
  );
}
