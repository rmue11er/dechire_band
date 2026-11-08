'use client';

import { useEffect, useRef, useState } from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconClock,
  IconDatabase,
  IconDocument,
  IconDownload,
  IconEye,
  IconImage,
  IconInstagram,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconUpload,
} from '@/components/icons';
import MediaPicker from '@/components/MediaPicker';
import { Field, PageHead, Spinner } from '@/components/ui';
import { DEFAULT_ACCENT, DEFAULT_PALETTE, PALETTE_ROLES, applyAccent, isHex, isLightHex } from '@/lib/palette';
import { toast } from '@/lib/toast';
import type { MediaItem, PaletteColor, Profile, TrashEntry } from '@/lib/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState({
    bandName: '',
    handle: '',
    bio: '',
    website: '',
    followers: '0',
    following: '0',
    highlights: '',
    avatarMediaId: null as number | null,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [docMediaId, setDocMediaId] = useState<number | null>(null);
  const [docImageUrl, setDocImageUrl] = useState<string | null>(null);
  const [docMark, setDocMark] = useState(30);
  const [docSaving, setDocSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [removingDemo, setRemovingDemo] = useState(false);
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [paletteSaving, setPaletteSaving] = useState(false);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [accent2, setAccent2] = useState<string | null>(null);
  const [accentSaving, setAccentSaving] = useState(false);
  const accentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ig, setIg] = useState({
    accountId: '',
    username: '',
    publicBase: '',
    sandbox: true,
    live: false,
    hasToken: false,
  });
  const [igToken, setIgToken] = useState('');
  const [igBusy, setIgBusy] = useState<string | null>(null);
  const [scheduler, setScheduler] = useState<any>(null);
  const [schedulerBusy, setSchedulerBusy] = useState<string | null>(null);
  const [trash, setTrash] = useState<TrashEntry[]>([]);
  const [backupBusy, setBackupBusy] = useState<string | null>(null);
  const restoreInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [profileResponse, mediaResponse, paletteResponse] = await Promise.all([
      fetch('/api/profile'),
      fetch('/api/media'),
      fetch('/api/palette'),
    ]);
    const profileData = await profileResponse.json();
    const mediaData = await mediaResponse.json();
    const paletteData = await paletteResponse.json();
    setPalette(paletteData.colors ?? DEFAULT_PALETTE);
    const next: Profile = profileData.profile;
    setProfile(next);
    setAccent(next.accentHex ?? DEFAULT_ACCENT);
    setAccent2(next.accent2Hex ?? null);
    setMedia(mediaData.media ?? []);
    setForm({
      bandName: next.bandName,
      handle: next.handle,
      bio: next.bio,
      website: next.website,
      followers: String(next.followers),
      following: String(next.following),
      highlights: next.highlightNames.join(', '),
      avatarMediaId: next.avatarMediaId,
    });
    setAvatarUrl(next.avatarUrl);
    setDocMediaId(next.docMediaId ?? null);
    setDocImageUrl(next.docImageUrl ?? null);
    setDocMark(next.docMarkStrength ?? 30);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    fetch('/api/instagram')
      .then((response) => response.json())
      .then((data) => {
        const connection = data.connection ?? {};
        setIg({
          accountId: connection.accountId ?? '',
          username: connection.username ?? '',
          publicBase: connection.publicBase ?? '',
          sandbox: connection.sandbox !== false,
          live: Boolean(connection.live),
          hasToken: Boolean(connection.hasToken),
        });
      })
      .catch(() => undefined);

    fetch('/api/trash')
      .then((response) => response.json())
      .then((data) => setTrash(data.trash ?? []))
      .catch(() => setTrash([]));

    fetch('/api/scheduler')
      .then((response) => response.json())
      .then((data) => setScheduler(data.scheduler ?? null))
      .catch(() => setScheduler(null));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandName: form.bandName,
          handle: form.handle,
          bio: form.bio,
          website: form.website,
          followers: Number(form.followers) || 0,
          following: Number(form.following) || 0,
          avatarMediaId: form.avatarMediaId,
          highlightNames: form.highlights
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      setProfile(data.profile);
      setAvatarUrl(data.profile.avatarUrl);
      toast('Profile saved');
    } catch (error: any) {
      toast(error.message ?? 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveDocSheet = async (patch: { docMediaId?: number | null; docMarkStrength?: number }) => {
    setDocSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      setProfile(data.profile);
      setDocMediaId(data.profile.docMediaId ?? null);
      setDocImageUrl(data.profile.docImageUrl ?? null);
      setDocMark(data.profile.docMarkStrength ?? 30);
      toast('Document sheet updated');
    } catch (error: any) {
      toast(error.message ?? 'Failed to save', 'error');
    } finally {
      setDocSaving(false);
    }
  };

  const updateColor = (index: number, patch: Partial<PaletteColor>) => {    setPalette((current) => current.map((color, position) => (position === index ? { ...color, ...patch } : color)));
  };

  const moveColor = (index: number, direction: -1 | 1) => {
    setPalette((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addColor = () => {
    setPalette((current) => [
      ...current,
      { name: `Color ${current.length + 1}`, hex: '#b9a5e8', role: 'custom' },
    ]);
  };

  const removeColor = (index: number) => {
    setPalette((current) => current.filter((_, position) => position !== index));
  };

  const loadDefaults = () => {
    setPalette(DEFAULT_PALETTE.map((color) => ({ ...color })));
    toast('Recommended CI loaded – remember to save', 'info');
  };

  const savePalette = async () => {
    if (!palette.length) {
      toast('The CI needs at least one color', 'error');
      return;
    }
    if (palette.some((color) => !isHex(color.hex))) {
      toast('Please provide every color as a hex value (#rrggbb)', 'error');
      return;
    }
    setPaletteSaving(true);
    try {
      const response = await fetch('/api/palette', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colors: palette }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      setPalette(data.colors);
      window.dispatchEvent(new CustomEvent('palette:updated', { detail: data.colors }));
      toast('CI palette saved – active in every color picker');
    } catch (error: any) {
      toast(error.message ?? 'Failed to save', 'error');
    } finally {
      setPaletteSaving(false);
    }
  };

  const persistAccent = async (hex: string, hex2: string | null) => {
    setAccentSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accentHex: hex, accent2Hex: hex2 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Failed to save');
      setProfile(data.profile);
      window.dispatchEvent(new CustomEvent('accent:updated', { detail: { accent: hex, accent2: hex2 } }));
      toast('Accent colour saved');
    } catch (error: any) {
      toast(error.message ?? 'Failed to save', 'error');
    } finally {
      setAccentSaving(false);
    }
  };

  const queueAccentSave = (hex: string, hex2: string | null) => {
    if (accentTimer.current) clearTimeout(accentTimer.current);
    accentTimer.current = setTimeout(() => persistAccent(hex, hex2), 450);
  };

  const pickAccent = (hex: string) => {
    if (!isHex(hex)) return;
    const value = hex.toLowerCase();
    setAccent(value);
    applyAccent(value, accent2);
    queueAccentSave(value, accent2);
  };

  const pickAccent2 = (hex: string | null) => {
    const value = hex && isHex(hex) ? hex.toLowerCase() : null;
    setAccent2(value);
    applyAccent(accent, value);
    queueAccentSave(accent, value);
  };

  /* instagram ------------------------------------------------------------ */

  const igSave = async (action: 'save' | 'disconnect') => {
    setIgBusy(action);
    try {
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'disconnect'
            ? { action }
            : {
                action,
                accountId: ig.accountId,
                username: ig.username,
                publicBase: ig.publicBase,
                sandbox: ig.sandbox,
                token: igToken || undefined,
              }
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save');
      const connection = data.connection ?? {};
      setIg({
        accountId: connection.accountId ?? '',
        username: connection.username ?? '',
        publicBase: connection.publicBase ?? '',
        sandbox: connection.sandbox !== false,
        live: Boolean(data.live),
        hasToken: Boolean(connection.hasToken),
      });
      setIgToken('');
      toast(action === 'disconnect' ? 'Instagram disconnected' : 'Instagram settings saved');
    } catch (error: any) {
      toast(error.message ?? 'Could not save', 'error');
    } finally {
      setIgBusy(null);
    }
  };

  const igTest = async () => {
    setIgBusy('test');
    try {
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Connection failed');
      toast(
        data.sandbox
          ? `Sandbox OK – pretending to be @${data.result.username}`
          : `Connected as @${data.result.username}`
      );
    } catch (error: any) {
      toast(error.message ?? 'Connection failed', 'error');
    } finally {
      setIgBusy(null);
    }
  };

  /* backup & trash -------------------------------------------------------- */

  const downloadBackup = () => {
    setBackupBusy('backup');
    const link = document.createElement('a');
    link.href = '/api/backup';
    link.click();
    setTimeout(() => setBackupBusy(null), 1200);
    toast('Backup is being prepared');
  };

  const restoreBackup = async (file: File | null | undefined) => {
    if (!file) return;
    if (!window.confirm('Replace ALL current data with this backup?')) return;
    setBackupBusy('restore');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/restore', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Restore failed');
      toast('Backup restored – reloading');
      setTimeout(() => window.location.reload(), 900);
    } catch (error: any) {
      toast(error.message ?? 'Restore failed', 'error');
    } finally {
      setBackupBusy(null);
      if (restoreInput.current) restoreInput.current.value = '';
    }
  };

  const restoreTrashEntry = async (id: number) => {
    try {
      const response = await fetch(`/api/trash/${id}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not restore');
      setTrash((current) => current.filter((entry) => entry.id !== id));
      toast('Restored');
    } catch (error: any) {
      toast(error.message ?? 'Could not restore', 'error');
    }
  };

  const removeTrashEntry = async (id: number) => {
    const response = await fetch(`/api/trash/${id}`, { method: 'DELETE' });
    if (response.ok) setTrash((current) => current.filter((entry) => entry.id !== id));
  };

  const emptyTrash = async () => {
    if (!window.confirm('Delete everything in the bin? This cannot be undone.')) return;
    const response = await fetch('/api/trash', { method: 'DELETE' });
    if (response.ok) {
      setTrash([]);
      toast('Bin emptied');
    }
  };

  /* auto-publish scheduler ------------------------------------------------ */

  const refreshScheduler = () =>
    fetch('/api/scheduler')
      .then((response) => response.json())
      .then((data) => setScheduler(data.scheduler ?? null))
      .catch(() => undefined);

  const toggleScheduler = async (enabled: boolean) => {
    setSchedulerBusy('toggle');
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not change the setting');
      setScheduler(data.scheduler ?? null);
      toast(enabled ? 'Auto-publish switched on' : 'Auto-publish switched off');
    } catch (error: any) {
      toast(error.message ?? 'Could not change the setting', 'error');
    } finally {
      setSchedulerBusy(null);
    }
  };

  const runSchedulerNow = async () => {
    setSchedulerBusy('run');
    try {
      const response = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not run the scheduler');
      const summary = data.summary ?? {};
      setScheduler(data.scheduler ?? null);
      if (summary.skipped) toast(summary.skipped, 'error');
      else toast(`${summary.published ?? 0} published · ${summary.failed ?? 0} failed`);
    } catch (error: any) {
      toast(error.message ?? 'Could not run the scheduler', 'error');
    } finally {
      setSchedulerBusy(null);
    }
  };

  const reset = async () => {
    if (!window.confirm('Really reset ALL data? Uploads, posts, notes, documents and designs will be deleted.')) return;
    if (!window.confirm('Final warning: this cannot be undone.')) return;
    setResetting(true);
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      if (!response.ok) throw new Error('Reset failed');
      toast('Demo data restored');
      window.location.reload();
    } catch (error: any) {
      toast(error.message, 'error');
      setResetting(false);
    }
  };

  const removeDemo = async () => {
    if (
      !window.confirm(
        'Remove every piece of demo content? Posts, media files, notes, milestones, documents, snippets, performance numbers and the bin. Nothing is restored afterwards.'
      )
    ) {
      return;
    }
    if (!window.confirm('Last chance: this cannot be undone. Continue?')) return;
    setRemovingDemo(true);
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'demo' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not remove the demo data');
      const removed = data.removed ?? {};
      toast(
        `Demo data gone – ${removed.posts ?? 0} posts, ${removed.media ?? 0} assets, ${removed.notes ?? 0} notes`
      );
      window.location.reload();
    } catch (error: any) {
      toast(error.message, 'error');
      setRemovingDemo(false);
    }
  };

  if (!profile) return <Spinner label="Loading profile" />;

  return (
    <>
      <PageHead
        eyebrow="Settings"
        title={
          <>
            Band<span className="slash">/</span>Profile
          </>
        }
        sub="This data feeds the Instagram preview in the planner. Handle, bio, followers – as real as the feed itself."
        actions={
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <IconCheck size={15} />
            {saving ? 'Saving …' : 'Save'}
          </button>
        }
      />

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <IconImage size={16} />
              Profile
            </div>
          </div>
          <div className="panel-body form-grid">
            <div className="avatar-row">
              <div className="avatar-preview">
                {avatarUrl ? <img src={avatarUrl} alt={form.bandName} /> : <span>D</span>}
              </div>
              <div>
                <button type="button" className="btn btn-sm" onClick={() => setPickerOpen(true)}>
                  <IconUpload size={14} /> Avatar from library
                </button>
                <p className="small muted" style={{ marginTop: 8 }}>
                  Best to use the logo in its “Social Avatar” version (1:1).
                </p>
              </div>
            </div>

            <div className="form-row">
              <Field label="Band name">
                <input
                  className="input"
                  value={form.bandName}
                  onChange={(event) => setForm({ ...form, bandName: event.target.value })}
                />
              </Field>
              <Field label="Handle" hint={<span className="count">without @</span>}>
                <input
                  className="input"
                  value={form.handle}
                  onChange={(event) => setForm({ ...form, handle: event.target.value })}
                />
              </Field>
            </div>

            <Field label="Bio" hint={<span className="count">line breaks allowed</span>}>
              <textarea
                className="textarea"
                rows={4}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </Field>

            <div className="form-row">
              <Field label="Website / link">
                <input
                  className="input"
                  value={form.website}
                  onChange={(event) => setForm({ ...form, website: event.target.value })}
                />
              </Field>
              <Field label="Highlights" hint={<span className="count">comma separated</span>}>
                <input
                  className="input"
                  value={form.highlights}
                  onChange={(event) => setForm({ ...form, highlights: event.target.value })}
                />
              </Field>
            </div>

            <div className="form-row">
              <Field label="Follower">
                <input
                  className="input"
                  type="number"
                  value={form.followers}
                  onChange={(event) => setForm({ ...form, followers: event.target.value })}
                />
              </Field>
              <Field label="Following">
                <input
                  className="input"
                  type="number"
                  value={form.following}
                  onChange={(event) => setForm({ ...form, following: event.target.value })}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">
              <IconDatabase size={16} />
              System
            </div>
          </div>
          <div className="panel-body">
            <div className="system-list">
              <div className="system-row">
                <span className="mono">Database</span>
                <span className="mono muted">data/band.db (SQLite)</span>
              </div>
              <div className="system-row">
                <span className="mono">Uploads</span>
                <span className="mono muted">data/uploads/</span>
              </div>
              <div className="system-row">
                <span className="mono">Media</span>
                <span className="mono muted">{media.length} files</span>
              </div>
              <div className="system-row">
                <span className="mono">API</span>
                <span className="mono muted">/api/posts · /api/media · /api/notes</span>
              </div>
              <div className="system-row">
                <span className="mono">Docs</span>
                <span className="mono muted">/api/documents · /api/milestones</span>
              </div>
              <div className="system-row">
                <span className="mono">Export</span>
                <span className="mono muted">/api/export/plan · /api/export/post/:id</span>
              </div>
            </div>

            <div className="danger-zone">
              <div>
                <strong>Remove all demo data</strong>
                <p className="small muted">
                  Deletes posts, media files, notes, milestones, documents, snippets, performance numbers
                  and the bin – and empties the band profile. Nothing comes back, so you can start with your
                  own stuff. Designs, website settings, CI palette and fonts stay.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={removeDemo}
                disabled={removingDemo || resetting}
              >
                <IconTrash size={14} />
                {removingDemo ? 'Removing …' : 'Remove demo data'}
              </button>
            </div>

            <div className="danger-zone">
              <div>
                <strong>Reset everything</strong>
                <p className="small muted">
                  Deletes posts, media, notes, designs and uploads, resets the CI palette and restores the demo
                  data.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={reset}
                disabled={resetting || removingDemo}
              >
                <IconTrash size={14} />
                {resetting ? 'Resetting …' : 'Reset'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="panel accent-panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconEye size={16} />
            Interface accent
          </div>
          <span className="mono small muted">
            {accentSaving ? 'Saving …' : accent2 ? `${accent} + ${accent2}` : accent}
          </span>
        </div>
        <div className="panel-body">
          <p className="palette-intro">
            The accent colour drives buttons, active navigation, focus rings, highlights – and every document
            sheet. Pick a second colour if you want two-tone gradients and stamps; leave it on <em>Auto</em> and
            the second tone is derived from the first one.
          </p>

          <div className="accent-rows">
            <div className="accent-row">
              <div className="accent-row-label">
                <span className="mono small muted">Primary</span>
                <span className="accent-value" style={{ background: isHex(accent) ? accent : DEFAULT_ACCENT }}>
                  {accent}
                </span>
              </div>

              <div className="accent-picker">
                <div className="accent-swatches">
                  {palette.map((color) => (
                    <button
                      key={`accent-${color.name}-${color.hex}`}
                      type="button"
                      className={`accent-swatch ${accent.toLowerCase() === color.hex.toLowerCase() ? 'on' : ''}`}
                      style={{ background: isHex(color.hex) ? color.hex : '#000000' }}
                      title={`${color.name} · ${color.hex}`}
                      aria-label={`${color.name} ${color.hex}`}
                      onClick={() => pickAccent(color.hex)}
                    />
                  ))}
                  <label className="accent-swatch custom" title="Pick any colour">
                    <input
                      type="color"
                      value={isHex(accent) ? accent : DEFAULT_ACCENT}
                      onChange={(event) => pickAccent(event.target.value)}
                    />
                  </label>
                </div>

                <div className="accent-manual">
                  <input
                    className="input mono accent-hex"
                    value={accent}
                    spellCheck={false}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAccent(value);
                      if (isHex(value)) pickAccent(value);
                    }}
                  />
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => pickAccent(DEFAULT_ACCENT)}>
                    CI primary
                  </button>
                </div>
              </div>
            </div>

            <div className="accent-row">
              <div className="accent-row-label">
                <span className="mono small muted">Secondary</span>
                <span className="accent-value muted">{accent2 ?? 'auto'}</span>
              </div>

              <div className="accent-picker">
                <div className="accent-swatches">
                  <button
                    type="button"
                    className={`accent-swatch auto ${accent2 ? '' : 'on'}`}
                    title="Auto – derived from the primary accent"
                    onClick={() => pickAccent2(null)}
                  >
                    A
                  </button>
                  {palette.map((color) => (
                    <button
                      key={`accent2-${color.name}-${color.hex}`}
                      type="button"
                      className={`accent-swatch ${
                        accent2 && accent2.toLowerCase() === color.hex.toLowerCase() ? 'on' : ''
                      }`}
                      style={{ background: isHex(color.hex) ? color.hex : '#000000' }}
                      title={`${color.name} · ${color.hex}`}
                      aria-label={`${color.name} ${color.hex}`}
                      onClick={() => pickAccent2(color.hex)}
                    />
                  ))}
                  <label className="accent-swatch custom" title="Pick any colour">
                    <input
                      type="color"
                      value={isHex(accent2 ?? '') ? (accent2 as string) : accent}
                      onChange={(event) => pickAccent2(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="accent-preview">
            <button type="button" className="btn btn-primary btn-sm">
              <IconCheck size={14} /> Primary button
            </button>
            <span className="chip accent">Active chip</span>
            <span className="accent-preview-dot" />
            <span className="accent-preview-two-tone" aria-hidden="true" />
            <span className="mono small muted">preview</span>
          </div>
        </div>
      </section>

      <section className="panel docsheet-panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconDocument size={16} />
            Document sheet
          </div>
          <span className="mono small muted">{docSaving ? 'Saving …' : docImageUrl ? 'image set' : 'no image'}</span>
        </div>
        <div className="panel-body">
          <p className="palette-intro">
            Documents are laid out like a flyer on bone paper: dark masthead with the band name, accent stamp
            and a photo behind it. The photo is optional – without one the masthead stays plain black.
          </p>

          <div className="docsheet-grid">
            <div className="docsheet-preview" aria-hidden="true">
              {docImageUrl ? <img className="docsheet-preview-photo" src={docImageUrl} alt="" style={{ opacity: (docMark / 100) * 1.4 }} /> : null}
              <span className="docsheet-preview-veil" />
              <div className="docsheet-preview-head">
                <strong>DECHIRE</strong>
                <em>Final</em>
              </div>
              <span className="docsheet-preview-bar" />
              <div className="docsheet-preview-lines">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="docsheet-controls">
              <div className="docsheet-thumb">
                {docImageUrl ? <img src={docImageUrl} alt="" /> : <span>no image</span>}
              </div>

              <div className="docsheet-actions">
                <button type="button" className="btn btn-sm" onClick={() => setDocPickerOpen(true)}>
                  <IconImage size={14} />
                  {docImageUrl ? 'Change image' : 'Choose image'}
                </button>
                {docImageUrl ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => saveDocSheet({ docMediaId: null })}
                  >
                    <IconTrash size={14} /> Remove
                  </button>
                ) : null}
              </div>

              <label className={`docsheet-strength ${docImageUrl ? '' : 'is-disabled'}`}>
                <span>
                  Strength <em>{docMark}%</em>
                </span>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={docMark}
                  disabled={!docImageUrl}
                  onChange={(event) => setDocMark(Number(event.target.value))}
                  onPointerUp={() => saveDocSheet({ docMarkStrength: docMark })}
                  onKeyUp={() => saveDocSheet({ docMarkStrength: docMark })}
                />
              </label>

              <p className="docsheet-hint">
                The photo sits in the dark masthead of the sheet – 20–40% keeps the band name readable.
                Use a live shot, a poster or a texture from your media library.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconInstagram size={16} />
            Instagram
          </div>
          <span className={`ig-state ${ig.live ? 'live' : 'sandbox'}`}>
            {ig.live ? `live · @${ig.username || 'account'}` : 'sandbox mode'}
          </span>
        </div>
        <div className="panel-body form-grid">
          <p className="palette-intro">
            Publishing and insights run through the Meta Graph API. For real posts you need an Instagram
            <strong> business account</strong>, a Meta app with <code>instagram_content_publish</code> and{' '}
            <code>instagram_manage_insights</code> (app review), and <strong>publicly reachable media URLs</strong> –
            Instagram downloads the image itself, so localhost will not work. Put a tunnel or your domain into “public
            base URL”. Without credentials everything stays in sandbox mode: same buttons, simulated answers.
          </p>

          <div className="form-row">
            <Field label="Instagram business account id" hint={<span className="count">numeric id</span>}>
              <input
                className="input mono"
                placeholder="17841400000000000"
                value={ig.accountId}
                onChange={(event) => setIg({ ...ig, accountId: event.target.value })}
              />
            </Field>
            <Field label="Username" hint={<span className="count">without @</span>}>
              <input
                className="input"
                placeholder="dechire.band"
                value={ig.username}
                onChange={(event) => setIg({ ...ig, username: event.target.value })}
              />
            </Field>
          </div>

          <Field
            label="Access token"
            hint={<span className="count">{ig.hasToken ? 'stored – leave empty to keep' : 'not set'}</span>}
          >
            <input
              className="input mono"
              type="password"
              placeholder={ig.hasToken ? '••••••••••••' : 'IGQVJ…'}
              value={igToken}
              onChange={(event) => setIgToken(event.target.value)}
            />
          </Field>

          <div className="form-row">
            <Field label="Public base URL" hint={<span className="count">for the media files</span>}>
              <input
                className="input mono"
                placeholder="https://hq.dechire.band"
                value={ig.publicBase}
                onChange={(event) => setIg({ ...ig, publicBase: event.target.value })}
              />
            </Field>
            <div className="field">
              <span className="label">Mode</span>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={ig.sandbox}
                  onChange={(event) => setIg({ ...ig, sandbox: event.target.checked })}
                />
                <span>Sandbox (simulate, do not post for real)</span>
              </label>
            </div>
          </div>

          <div className="row wrap" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => igSave('save')}
              disabled={!!igBusy}
            >
              <IconCheck size={14} /> {igBusy === 'save' ? 'Saving …' : 'Save'}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={igTest} disabled={!!igBusy}>
              <IconInstagram size={14} /> {igBusy === 'test' ? 'Testing …' : 'Test connection'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => igSave('disconnect')}
              disabled={!!igBusy}
            >
              <IconTrash size={14} /> Disconnect
            </button>
          </div>

          <div className="sched-block">
            <div className="sched-head">
              <div>
                <span className="label">Auto-publish scheduled posts</span>
                <p className="small muted" style={{ margin: '4px 0 0' }}>
                  Posts go out when their scheduled time has come – while Band HQ is open in a tab (checked every
                  minute), or whenever a cron job calls <code>/api/scheduler</code>. Needs live mode; in sandbox
                  nothing is posted.
                </p>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={Boolean(scheduler?.enabled)}
                  disabled={schedulerBusy === 'toggle'}
                  onChange={(event) => toggleScheduler(event.target.checked)}
                />
                <span>{scheduler?.enabled ? 'on' : 'off'}</span>
              </label>
            </div>

            <div className="sched-stats">
              <div>
                <span className="mono small muted">Status</span>
                <strong className={scheduler?.live ? 'ok' : undefined}>
                  {scheduler?.live ? 'live' : scheduler?.sandbox ? 'sandbox' : 'not connected'}
                </strong>
              </div>
              <div>
                <span className="mono small muted">Due now</span>
                <strong>{scheduler?.dueNow ?? 0}</strong>
              </div>
              <div>
                <span className="mono small muted">Next</span>
                <strong className="truncate">
                  {scheduler?.next ? new Date(scheduler.next.at).toLocaleString('en-GB') : '—'}
                </strong>
              </div>
              <div>
                <span className="mono small muted">Last run</span>
                <strong>
                  {scheduler?.lastRunAt ? new Date(scheduler.lastRunAt).toLocaleString('en-GB') : 'never'}
                </strong>
              </div>
            </div>

            {scheduler?.enabled && !scheduler?.live ? (
              <p className="small sched-warn">
                Auto-publish is on, but Instagram is not connected in live mode – nothing will be posted.
              </p>
            ) : null}

            <div className="row wrap" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={runSchedulerNow}
                disabled={!!schedulerBusy}
              >
                <IconClock size={14} /> {schedulerBusy === 'run' ? 'Running …' : 'Run now'}
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={refreshScheduler}>
                Refresh status
              </button>
            </div>

            {scheduler?.log?.length ? (
              <div className="sched-log">
                {scheduler.log.slice(0, 4).map((entry: any) => (
                  <div key={entry.id} className="sched-log-row">
                    <span className="mono small muted">{new Date(entry.ranAt).toLocaleString('en-GB')}</span>
                    <span className="truncate">{entry.message}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconDatabase size={16} />
            Backup
          </div>
          <span className="mono small muted">ZIP · database + uploads</span>
        </div>
        <div className="panel-body form-grid">
          <p className="palette-intro">
            The backup contains the whole database (posts, media, notes, designs, milestones, documents, palette,
            profile) plus every uploaded file. Restoring replaces all current data — export first if you are unsure.
          </p>
          <div className="row wrap" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={downloadBackup} disabled={!!backupBusy}>
              <IconDownload size={15} /> {backupBusy === 'backup' ? 'Preparing …' : 'Download backup'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => restoreInput.current?.click()}
              disabled={!!backupBusy}
            >
              <IconUpload size={15} /> {backupBusy === 'restore' ? 'Restoring …' : 'Restore backup'}
            </button>
            <input
              ref={restoreInput}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(event) => restoreBackup(event.target.files?.[0])}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconTrash size={16} />
            Bin
          </div>
          <div className="row" style={{ gap: 8 }}>
            <span className="mono small muted">{trash.length} entries</span>
            {trash.length ? (
              <button type="button" className="btn btn-sm btn-danger" onClick={emptyTrash}>
                Empty bin
              </button>
            ) : null}
          </div>
        </div>
        <div className="panel-body">
          {trash.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>
              Deleted posts, documents, milestones and notes land here first – nothing is gone immediately.
            </p>
          ) : (
            <div className="trash-list">
              {trash.map((entry) => (
                <div className="trash-row" key={entry.id}>
                  <span className="chip">{entry.kind}</span>
                  <strong className="truncate">{entry.label}</strong>
                  <span className="mono small muted">{new Date(entry.deletedAt).toLocaleString('en-GB')}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => restoreTrashEntry(entry.id)}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Delete for good"
                    onClick={() => removeTrashEntry(entry.id)}
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel palette-panel">
        <div className="panel-head">
          <div className="panel-title">
            <IconSparkles size={16} />
            CI Palette
          </div>
          <span className="mono small muted">{palette.length} colors</span>
        </div>
        <div className="panel-body">
          <p className="palette-intro">
            These colors now appear in <strong>every color picker</strong> of the design studio – as “Band CI”
            above the neutral tones. Define once, stay consistent: lavender as the core, bone as paper, rust and
            wound for emotion, moss and fog as the cool counterweight.
          </p>

          <div className="palette-editor">
            {palette.map((color, index) => (
              <div className="palette-row" key={`${color.hex}-${index}`}>
                <label
                  className="color-swatch-btn palette-swatch"
                  style={{ background: isHex(color.hex) ? color.hex : '#000000' }}
                  title="Pick color"
                >
                  <input
                    type="color"
                    value={isHex(color.hex) ? color.hex : '#000000'}
                    onChange={(event) => updateColor(index, { hex: event.target.value })}
                  />
                </label>
                <input
                  className="input"
                  value={color.name}
                  placeholder="Name"
                  onChange={(event) => updateColor(index, { name: event.target.value })}
                />
                <input
                  className="input mono palette-hex"
                  value={color.hex}
                  spellCheck={false}
                  onChange={(event) => updateColor(index, { hex: event.target.value })}
                />
                <select
                  className="select palette-role"
                  value={color.role}
                  onChange={(event) => updateColor(index, { role: event.target.value })}
                >
                  {PALETTE_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <div className="palette-row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveColor(index, -1)}
                  >
                    <IconArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Move down"
                    disabled={index === palette.length - 1}
                    onClick={() => moveColor(index, 1)}
                  >
                    <IconArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Remove"
                    onClick={() => removeColor(index)}
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="palette-actions">
            <button type="button" className="btn btn-sm" onClick={addColor}>
              <IconPlus size={14} /> Add color
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={loadDefaults}>
Recommendation “Bruised Bloom”
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={savePalette}
              disabled={paletteSaving}
            >
              <IconCheck size={14} /> {paletteSaving ? 'Saving …' : 'Save palette'}
            </button>
          </div>

          <div className="palette-preview">
            {palette.map((color, index) => (
              <div
                key={`preview-${color.hex}-${index}`}
                className={`palette-preview-item ${isLightHex(color.hex) ? 'light' : ''}`}
                style={{ background: isHex(color.hex) ? color.hex : '#000000' }}
              >
                <strong>{color.name}</strong>
                <em>{color.hex}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MediaPicker
        open={docPickerOpen}
        onClose={() => setDocPickerOpen(false)}
        media={media}
        selectedIds={docMediaId ? [docMediaId] : []}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
        onConfirm={(ids) => {
          const id = ids[0] ?? null;
          setDocPickerOpen(false);
          if (id) saveDocSheet({ docMediaId: id });
        }}
      />

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        media={media}
        selectedIds={form.avatarMediaId ? [form.avatarMediaId] : []}
        onUploaded={(items) => setMedia((current) => [...items, ...current])}
        onConfirm={(ids) => {
          const id = ids[0] ?? null;
          const item = media.find((entry) => entry.id === id);
          setForm({ ...form, avatarMediaId: id });
          setAvatarUrl(item?.url ?? null);
        }}
      />
    </>
  );
}
