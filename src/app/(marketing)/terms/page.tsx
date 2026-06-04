import type { Metadata } from "next";
import LegalLayout, { Section, SubHeading, Ul, Li } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "BAUIN platform terms of service — quiz format, referral programme, escrow, betting rules, and governing law.",
};

const TOC = [
  { id: "overview",          label: "1. Platform Overview" },
  { id: "eligibility",       label: "2. Eligibility" },
  { id: "quiz-format",       label: "3. A–D Quiz Format" },
  { id: "memory-game",       label: "4. 5-Phase Memory Game" },
  { id: "referral",          label: "5. Referral Programme" },
  { id: "auto-approval",     label: "6. Auto-Approval" },
  { id: "escrow",            label: "7. Escrow Policy" },
  { id: "betting",           label: "8. Betting (18+)" },
  { id: "payments",          label: "9. Payments & Withdrawals" },
  { id: "prohibited",        label: "10. Prohibited Activities" },
  { id: "ip",                label: "11. Intellectual Property" },
  { id: "governing-law",     label: "12. Governing Law" },
  { id: "amendments",        label: "13. Amendments" },
  { id: "contact",           label: "14. Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" effective="1 June 2026" toc={TOC}>

      <Section id="overview" title="1. Platform Overview">
        <p>
          BAUIN (Billionaires AI Users Income Network) is a Nigerian digital-income platform that
          allows members to earn through certified AI productivity tasks, a two-tier referral
          network, live interactive quiz competitions, story publishing, and peer-to-peer quiz
          betting. By creating an account or using any BAUIN service you agree to these Terms in
          full.
        </p>
        <p>
          BAUIN is operated by BAUIN Platform Ltd., incorporated under the laws of Nigeria. Our
          registered address and company number are available upon request via the contact details
          in Section&nbsp;14.
        </p>
      </Section>

      <Section id="eligibility" title="2. Eligibility">
        <Ul>
          <Li>You must be at least <strong>18 years old</strong> to register or use any paid feature.</Li>
          <Li>You must provide accurate identity information during KYC. NIN data is hashed before storage; BAUIN never retains your raw NIN.</Li>
          <Li>One account per person. Duplicate accounts will be merged or terminated.</Li>
          <Li>You must hold a valid Nigerian bank account to receive withdrawals.</Li>
          <Li>Employees and immediate family members of BAUIN Platform Ltd. are not eligible to participate in prize competitions.</Li>
        </Ul>
      </Section>

      <Section id="quiz-format" title="3. A–D Quiz Format">
        <p>
          BAUIN's primary competition mode presents multiple-choice questions with <strong>four
          answer options labelled A, B, C, and D</strong>. Each question carries a time limit set
          by the quiz host. Correct answers earn points; partial credit is not awarded.
        </p>
        <SubHeading>Question Phases</SubHeading>
        <p>
          A standard quiz session consists of <strong>five sequential phases</strong>. Each phase
          contains a set of questions on a themed topic. Players must complete Phase&nbsp;1 before
          advancing to Phase&nbsp;2, and so on. Phase scores are cumulative.
        </p>
        <SubHeading>Scoring</SubHeading>
        <Ul>
          <Li>Base score per correct answer is set by the quiz host (typically 10–100 points).</Li>
          <Li>A speed bonus may be added for answers submitted in the first third of the time window.</Li>
          <Li>A maximum session score of 500 points is used for platform rating calculations (100 pts × 5 phases).</Li>
        </Ul>
        <SubHeading>Disqualification</SubHeading>
        <p>
          Submitting answers via automated means, using external assistance, or exploiting timing
          vulnerabilities will result in immediate score nullification and account suspension.
        </p>
      </Section>

      <Section id="memory-game" title="4. 5-Phase Memory Game">
        <p>
          The 5-Phase Memory Game is a separate interactive story mode embedded in BAUIN episodes.
          It tests a player's recall of story content across five structured phases:
        </p>
        <Ul>
          <Li><strong>Phase 1 — Introduction Recall:</strong> Questions covering characters and setting introduced in the opening of the episode.</Li>
          <Li><strong>Phase 2 — Plot Points:</strong> Questions on key events in the first half of the story.</Li>
          <Li><strong>Phase 3 — Mid-Story Details:</strong> Questions testing finer details and dialogue.</Li>
          <Li><strong>Phase 4 — Cause & Effect:</strong> Questions on story logic and character motivations.</Li>
          <Li><strong>Phase 5 — Resolution:</strong> Questions on the story's conclusion and outcomes.</Li>
        </Ul>
        <p>
          Each phase must be completed in order. Players who exit early receive a score only for
          completed phases. The completion rate across all five phases contributes to the story's
          overall platform rating.
        </p>
      </Section>

      <Section id="referral" title="5. Referral Programme">
        <p>
          BAUIN operates a two-tier referral network that rewards members for growing the platform
          community.
        </p>
        <SubHeading>Commission Structure</SubHeading>
        <Ul>
          <Li><strong>50% Direct Referral:</strong> When a member you directly referred completes a paid certification or purchase, you earn 50% of the applicable referral commission pool.</Li>
          <Li><strong>10% Indirect Referral:</strong> When a second-level recruit (someone referred by your direct referral) converts, you earn 10% of the referral commission for that conversion.</Li>
          <Li><strong>30% Distributor / Collection Host:</strong> Certified distributors who host quiz collections earn 30% of the entry-fee revenue generated by their collections each session.</Li>
        </Ul>
        <SubHeading>Referral Eligibility</SubHeading>
        <Ul>
          <Li>Referrals must be new, unique users who register via your personal referral link.</Li>
          <Li>Self-referral (registering a second account with your own link) is prohibited and will result in forfeiture of all referral earnings and account suspension.</Li>
          <Li>Referral commissions are credited to your BAUIN wallet within 24 hours of the qualifying event.</Li>
          <Li>BAUIN reserves the right to withhold commissions pending fraud review.</Li>
        </Ul>
      </Section>

      <Section id="auto-approval" title="6. Auto-Approval">
        <p>
          Certain platform actions are processed automatically without manual review. These include
          but are not limited to:
        </p>
        <Ul>
          <Li>Automated task completion credits once AI-validated conditions are met.</Li>
          <Li>Referral bonus credits triggered upon qualifying registration events.</Li>
          <Li>Quiz entry and prize distribution at session close.</Li>
        </Ul>
        <p>
          BAUIN administrators retain the ability to pause or resume auto-approval at any time for
          platform integrity purposes. When auto-approval is paused, transactions will queue for
          manual processing. Users will be notified of any material delay exceeding 48 hours.
        </p>
        <p>
          <strong>Affiliate approvals always require human review</strong> and are never processed
          automatically.
        </p>
      </Section>

      <Section id="escrow" title="7. Escrow Policy">
        <p>
          BAUIN holds certain funds in escrow to protect both buyers and sellers during story
          transactions and quiz sessions.
        </p>
        <SubHeading>Story Purchases</SubHeading>
        <p>
          When a buyer purchases a story, the purchase amount is held in escrow for a cooling-off
          period of <strong>24 hours</strong>. After that period, funds are released to the author's
          BAUIN wallet minus the platform commission. If a valid refund request is raised within
          the cooling-off period, the amount is returned to the buyer's wallet.
        </p>
        <SubHeading>Quiz Entry Fees</SubHeading>
        <p>
          Entry fees collected before a quiz session starts are pooled in escrow. Upon session
          close, the pool is automatically distributed according to the prize schedule in these
          Terms and in the Quiz Rules page. In the event of a technical failure preventing session
          close, BAUIN will refund all entry fees within 72 hours.
        </p>
        <SubHeading>Betting Stakes</SubHeading>
        <p>
          All bet stakes are held in escrow from placement until the relevant quiz session ends.
          Stakes are non-refundable once a session begins, except in the event of a platform error.
        </p>
      </Section>

      <Section id="betting" title="8. Betting (18+)">
        <p>
          BAUIN offers a peer-to-peer quiz betting feature. <strong>Participation in betting
          is strictly limited to users aged 18 or older.</strong> By placing a bet you confirm
          you meet this requirement.
        </p>
        <Ul>
          <Li>Betting is available only on live or scheduled quiz sessions.</Li>
          <Li>The platform does not act as a bookmaker. All odds and outcomes are peer-determined.</Li>
          <Li>Users may set personal stake limits from their wallet settings at any time.</Li>
          <Li>BAUIN complies with all applicable Nigerian laws on wagering and online gaming.</Li>
          <Li>Problem gambling support is available — see the Betting Disclaimer page for resources.</Li>
        </Ul>
        <p>
          BAUIN reserves the right to restrict or suspend betting access to any user at its
          discretion, including but not limited to users showing signs of problem gambling or
          suspected fraud.
        </p>
      </Section>

      <Section id="payments" title="9. Payments & Withdrawals">
        <SubHeading>Deposits</SubHeading>
        <p>
          Payments are processed via Paystack. BAUIN does not store card details. Minimum deposit
          is ₦500. All amounts are in Nigerian Naira (₦).
        </p>
        <SubHeading>Withdrawals</SubHeading>
        <Ul>
          <Li>Minimum withdrawal: ₦1,000.</Li>
          <Li>Processing time: 1–3 business days to your registered Nigerian bank account.</Li>
          <Li>A platform processing fee may apply; the current rate is displayed at the withdrawal screen.</Li>
          <Li>Withdrawals may be paused during platform maintenance or regulatory review.</Li>
          <Li>BAUIN may request additional KYC verification before processing large withdrawals.</Li>
        </Ul>
        <SubHeading>Taxes</SubHeading>
        <p>
          Members are solely responsible for reporting and paying any applicable taxes on earnings
          received via BAUIN. BAUIN will issue earnings statements upon request.
        </p>
      </Section>

      <Section id="prohibited" title="10. Prohibited Activities">
        <Ul>
          <Li>Creating multiple accounts to claim duplicate bonuses or inflate referral counts.</Li>
          <Li>Using bots, scripts, or automation to interact with quizzes, tasks, or the betting system.</Li>
          <Li>Colluding with other users to manipulate quiz outcomes or betting markets.</Li>
          <Li>Uploading story content that contains adult material, hate speech, copyright violations, or scam solicitations.</Li>
          <Li>Attempting to reverse-engineer, scrape, or disrupt BAUIN systems.</Li>
          <Li>Providing false identity information during KYC.</Li>
        </Ul>
        <p>
          Violations will result in account suspension, forfeiture of wallet balance pending
          review, and may be referred to law enforcement where appropriate.
        </p>
      </Section>

      <Section id="ip" title="11. Intellectual Property">
        <p>
          Story content published on BAUIN remains the intellectual property of the original
          author. By publishing on BAUIN, you grant BAUIN a non-exclusive, royalty-free licence
          to display, distribute, and promote your content within the platform.
        </p>
        <p>
          Quiz questions created by hosts remain the property of the host. BAUIN retains the right
          to remove content that violates these Terms or applicable law.
        </p>
        <p>
          The BAUIN name, logo, and platform design are the exclusive property of BAUIN Platform
          Ltd. Unauthorised reproduction is prohibited.
        </p>
      </Section>

      <Section id="governing-law" title="12. Governing Law">
        <p>
          These Terms are governed by and construed in accordance with the laws of the
          <strong> Federal Republic of Nigeria</strong>. Any disputes arising from or in
          connection with these Terms shall be subject to the exclusive jurisdiction of the courts
          of <strong>Lagos State, Nigeria</strong>.
        </p>
        <p>
          If any provision of these Terms is found to be unenforceable, the remaining provisions
          shall continue in full force and effect.
        </p>
      </Section>

      <Section id="amendments" title="13. Amendments">
        <p>
          BAUIN may update these Terms at any time. Material changes will be communicated via
          in-platform notification and email at least 7 days before taking effect. Continued use of
          the platform after that date constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section id="contact" title="14. Contact">
        <p>
          For questions about these Terms, contact our legal team at{" "}
          <strong>legal@bauin.com</strong> or write to:
        </p>
        <p className="bg-gray-50 rounded-lg p-4 text-sm not-italic">
          BAUIN Platform Ltd.<br />
          Legal Department<br />
          Lagos, Nigeria
        </p>
      </Section>

    </LegalLayout>
  );
}
