import { getDB } from '../db/sqlite';

export async function logIntent(message: string, parsed: any) {
  const db = await getDB();
  const timestamp = new Date().toISOString();
  const parsedStr = JSON.stringify(parsed);

  await db.run(
    `INSERT INTO intent_logs (timestamp, user_message, parsed_intent) VALUES (?, ?, ?)`,
    [timestamp, message, parsedStr]
  );
}
