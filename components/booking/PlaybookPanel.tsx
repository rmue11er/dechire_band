'use client';

import Link from 'next/link';
import { IconCheck, IconClock, IconExternal } from '@/components/icons';
import { PLAYBOOK, PLAYBOOK_PHASES } from '@/lib/booking';
import type { BookingStep } from '@/lib/types';

export default function PlaybookPanel({
  steps,
  contactCount,
  seedsAvailable,
  seedMissing,
  onToggle,
  onTogglePhase,
  onRestoreSeed,
  restoring,
}: {
  steps: BookingStep[];
  contactCount: number;
  seedsAvailable: number;
  seedMissing: number;
  onToggle: (key: string, done: boolean) => void;
  onTogglePhase: (keys: string[], done: boolean) => void;
  onRestoreSeed: () => void;
  restoring: boolean;
}) {
  const done = new Set(steps.filter((step) => step.done).map((step) => step.key));
  const total = PLAYBOOK.length;
  const percent = Math.round((done.size / total) * 100);
  const minutes = PLAYBOOK.filter((step) => !done.has(step.key)).reduce((sum, step) => sum + step.minutes, 0);

  return (
    <div className="booking-guide">
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Wie du zu Gigs kommst</div>
          <span className="mono small muted">
            {done.size}/{total} erledigt · offen ≈ {minutes} Min
          </span>
        </div>
        <div className="panel-body">
          <div className="booking-progress" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="booking-intro">
            Der Leitfaden ist kein Blogartikel, sondern die Reihenfolge, in der Booking tatsächlich funktioniert:
            erst Material und Haltung, dann geprüfte Kontakte, dann kurze Mails in Wellen. Hake ab, was steht – der
            Fortschritt bleibt gespeichert.
          </p>
          <div className="booking-cells">
            <div className="booking-cell">
              <span className="mono small muted">Kontakte in der Liste</span>
              <strong>{contactCount}</strong>
            </div>
            <div className="booking-cell">
              <span className="mono small muted">Recherche-Vorschläge</span>
              <strong>{seedsAvailable}</strong>
              {seedMissing ? <span className="mono small muted">{seedMissing} noch nicht in der Liste</span> : null}
            </div>
            <div className="booking-cell">
              <span className="mono small muted">Fortschritt</span>
              <strong>{percent}%</strong>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button type="button" className="btn btn-sm btn-ghost" onClick={onRestoreSeed} disabled={restoring}>
              {restoring
                ? 'Wird eingespielt …'
                : seedMissing
                  ? `${seedMissing} neue Recherche-Kontakte einspielen`
                  : 'Recherche aktualisieren'}
            </button>
            <Link className="btn btn-sm btn-ghost" href="/admin/booking?tab=kontakte">
              Zu den Kontakten
            </Link>
          </div>
        </div>
      </section>

      {PLAYBOOK_PHASES.map((phase) => {
        const phaseSteps = PLAYBOOK.filter((step) => step.phase === phase.value);
        const phaseKeys = phaseSteps.map((step) => step.key);
        const phaseDone = phaseKeys.filter((key) => done.has(key)).length;
        const allDone = phaseDone === phaseSteps.length;
        return (
          <section key={phase.value} className="panel booking-phase">
            <div className="panel-head">
              <div className="panel-title">
                <span className="booking-phase-index">{PLAYBOOK_PHASES.findIndex((entry) => entry.value === phase.value) + 1}</span>
                {phase.label}
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span className="mono small muted">
                  {phaseDone}/{phaseSteps.length}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => onTogglePhase(phaseKeys, !allDone)}
                >
                  {allDone ? 'Zurücksetzen' : 'Alle erledigt'}
                </button>
              </div>
            </div>
            <div className="panel-body">
              <p className="booking-phase-hint">{phase.hint}</p>
              <div className="booking-steps">
                {phaseSteps.map((step) => {
                  const isDone = done.has(step.key);
                  return (
                    <article key={step.key} className={`booking-step ${isDone ? 'is-done' : ''}`}>
                      <button
                        type="button"
                        className="booking-check"
                        aria-pressed={isDone}
                        aria-label={isDone ? 'Als offen markieren' : 'Als erledigt markieren'}
                        onClick={() => onToggle(step.key, !isDone)}
                      >
                        {isDone ? <IconCheck size={14} /> : null}
                      </button>
                      <div className="booking-step-body">
                        <div className="booking-step-head">
                          <h3>{step.title}</h3>
                          <span className="booking-time">
                            <IconClock size={12} /> {step.minutes} Min
                          </span>
                        </div>
                        <p className="booking-why">{step.why}</p>
                        <ul className="booking-how">
                          {step.how.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                        {step.link ? (
                          <Link className="booking-link" href={step.link.href}>
                            {step.link.label} <IconExternal size={12} />
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
