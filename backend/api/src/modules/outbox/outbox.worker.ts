import type { Database } from '@adflow/db';
import { OutboxActivityPublisher } from './outbox-activity.publisher.js';
import { OutboxDispatcher } from './outbox.dispatcher.js';

export type OutboxWorker = { close(): void };

/** Runs a bounded projection loop. Postgres remains the source if this worker is temporarily down. */
export function startOutboxWorker(db: Database): OutboxWorker {
  const dispatcher = new OutboxDispatcher(db, new OutboxActivityPublisher(db));
  let running = false;
  const dispatch = async () => {
    if (running) return;
    running = true;
    try {
      await dispatcher.dispatchPending();
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void dispatch().catch(() => undefined), 1_000);
  void dispatch().catch(() => undefined);
  return { close: () => clearInterval(timer) };
}
