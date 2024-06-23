import db from "./db";

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return "less than a minute ago";
  } else if (diffInMinutes < 5) {
    return "less than 5 minutes ago";
  } else if (diffInMinutes < 10) {
    return "less than 10 minutes ago";
  } else if (diffInMinutes < 30) {
    return "less than a half hour ago";
  } else if (diffInMinutes < 60) {
    return "less than an hour ago";
  } else if (diffInHours < 2) {
    return "less than two hours ago";
  } else if (diffInHours < 4) {
    return "less than four hours ago";
  } else if (diffInHours < 8) {
    return "less than eight hours ago";
  } else if (diffInHours < 12) {
    return "less than twelve hours ago";
  } else if (diffInHours < 24) {
    return "less than a day ago";
  } else if (diffInDays === 1) {
    return "1 day ago";
  } else if (diffInDays === 2) {
    return "2 days ago";
  } else if (diffInDays === 3) {
    return "3 days ago";
  } else if (diffInDays <= 7) {
    return "several days ago";
  } else {
    const formatter = new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    });
    return formatter.format(date);
  }
};

export const getLastUpdatedTimestamp = (): Date | null => {
  const result = db
    .prepare("SELECT created_at FROM articles ORDER BY created_at DESC LIMIT 1")
    .get() as { created_at: string } | undefined;

  return result ? new Date(result.created_at) : null;
};

export default formatRelativeTime;
