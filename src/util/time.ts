import db from "@/db";

export const SECONDS = 1000;
export const MINUTES = 60 * SECONDS;
export const HOURS = 60 * MINUTES;
export const DAYS = 24 * HOURS;
export const WEEKS = 7 * DAYS;

const generateRelativeTimeString = (diffInMillis: number): string => {
  const diffInSeconds = Math.floor(diffInMillis / SECONDS);
  const diffInMinutes = Math.floor(diffInMillis / MINUTES);
  const diffInHours = Math.floor(diffInMillis / HOURS);
  const diffInDays = Math.floor(diffInMillis / DAYS);
  const diffInWeeks = Math.floor(diffInMillis / WEEKS);

  if (diffInSeconds < 60) return "a few seconds ago";
  if (diffInMinutes === 1) return "a minute ago";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours === 1) return "an hour ago";
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays === 1) return "yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInWeeks === 1) return "a week ago";
  return `${diffInWeeks} weeks ago`;
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMillis = now.getTime() - date.getTime();
  return generateRelativeTimeString(diffInMillis);
};

export const getLastUpdatedTimestamp = (): Date | null => {
  const result = db
    .prepare("SELECT created_at FROM articles ORDER BY created_at DESC LIMIT 1")
    .get() as { created_at: string } | undefined;

  return result ? new Date(result.created_at) : null;
};

export const getLastFetchTime = (): Date | null => {
  const result = db
    .prepare("SELECT value FROM fetch_metadata WHERE key = 'last_fetch_time'")
    .get() as { value: string } | undefined;

  return result ? new Date(result.value) : null;
};

export const updateLastFetchTime = (): void => {
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT OR REPLACE INTO fetch_metadata (key, value, updated_at) 
    VALUES ('last_fetch_time', ?, CURRENT_TIMESTAMP)
  `
  ).run(now);
};

export const shouldFetchArticles = (): boolean => {
  const lastFetchTime = getLastFetchTime();
  if (!lastFetchTime) {
    return true;
  }

  const now = new Date();
  const timeDiff = now.getTime() - lastFetchTime.getTime();

  return timeDiff >= 1 * MINUTES;
};
