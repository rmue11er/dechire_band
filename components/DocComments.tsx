'use client';

import { useState, type FormEvent } from 'react';
import { formatDateTime } from '@/lib/format';
import type { DocumentComment } from '@/lib/types';

export default function DocComments({
  token,
  initial,
}: {
  token: string;
  initial: DocumentComment[];
}) {
  const [comments, setComments] = useState<DocumentComment[]>(initial);
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending || body.trim().length < 2) return;
    setSending(true);
    setError('');
    setSent(false);
    try {
      const response = await fetch(`/api/share/${encodeURIComponent(token)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, body, website }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not post the comment');
      setComments((current) => [...current, data.comment]);
      setBody('');
      setSent(true);
    } catch (issue: any) {
      setError(issue.message ?? 'Could not post the comment');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="doc-comments" aria-labelledby="doc-comments-title">
      <div className="doc-comments-head">
        <div>
          <span className="doc-comments-kicker">
            <span aria-hidden="true">///</span> Feedback
          </span>
          <h2 id="doc-comments-title">Notes on this sheet</h2>
        </div>
        <span className="doc-comments-count">
          {comments.length} {comments.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {comments.length ? (
        <ul className="doc-comments-list">
          {comments.map((comment) => (
            <li key={comment.id} className="doc-comment">
              <div className="doc-comment-meta">
                <strong>{comment.author}</strong>
                <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="doc-comments-empty">
          No notes yet. If something is unclear or missing, leave a line here.
        </p>
      )}

      <form className="doc-comments-form" onSubmit={submit}>
        <div className="doc-comments-form-head">
          <span className="label">Leave a note</span>
          <span className="doc-comments-hint">Visible to anyone with this link.</span>
        </div>

        <label className="doc-comments-field">
          <span className="label">
            Your name <em>optional</em>
          </span>
          <input
            className="input"
            value={author}
            maxLength={60}
            autoComplete="name"
            placeholder="anonymous"
            onChange={(event) => setAuthor(event.target.value)}
          />
        </label>

        <label className="doc-comments-field">
          <span className="label">Comment</span>
          <textarea
            className="textarea"
            rows={4}
            value={body}
            maxLength={2000}
            required
            placeholder="What should we change, add or keep?"
            onChange={(event) => {
              setBody(event.target.value);
              setSent(false);
            }}
          />
        </label>

        <input
          className="doc-comments-trap"
          value={website}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          onChange={(event) => setWebsite(event.target.value)}
        />

        <div className="doc-comments-form-foot">
          <span className="doc-comments-hint">{body.length}/2000</span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={sending || body.trim().length < 2}
          >
            {sending ? 'Sending …' : 'Post comment'}
          </button>
        </div>

        {error ? (
          <p className="doc-comments-error" role="alert">
            {error}
          </p>
        ) : null}
        {sent && !error ? (
          <p className="doc-comments-ok" role="status">
            Thank you – your note is on the sheet.
          </p>
        ) : null}
      </form>
    </section>
  );
}