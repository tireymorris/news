import { formatRelativeTime, getLastUpdatedTimestamp } from "util/time.ts";

export default async function Header() {
  const lastUpdatedDate = getLastUpdatedTimestamp();
  const lastUpdated = lastUpdatedDate
    ? formatRelativeTime(lastUpdatedDate)
    : null;

  return (
    <header
      className="flex w-full cursor-pointer items-center rounded-sm bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-white shadow-lg transition-colors hover:from-blue-600 hover:to-purple-600"
      href="/"
      target="body"
      trigger="click"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        className="mr-4 h-12 w-12"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6h16M4 10h16M4 14h10M4 18h10M2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4"
        />
      </svg>
      <div className="flex flex-col">
        <h1 className="font-serif text-xl italic">hyperwave news</h1>
        {lastUpdated && (
          <p className="mt-1 text-sm">Last updated: {lastUpdated}</p>
        )}
      </div>
    </header>
  );
}
