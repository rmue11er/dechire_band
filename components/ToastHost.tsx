'use client';

import { useEffect, useState } from 'react';
import { subscribeToasts, type ToastPayload } from '@/lib/toast';
import { IconCheck, IconX } from '@/components/icons';

export default function ToastHost() {
  const [items, setItems] = useState<ToastPayload[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToasts((payload) => {
      setItems((current) => [...current, payload].slice(-4));
      setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== payload.id));
      }, 3800);
    });
    return unsubscribe;
  }, []);

  if (!items.length) return null;

  return (
    <div className="toast-stack">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.kind}`}>
          {item.kind === 'error' ? <IconX size={16} /> : <IconCheck size={16} />}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
