import type { Metadata } from "next";
import LegalLayout, { Section, SubHeading, Ul, Li } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Quiz Rules",
  description: "Official BAUIN quiz rules — A–D format, 5-phase memory game, scoring, prize distribution, and fair play.",
};

const TOC = [
  { id: "overview",      label: "1. Overview" },
  { id: "ad-format",     label: "2. A–D Question Format" },
  { id: "memory-game",   label: "3. 5-Phase Memory Game" },
  { id: "eligibility",   label: "4. Eligibility" },
  { id: "entry-pool",    label: "5. Entry Fees & Prize Pool" },
  { id: "scoring",       label: "6. Scoring System" },
  { id: "distribution",  label: "7. Prize Distribution" },
  { id: "fair-play",     label: "8. Fair Play & Anti-Cheat" },
  { id: "disputes",      label: "9. Disputes" },
  { id: "amendments",    label: "10. Rule Amendments" },
];

export default function QuizRulesPage() {
  return (
    <LegalLayout title="Quiz Rules" effective="1 June 2026" toc={TOC}>

      <Section id="overview" title="1. Overview">
        <p>
          BAUIN quiz competitions are live, timed, knowledge-based events hosted by certified
          distributors ("quiz hosts"). Players join a session, pay the advertised entry fee, and
          compete for a share of the prize pool. These rules apply to all quiz sessions on the
          BAUIN platform.
        </p>
        <p>
          Two quiz formats are available: the <strong>A–D Question Format</strong> (multiple
          choice) and the <strong>5-Phase Memory Game</strong> (story recall). Both formats use
          the same entry, scoring, and prize distribution mechanics described in this document.
        </p>
      </Section>

      <Section id="ad-format" title="2. A–D Question Format">
        <p>
          The A–D format presents players with a series of questions, each accompanied by four
          answer options labelled <strong>A, B, C, and D</strong>. Only one option is correct.
        </p>
        <SubHeading>Session Structure</SubHeading>
        <Ul>
          <Li>A session consists of <strong>five phases</strong> of questions.</Li>
          <Li>Each phase has a defined topic or difficulty tier set by the host.</Li>
          <Li>Questions within a phase are presented sequentially; players cannot skip or return to a previous question.</Li>
          <Li>Each question has an individual time limit (default: 30 seconds). Unanswered questions score zero.</Li>
        </Ul>
        <SubHeading>Timing</SubHeading>
        <p>
          A countdown timer is displayed for each question. Answers submitted after the timer
          expires are not accepted. Players who lose their connection during a question will have
          that question scored as unanswered.
        </p>
        <SubHeading>Session Close</SubHeading>
        <p>
          The quiz host closes the session after all phases are complete. Scores are finalised,
          ranked, and prizes distributed automatically at close.
        </p>
      </Section>

      <Section id="memory-game" title="3. 5-Phase Memory Game">
        <p>
          The Memory Game challenges players to recall specific details from a BAUIN story episode
          across five structured phases. Players must have read or accessed the episode before
          the session.
        </p>
        <SubHeading>Phase Breakdown</SubHeading>
        <Ul>
          <Li><strong>Phase 1 — Introduction Recall:</strong> Questions on characters, setting, and the opening scene. Focus: names, locations, first impressions.</Li>
          <Li><strong>Phase 2 — Plot Points:</strong> Questions on the main events of the first half of the episode. Focus: sequence, cause, and outcome.</Li>
          <Li><strong>Phase 3 — Mid-Story Details:</strong> Questions on dialogue, smaller details, and subplots. Focus: precision recall.</Li>
          <Li><strong>Phase 4 — Cause & Effect:</strong> Questions on why characters acted as they did and how events led to consequences. Focus: reasoning.</Li>
          <Li><strong>Phase 5 — Resolution:</strong> Questions on the episode's conclusion, character fates, and unresolved threads. Focus: synthesis.</Li>
        </Ul>
        <SubHeading>Phase Progression</SubHeading>
        <p>
          Players advance automatically from one phase to the next. Players who disconnect between
          phases will not receive credit for unanswered phases. Partial-phase completion scores
          the questions answered up to the point of disconnection.
        </p>
        <SubHeading>Maximum Score</SubHeading>
        <p>
          The Memory Game has a maximum possible score of <strong>500 points</strong>
          (100 points per phase × 5 phases). This ceiling is used in the platform's
          composite story-rating calculation.
        </p>
      </Section>

      <Section id="eligibility" title="4. Eligibility">
        <Ul>
          <Li>Players must be registered BAUIN members in good standing (no active suspension).</Li>
          <Li>Players must be aged <strong>18 or older</strong> to participate in paid sessions.</Li>
          <Li>The quiz host (collection owner) and their immediate family members may not participate as players in sessions they host.</Li>
          <Li>BAUIN staff are not eligible to participate in prize competitions.</Li>
          <Li>Players must have sufficient wallet balance to cover the entry fee at session join time.</Li>
        </Ul>
      </Section>

      <Section id="entry-pool" title="5. Entry Fees & Prize Pool">
        <p>
          The entry fee for each session is set by the quiz host and displayed before joining.
          The total entry pool collected from all players is split as follows:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mt-2">
            <thead>
              <tr className="bg-primary/10">
                <th className="text-left px-4 py-2 text-primary font-semibold border border-primary/20">Recipient</th>
                <th className="text-right px-4 py-2 text-primary font-semibold border border-primary/20">Share</th>
                <th className="text-left px-4 py-2 text-primary font-semibold border border-primary/20">Notes</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {[
                ["Quiz Host (Distributor)", "50%", "Collection owner wallet — credited immediately at close"],
                ["Platform Fee", "30%", "BAUIN operational costs; not distributed to individuals"],
                ["Story Royalty", "10%", "Author of the linked story episode, if applicable"],
                ["Winner Prize Pool", "5%", "Top 3 players — split 60 / 25 / 15"],
                ["Viewer Referrer Pool", "5%", "Shared among referrers who brought viewers into this session"],
              ].map(([r, s, n]) => (
                <tr key={r} className="border-b border-gray-100">
                  <td className="px-4 py-2 border border-gray-100">{r}</td>
                  <td className="px-4 py-2 text-right font-mono border border-gray-100">{s}</td>
                  <td className="px-4 py-2 text-gray-500 border border-gray-100">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="scoring" title="6. Scoring System">
        <SubHeading>Base Score</SubHeading>
        <p>
          Each correct answer earns the base point value assigned to that question by the host
          (typically 10–100 points). Wrong or unanswered questions score zero — no negative
          marking.
        </p>
        <SubHeading>Speed Bonus</SubHeading>
        <p>
          Players who answer correctly within the first one-third of the available time receive a
          speed bonus equal to 10% of the question's base value (rounded down).
        </p>
        <SubHeading>Phase Completion Bonus</SubHeading>
        <p>
          Completing all questions in a phase without any unanswered questions earns a
          10-point phase completion bonus.
        </p>
        <SubHeading>Final Score</SubHeading>
        <p>
          A player's final score is the sum of all base scores, speed bonuses, and phase
          completion bonuses across all five phases. Final scores are used to rank players and
          determine prize eligibility.
        </p>
      </Section>

      <Section id="distribution" title="7. Prize Distribution">
        <p>
          The winner prize pool (5% of total entry fees) is distributed to the top three
          ranked players:
        </p>
        <Ul>
          <Li><strong>1st place — 60%</strong> of the winner prize pool</Li>
          <Li><strong>2nd place — 25%</strong> of the winner prize pool</Li>
          <Li><strong>3rd place — 15%</strong> of the winner prize pool</Li>
        </Ul>
        <p>
          Prizes are credited to winners' BAUIN wallets automatically within <strong>60 minutes</strong>
          of session close. If fewer than 3 players participate, unclaimed prize tiers are rolled
          into the next available tier (2nd + 3rd → 1st if only 1 player).
        </p>
        <SubHeading>Ties</SubHeading>
        <p>
          In the event of a tied score, the player who submitted their final answer first
          (lower total time used across the session) is ranked higher. If a tie cannot be broken
          by time, the prize for both positions is combined and split equally between the tied
          players.
        </p>
      </Section>

      <Section id="fair-play" title="8. Fair Play & Anti-Cheat">
        <Ul>
          <Li>Players must answer questions individually and independently. Sharing answers during a live session via any channel is prohibited.</Li>
          <Li>Using browser automation, scripts, bots, or AI tools to answer questions is prohibited.</Li>
          <Li>Exploiting question-timing bugs, network manipulation, or any other technical vulnerability is prohibited.</Li>
          <Li>Collusion between a quiz host and specific players to predetermine outcomes is prohibited.</Li>
        </Ul>
        <p>
          BAUIN employs automated anomaly detection to identify suspicious score patterns,
          answer timing, and network behaviour. Confirmed violations will result in:
        </p>
        <Ul>
          <Li>Score nullification for the affected session.</Li>
          <Li>Forfeiture of any prizes already credited.</Li>
          <Li>Account suspension and possible permanent ban.</Li>
          <Li>Referral of evidence to law enforcement where financial fraud is involved.</Li>
        </Ul>
      </Section>

      <Section id="disputes" title="9. Disputes">
        <p>
          Score or prize disputes must be raised within <strong>48 hours</strong> of session
          close. To raise a dispute:
        </p>
        <Ul>
          <Li>Email <strong>support@bauin.com</strong> with the session ID, your account email, and a description of the issue.</Li>
          <Li>BAUIN will investigate and respond within 5 business days.</Li>
          <Li>Session scores and timings are recorded server-side and are final. Client-side screenshots are not accepted as evidence.</Li>
          <Li>BAUIN's determination on score disputes is final and binding.</Li>
        </Ul>
      </Section>

      <Section id="amendments" title="10. Rule Amendments">
        <p>
          BAUIN reserves the right to update these Quiz Rules at any time. Changes will be
          communicated via in-platform notification and on this page. Rules in effect at the time
          a session is created govern that session; subsequent changes do not apply retroactively.
        </p>
      </Section>

    </LegalLayout>
  );
}
