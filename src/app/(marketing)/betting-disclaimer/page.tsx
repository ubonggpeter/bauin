import type { Metadata } from "next";
import LegalLayout, { Section, SubHeading, Ul, Li } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Betting Disclaimer",
  description: "BAUIN betting disclaimer — 18+ only, responsible gambling, bet mechanics, and problem gambling resources.",
};

const TOC = [
  { id: "notice",         label: "1. Regulatory Notice" },
  { id: "age",            label: "2. Age Restriction (18+)" },
  { id: "mechanics",      label: "3. How Betting Works" },
  { id: "placement",      label: "4. Bet Placement & Settlement" },
  { id: "payouts",        label: "5. Odds & Payouts" },
  { id: "responsible",    label: "6. Responsible Gambling" },
  { id: "self-exclusion", label: "7. Self-Exclusion & Limits" },
  { id: "resources",      label: "8. Problem Gambling Resources" },
  { id: "no-guarantee",   label: "9. No Guarantee of Winnings" },
  { id: "compliance",     label: "10. Jurisdiction & Compliance" },
];

export default function BettingDisclaimerPage() {
  return (
    <LegalLayout title="Betting Disclaimer" effective="1 June 2026" toc={TOC}>

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-8 flex gap-3">
        <span className="text-2xl leading-none mt-0.5">⚠️</span>
        <div>
          <p className="font-bold text-amber-900 text-sm mb-1">
            Betting involves financial risk. Only bet what you can afford to lose.
          </p>
          <p className="text-amber-800 text-sm">
            You must be <strong>18 years or older</strong> to use BAUIN's betting features.
            If you or someone you know has a gambling problem, please seek help immediately.
          </p>
        </div>
      </div>

      <Section id="notice" title="1. Regulatory Notice">
        <p>
          BAUIN's peer-to-peer quiz betting feature is operated in accordance with applicable
          Nigerian federal and state laws on gaming and wagering. BAUIN Platform Ltd. does not
          operate as a traditional sportsbook or casino; the platform facilitates peer-to-peer
          wagers between users on the outcome of BAUIN-hosted quiz sessions.
        </p>
        <p>
          Users are solely responsible for ensuring that their participation in betting activities
          is lawful in their jurisdiction. By placing a bet, you confirm that online peer-to-peer
          wagering is legal in your state or territory of residence.
        </p>
      </Section>

      <Section id="age" title="2. Age Restriction (18+)">
        <p>
          Participation in any betting feature on BAUIN is <strong>strictly prohibited for
          anyone under 18 years of age</strong>. This is a legal requirement and a core
          platform policy.
        </p>
        <Ul>
          <Li>Age is verified as part of the KYC process required for wallet activation.</Li>
          <Li>Accounts found to be underage will be immediately suspended and all bet-related balances forfeited.</Li>
          <Li>Parents and guardians are responsible for preventing minors from accessing BAUIN accounts.</Li>
          <Li>If you suspect an underage user is accessing betting features, report it to <strong>safety@bauin.com</strong>.</Li>
        </Ul>
      </Section>

      <Section id="mechanics" title="3. How Betting Works">
        <p>
          BAUIN's betting system allows members to place wagers on quiz session outcomes — such
          as predicting the top-ranked player, the winner of a specific phase, or the final score
          range.
        </p>
        <SubHeading>Peer-to-Peer Model</SubHeading>
        <p>
          BAUIN does not set odds or take a position in any bet. Instead, users bet against
          each other. Stakes are pooled and distributed among winners according to the bet's
          defined rules. BAUIN acts solely as the facilitating platform and does not benefit
          from the outcome of any individual bet.
        </p>
        <SubHeading>Session Linkage</SubHeading>
        <p>
          Bets are linked to specific quiz sessions. A bet can only be placed while that
          session is in "Lobby" (open) or "In Progress" status, depending on the bet type.
          All bets are automatically settled when the session closes.
        </p>
      </Section>

      <Section id="placement" title="4. Bet Placement & Settlement">
        <SubHeading>Placing a Bet</SubHeading>
        <Ul>
          <Li>Select an open bet market on a quiz session page.</Li>
          <Li>Choose your prediction and enter your stake (minimum: ₦100).</Li>
          <Li>Confirm — the stake is immediately deducted from your wallet and held in escrow.</Li>
          <Li>You may cancel a placed bet and receive a full refund up until the session moves to "In Progress."</Li>
        </Ul>
        <SubHeading>Settlement</SubHeading>
        <Ul>
          <Li>Bets are settled automatically within <strong>60 minutes</strong> of session close.</Li>
          <Li>Winning stakes are credited to your BAUIN wallet.</Li>
          <Li>In the event of a void bet (e.g. session cancelled, technical failure), all stakes are refunded within 72 hours.</Li>
        </Ul>
      </Section>

      <Section id="payouts" title="5. Odds & Payouts">
        <p>
          Because BAUIN operates a peer-to-peer model, payouts depend on:
        </p>
        <Ul>
          <Li>The total pool of stakes collected for that bet market.</Li>
          <Li>The number of participants who selected the winning outcome.</Li>
          <Li>A small platform facilitation fee (displayed before you confirm a bet).</Li>
        </Ul>
        <p>
          <strong>Implied odds are indicative only</strong> and may change as more participants
          join the bet market. The payout displayed at confirmation time is an estimate; final
          payout is calculated when the session closes and the final pool is known.
        </p>
        <p>
          BAUIN does not guarantee a minimum payout ratio. Past payout rates are not indicative
          of future returns.
        </p>
      </Section>

      <Section id="responsible" title="6. Responsible Gambling">
        <p>
          BAUIN is committed to promoting responsible gambling. We encourage all users to:
        </p>
        <Ul>
          <Li>Set a personal budget for betting and stick to it.</Li>
          <Li>Treat betting as entertainment, not a source of income.</Li>
          <Li>Never bet with money you need for essential expenses (rent, food, bills).</Li>
          <Li>Never chase losses by increasing stake amounts after a losing session.</Li>
          <Li>Take regular breaks and avoid prolonged betting sessions.</Li>
          <Li>Be honest with yourself about your betting behaviour.</Li>
        </Ul>
        <SubHeading>Warning Signs</SubHeading>
        <p>
          You may have a gambling problem if you find yourself: betting more than you intended,
          hiding your gambling from others, borrowing money to bet, feeling anxious or irritable
          when not betting, or neglecting responsibilities because of gambling.
        </p>
      </Section>

      <Section id="self-exclusion" title="7. Self-Exclusion & Limits">
        <p>
          BAUIN provides tools to help you stay in control of your betting activity:
        </p>
        <SubHeading>Stake Limits</SubHeading>
        <p>
          Set a daily, weekly, or monthly maximum stake limit from <strong>Dashboard → Wallet →
          Betting Limits</strong>. Limits take effect immediately and can be lowered at any time.
          Raising a limit requires a 24-hour cooling-off period.
        </p>
        <SubHeading>Session Time Limits</SubHeading>
        <p>
          Set a maximum number of betting sessions per day or per week. You will be prompted
          when you approach your limit.
        </p>
        <SubHeading>Self-Exclusion</SubHeading>
        <p>
          To self-exclude from all betting features, email <strong>safety@bauin.com</strong>
          with the subject "Self-Exclusion Request." Exclusion takes effect within 24 hours.
          During the exclusion period, all betting features will be hidden from your account.
          A minimum exclusion period of 30 days applies; you may request an extension at any time.
        </p>
      </Section>

      <Section id="resources" title="8. Problem Gambling Resources">
        <p>
          If you or someone you know needs help with a gambling problem, please reach out to these
          organisations:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          {[
            {
              name: "National Problem Gambling Helpline (Nigeria)",
              detail: "Contact your state ministry of health for regional referral services.",
            },
            {
              name: "Gambling Therapy",
              detail: "gamblingtherapy.org — free, confidential online support available 24/7.",
            },
            {
              name: "BAUIN Responsible Gambling Team",
              detail: "Email safety@bauin.com — confidential, no impact on your account.",
            },
            {
              name: "BeGambleAware",
              detail: "begambleaware.org — resources and chat support for anyone affected by gambling.",
            },
          ].map((r) => (
            <div key={r.name} className="bg-teal-50 border border-teal-100 rounded-lg p-4">
              <p className="font-semibold text-primary text-sm mb-1">{r.name}</p>
              <p className="text-gray-600 text-[13px]">{r.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="no-guarantee" title="9. No Guarantee of Winnings">
        <p>
          Betting on BAUIN quiz sessions involves real financial risk. Past performance is not a
          predictor of future results. <strong>BAUIN does not guarantee that you will win any
          bet, recover any stake, or profit from participating in betting activities.</strong>
        </p>
        <p>
          All betting activity is subject to chance, the skill levels of other participants,
          and factors outside your control. Never bet more than you are prepared to lose in full.
        </p>
        <p>
          BAUIN is not liable for financial losses incurred through betting. By placing a bet,
          you acknowledge that you have read and understood this disclaimer and accept full
          responsibility for your betting decisions.
        </p>
      </Section>

      <Section id="compliance" title="10. Jurisdiction & Compliance">
        <p>
          BAUIN's betting features are designed for use within Nigeria. Users accessing the
          platform from other jurisdictions do so at their own risk and are solely responsible
          for ensuring compliance with local laws.
        </p>
        <Ul>
          <Li>BAUIN complies with all applicable Nigerian federal laws on gaming and electronic transactions.</Li>
          <Li>We report suspicious activity to relevant Nigerian regulatory authorities as required.</Li>
          <Li>BAUIN implements Anti-Money Laundering (AML) checks on large or unusual betting activity.</Li>
          <Li>These Terms are governed by the laws of the Federal Republic of Nigeria; disputes are subject to the jurisdiction of Lagos State courts.</Li>
        </Ul>
      </Section>

    </LegalLayout>
  );
}
