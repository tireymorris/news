import { styles } from "@/styles";

type HeaderProps = {
  lastUpdated?: string | null;
};

export default function Header({ lastUpdated }: HeaderProps) {
  return (
    <header
      class={styles.header.container}
      href="/"
      target="body"
      trigger="click"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        class={styles.header.icon}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6h16M4 10h16M4 14h10M4 18h10M2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4"
        />
      </svg>
      <div class={styles.header.content}>
        <h1 class={styles.header.title}>hyperwave news</h1>
        {lastUpdated && (
          <p class={styles.header.lastUpdated}>Last updated: {lastUpdated}</p>
        )}
      </div>
    </header>
  );
}
