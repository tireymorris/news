import { styles } from "@/styles";

type HeaderProps = {
  lastUpdated?: string | null;
};

export default function Header({ lastUpdated }: HeaderProps) {
  return (
    <header class={styles.header.container}>
      <a href="/" target="body" trigger="click" class="block no-underline">
        <div class={styles.header.content}>
          <p class={styles.header.lastUpdated}>The Latest in Technology & Culture</p>
          <h1 class={styles.header.title}>hyperwave</h1>
          <div class="flex items-center gap-4 mt-4">
            <span class="date-stamp">Est. 2024</span>
            <span class="w-px h-4 bg-border"></span>
            <span class="date-stamp">{lastUpdated ? `Updated ${lastUpdated}` : 'Live'}</span>
          </div>
        </div>
      </a>
      <div class="h-1 bg-primary w-full"></div>
    </header>
  );
}