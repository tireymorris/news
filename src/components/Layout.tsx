import Header from "components/Header";
import { styles } from "@/styles";

type LayoutProps = {
  title: string;
  children: any;
  lastUpdated?: string | null;
};

export default function Layout({ title, children, lastUpdated }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="hyperwave - your daily brief" />
        <title>{title}</title>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📰</text></svg>"
        />
        <link rel="stylesheet" href="/styles/globals.css" />
        <script src="/scripts/hyperwave.js"></script>
        <style>{styles.layout.resetStyle}</style>
        <style>{styles.theme.css}</style>
      </head>
      <body class={styles.layout.body}>
        <Header lastUpdated={lastUpdated} />
        {children}
      </body>
    </html>
  );
}
