import { styles } from "@/styles";

type HeaderProps = {
  lastUpdated?: string | null;
};

export default function Header({ lastUpdated }: HeaderProps) {
  return (
    <header class={styles.header.container}>
      <a href="/" target="body" trigger="click" class={styles.util.blockLink}>
        <div class={styles.header.content}>
          <div class={styles.header.titleRow}>
            <span class={styles.header.subtitle}>Daily Brief</span>
            <h1 class={styles.header.title}>hyperwave.news</h1>
          </div>

          <div class={styles.header.metaRow}>
            <span class={styles.util.flexCenter}>
              <span class={styles.header.liveDot}></span>
              <span class={styles.util.timestamp}>Today</span>
            </span>
            <span class={styles.header.divider}></span>
            <span class={styles.util.timestamp}>{lastUpdated ? `Updated ${lastUpdated}` : 'Loading...'}</span>
          </div>
        </div>
      </a>
    </header>
  );
}
