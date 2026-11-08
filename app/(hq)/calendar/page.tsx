'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconInstagram,
  IconPlus,
  IconTrash,
  IconX,
} from '@/components/icons';
import { EmptyState, Field, Modal, PageHead, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { MILESTONE_KINDS, milestoneKindLabel } from '@/lib/kinds';
import { toast } from '@/lib/toast';
import type { ChecklistItem, Milestone, MilestoneKind, Post } from '@/lib/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

const pad = (value: number) => String(value).padStart(2, '0');
const keyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayKey = () => keyOf(new Date());
const stampKey = (value?: string | null) => (value ? keyOf(new Date(value)) : null);

const RELEASE_CHECKLIST = [
  'Cover 4:5 and 9:16 exported',
  'Teaser clip cut',
  'Story announcement scheduled',
  'Poster and flyer ready for print',
  'Merch mockup done',
  'Press text sent to promoters',
];

type Draft = {
  id: number | null;
  title: string;
  date: string;
  kind: MilestoneKind;
  note: string;
  done: boolean;
  checklist: ChecklistItem[];
};

const emptyDraft = (date: string): Draft => ({
  id: null,
  title: '',
  date,
  kind: 'other',
  note: '',
  done: false,
  checklist: [],
});

type Slot =
  | { type: 'milestone'; at: string; milestone: Milestone }
  | { type: 'post'; at: string; post: Post };

export default function CalendarPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string>(todayKey());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMilestones, setShowMilestones] = useState(true);
  const [showPosts, setShowPosts] = useState(true);
  const [reminders, setReminders] = useState(false);

  const load = useCallback(async () => {
    try {
      const [milestoneResponse, postResponse] = await Promise.all([
        fetch('/api/milestones'),
        fetch('/api/posts'),
      ]);
      const milestoneData = await milestoneResponse.json();
      const postData = await postResponse.json();
      setMilestones(milestoneData.milestones ?? []);
      setPosts(postData.posts ?? []);
    } catch {
      toast('Could not load the calendar', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setReminders(window.localStorage.getItem('dechire:reminders') === '1');
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    const push = (key: string, slot: Slot) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    };

    if (showMilestones) {
      for (const milestone of milestones) {
        push(milestone.date, { type: 'milestone', at: `${milestone.date}T00:00:00`, milestone });
      }
    }
    if (showPosts) {
      for (const post of posts) {
        const key = stampKey(post.status === 'published' ? post.publishedAt : post.scheduledAt);
        if (!key) continue;
        push(key, {
          type: 'post',
          at: (post.status === 'published' ? post.publishedAt : post.scheduledAt) as string,
          post,
        });
      }
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.at.localeCompare(b.at));
    }
    return map;
  }, [milestones, posts, showMilestones, showPosts]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        key: keyOf(date),
        day: date.getDate(),
        inMonth: date.getMonth() === cursor.getMonth(),
        isToday: keyOf(date) === todayKey(),
      };
    });
  }, [cursor]);

  const monthCounts = useMemo(() => {
    const inMonth = cells.filter((cell) => cell.inMonth);
    let entries = 0;
    let postDays = 0;
    for (const cell of inMonth) {
      const slots = byDay.get(cell.key) ?? [];
      entries += slots.filter((slot) => slot.type === 'milestone').length;
      if (slots.some((slot) => slot.type === 'post')) postDays += 1;
    }
    return { entries, postDays, days: inMonth.length };
  }, [cells, byDay]);

  const upcoming = useMemo(() => {
    const today = todayKey();
    const list: { kind: string; title: string; date: string; id: string; href?: string }[] = [];
    for (const milestone of milestones) {
      if (milestone.done || milestone.date < today) continue;
      list.push({ kind: milestone.kind, title: milestone.title, date: milestone.date, id: `m-${milestone.id}` });
    }
    for (const post of posts) {
      const key = stampKey(post.scheduledAt);
      if (!key || key < today || post.status === 'published') continue;
      list.push({
        kind: 'post',
        title: post.caption.split('\n')[0].slice(0, 60) || 'Scheduled post',
        date: key,
        id: `p-${post.id}`,
        href: `/planner?post=${post.id}`,
      });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [milestones, posts]);

  /* reminder notifications ------------------------------------------------ */

  useEffect(() => {
    if (!reminders || typeof Notification === 'undefined') return;

    const check = () => {
      const now = Date.now();
      const candidates: { id: string; at: string; title: string; body: string }[] = [];

      for (const post of posts) {
        if (post.status !== 'scheduled' || !post.scheduledAt) continue;
        candidates.push({
          id: `post-${post.id}`,
          at: post.scheduledAt,
          title: 'Post due',
          body: post.caption.split('\n')[0].slice(0, 90) || 'Your scheduled post is coming up.',
        });
      }
      for (const milestone of milestones) {
        if (milestone.done) continue;
        candidates.push({
          id: `milestone-${milestone.id}`,
          at: `${milestone.date}T09:00:00`,
          title: `Today: ${milestone.title}`,
          body: milestone.note || milestoneKindLabel(milestone.kind),
        });
      }

      for (const candidate of candidates) {
        const diff = new Date(candidate.at).getTime() - now;
        const key = `dechire:notified:${candidate.id}`;
        if (diff > 0 && diff < 30 * 60 * 1000 && !window.localStorage.getItem(key)) {
          try {
            new Notification(candidate.title, { body: candidate.body });
            window.localStorage.setItem(key, '1');
          } catch {
            /* notifications blocked */
          }
        }
      }
    };

    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [reminders, posts, milestones]);

  const toggleReminders = async () => {
    if (reminders) {
      window.localStorage.removeItem('dechire:reminders');
      setReminders(false);
      toast('Reminders off');
      return;
    }
    if (typeof Notification === 'undefined') {
      toast('This browser does not support notifications', 'error');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast('Notifications are blocked in the browser', 'error');
      return;
    }
    window.localStorage.setItem('dechire:reminders', '1');
    setReminders(true);
    toast('Reminders on – 30 minutes before a post, on the day of a milestone');
  };

  /* editing --------------------------------------------------------------- */

  const openNew = (date?: string) => setDraft(emptyDraft(date ?? selectedDay));

  const openEdit = (milestone: Milestone) =>
    setDraft({
      id: milestone.id,
      title: milestone.title,
      date: milestone.date,
      kind: milestone.kind,
      note: milestone.note,
      done: milestone.done,
      checklist: milestone.checklist ?? [],
    });

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast('Give the milestone a title', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        date: draft.date,
        kind: draft.kind,
        note: draft.note,
        done: draft.done,
        checklist: draft.checklist.filter((item) => item.label.trim()),
      };
      const response = await fetch(draft.id ? `/api/milestones/${draft.id}` : '/api/milestones', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the milestone');
      const milestone: Milestone = data.milestone;
      setMilestones((current) =>
        draft.id ? current.map((item) => (item.id === milestone.id ? milestone : item)) : [...current, milestone]
      );
      setSelectedDay(milestone.date);
      setDraft(null);
      toast(draft.id ? 'Milestone updated' : 'Milestone added');
    } catch (error: any) {
      toast(error.message ?? 'Could not save the milestone', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    if (!window.confirm('Delete this milestone? It moves to the bin in Settings.')) return;
    const response = await fetch(`/api/milestones/${draft.id}`, { method: 'DELETE' });
    if (response.ok) {
      setMilestones((current) => current.filter((item) => item.id !== draft.id));
      setDraft(null);
      toast('Milestone deleted');
    }
  };

  const shiftMonth = (direction: -1 | 1) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  if (loading) return <Spinner label="Loading the calendar" />;

  const selectedSlots = byDay.get(selectedDay) ?? [];
  const selectedMilestones = selectedSlots.filter((slot) => slot.type === 'milestone') as Extract<
    Slot,
    { type: 'milestone' }
  >[];
  const selectedPosts = selectedSlots.filter((slot) => slot.type === 'post') as Extract<Slot, { type: 'post' }>[];

  return (
    <>
      <PageHead
        eyebrow="Calendar"
        title={
          <>
            Dates<span className="slash">/</span>Milestones
          </>
        }
        sub="Feed posts, releases, shows, print deadlines, meetings – one timeline for everything that has a date."
        actions={
          <>
            <a className="btn btn-ghost" href="/api/export/calendar" download>
              <IconDownload size={15} /> .ics
            </a>
            <button type="button" className="btn btn-ghost" onClick={toggleReminders}>
              <IconClock size={15} /> {reminders ? 'Reminders on' : 'Reminders off'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCursor(new Date());
                setSelectedDay(todayKey());
              }}
            >
              <IconCalendar size={15} /> Today
            </button>
            <button type="button" className="btn btn-primary" onClick={() => openNew()}>
              <IconPlus size={15} /> Add milestone
            </button>
          </>
        }
      />

      <div className="cal-layout">
        <section className="panel cal-panel">
          <div className="cal-top">
            <div className="cal-nav">
              <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <IconChevronLeft size={16} />
              </button>
              <strong className="cal-month">{MONTH_FORMAT.format(cursor)}</strong>
              <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
                <IconChevronRight size={16} />
              </button>
            </div>
            <div className="cal-legend">
              <button
                type="button"
                className={`cal-toggle ${showPosts ? 'on' : ''}`}
                onClick={() => setShowPosts((value) => !value)}
              >
                <span className="cal-dot post" /> Posts
              </button>
              <button
                type="button"
                className={`cal-toggle ${showMilestones ? 'on' : ''}`}
                onClick={() => setShowMilestones((value) => !value)}
              >
                <span className="cal-dot release" /> Milestones
              </button>
              <span className="mono small muted">
                {monthCounts.entries} entries · {monthCounts.postDays}/{monthCounts.days} days with a post
              </span>
            </div>
          </div>

          <div className="cal-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((cell) => {
              const slots = byDay.get(cell.key) ?? [];
              return (
                <div
                  key={cell.key}
                  className={`cal-cell ${cell.inMonth ? '' : 'out'} ${cell.isToday ? 'today' : ''} ${
                    cell.key === selectedDay ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedDay(cell.key)}
                  onDoubleClick={() => openNew(cell.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setSelectedDay(cell.key);
                  }}
                >
                  <span className="cal-day">{cell.day}</span>
                  <div className="cal-items">
                    {slots.slice(0, 3).map((slot) =>
                      slot.type === 'milestone' ? (
                        <button
                          key={`m-${slot.milestone.id}`}
                          type="button"
                          className={`cal-chip ${slot.milestone.kind} ${slot.milestone.done ? 'done' : ''}`}
                          title={slot.milestone.title}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(slot.milestone);
                          }}
                        >
                          {slot.milestone.title}
                        </button>
                      ) : (
                        <Link
                          key={`p-${slot.post.id}`}
                          href={`/planner?post=${slot.post.id}`}
                          className="cal-chip post"
                          title={slot.post.caption}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {slot.post.status === 'published' ? '✓ ' : ''}
                          {slot.post.caption.split('\n')[0].slice(0, 34) || 'Post'}
                        </Link>
                      )
                    )}
                    {slots.length > 3 ? <span className="cal-more">+{slots.length - 3}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="cal-hint">
            Click a day to select it · double-click or “Add milestone” to create an entry · click a post to open it in the
            planner.
          </p>
        </section>

        <aside className="cal-side">
          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconCalendar size={16} />
                {formatDate(selectedDay)}
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => openNew(selectedDay)}>
                <IconPlus size={13} /> Add
              </button>
            </div>
            <div className="panel-body">
              {selectedSlots.length === 0 ? (
                <p className="small muted" style={{ margin: 0 }}>
                  Nothing planned on this day.
                </p>
              ) : (
                <div className="cal-daylist">
                  {selectedPosts.map(({ post }) => (
                    <Link key={`dp-${post.id}`} href={`/planner?post=${post.id}`} className="cal-dayrow post">
                      <span className="cal-kind post">
                        <IconInstagram size={10} /> {post.status}
                      </span>
                      <strong>{post.caption.split('\n')[0].slice(0, 70) || 'Post'}</strong>
                      {post.metrics ? (
                        <span className="small muted">
                          {post.metrics.reach.toLocaleString('en-GB')} reach · {post.metrics.likes} likes
                        </span>
                      ) : null}
                    </Link>
                  ))}
                  {selectedMilestones.map(({ milestone }) => {
                    const done = milestone.checklist.filter((item) => item.done).length;
                    return (
                      <button
                        key={`dm-${milestone.id}`}
                        type="button"
                        className={`cal-dayrow ${milestone.done ? 'done' : ''}`}
                        onClick={() => openEdit(milestone)}
                      >
                        <span className={`cal-kind ${milestone.kind}`}>{milestoneKindLabel(milestone.kind)}</span>
                        <strong>{milestone.title}</strong>
                        {milestone.note ? <span className="small muted">{milestone.note}</span> : null}
                        {milestone.checklist.length ? (
                          <span className="cal-checkline">
                            <span className="cal-checkbar">
                              <span style={{ width: `${Math.round((done / milestone.checklist.length) * 100)}%` }} />
                            </span>
                            <span className="mono small muted">
                              {done}/{milestone.checklist.length} done
                            </span>
                          </span>
                        ) : null}
                        {milestone.done ? <span className="cal-done">done</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <IconClock size={16} />
                Upcoming
              </div>
            </div>
            <div className="panel-body">
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<IconCalendar size={22} />}
                  title="Nothing upcoming"
                  hint="Add a release, a show or a deadline and it shows up here."
                />
              ) : (
                <div className="cal-upcoming">
                  {upcoming.map((entry) =>
                    entry.href ? (
                      <Link key={entry.id} href={entry.href} className="cal-upnext">
                        <span className="cal-dot post" />
                        <span className="cal-upnext-main">
                          <strong className="truncate">{entry.title}</strong>
                          <span className="mono small muted">{formatDate(entry.date)}</span>
                        </span>
                        <span className="cal-kind post">Post</span>
                      </Link>
                    ) : (
                      <button
                        key={entry.id}
                        type="button"
                        className="cal-upnext"
                        onClick={() => {
                          const milestone = milestones.find((item) => `m-${item.id}` === entry.id);
                          setSelectedDay(entry.date);
                          if (milestone) openEdit(milestone);
                        }}
                      >
                        <span className={`cal-dot ${entry.kind}`} />
                        <span className="cal-upnext-main">
                          <strong className="truncate">{entry.title}</strong>
                          <span className="mono small muted">{formatDate(entry.date)}</span>
                        </span>
                        <span className={`cal-kind ${entry.kind}`}>{milestoneKindLabel(entry.kind)}</span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit milestone' : 'New milestone'}
        subtitle="Releases, shows, deadlines – anything the band has to remember."
        footer={
          <>
            {draft?.id ? (
              <button type="button" className="btn btn-danger" onClick={remove}>
                <IconTrash size={15} /> Delete
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              <IconCheck size={15} /> {saving ? 'Saving …' : 'Save'}
            </button>
          </>
        }
      >
        {draft ? (
          <div className="form-grid">
            <Field label="Title">
              <input
                className="input"
                autoFocus
                value={draft.title}
                placeholder="Show Halle, Fracture release, print deadline …"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>
            <div className="form-row">
              <Field label="Date">
                <input
                  className="input"
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                />
              </Field>
              <Field label="Type">
                <select
                  className="select"
                  value={draft.kind}
                  onChange={(event) => setDraft({ ...draft, kind: event.target.value as MilestoneKind })}
                >
                  {MILESTONE_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Note" hint={<span className="count">optional</span>}>
              <textarea
                className="textarea"
                rows={3}
                value={draft.note}
                placeholder="Load-in 16:30, doors 20:15 …"
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
            </Field>

            <div className="checklist-editor">
              <div className="checklist-head">
                <span className="label">Checklist</span>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        checklist: [
                          ...draft.checklist,
                          ...RELEASE_CHECKLIST.filter(
                            (label) => !draft.checklist.some((item) => item.label === label)
                          ).map((label) => ({ label, done: false })),
                        ],
                      })
                    }
                  >
                    Release checklist
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setDraft({ ...draft, checklist: [...draft.checklist, { label: '', done: false }] })}
                  >
                    <IconPlus size={13} /> Item
                  </button>
                </div>
              </div>
              {draft.checklist.length === 0 ? (
                <p className="small muted" style={{ margin: 0 }}>
                  No items yet. The release checklist gives you a head start.
                </p>
              ) : (
                <div className="checklist-items">
                  {draft.checklist.map((item, index) => (
                    <div className="checklist-item" key={`${index}-${item.label}`}>
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(event) => {
                          const next = [...draft.checklist];
                          next[index] = { ...item, done: event.target.checked };
                          setDraft({ ...draft, checklist: next });
                        }}
                      />
                      <input
                        className="input"
                        value={item.label}
                        placeholder="What has to be done?"
                        onChange={(event) => {
                          const next = [...draft.checklist];
                          next[index] = { ...item, label: event.target.value };
                          setDraft({ ...draft, checklist: next });
                        }}
                      />
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Remove"
                        onClick={() =>
                          setDraft({ ...draft, checklist: draft.checklist.filter((_, position) => position !== index) })
                        }
                      >
                        <IconX size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={draft.done}
                onChange={(event) => setDraft({ ...draft, done: event.target.checked })}
              />
              <span>Done</span>
            </label>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
