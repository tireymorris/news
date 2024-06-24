import EnableDarkMode from "util/EnableDarkMode";
import Header from "components/Header";

type LayoutProps = {
  title: string;
  currentPath?: string;
  children: any;
  lastUpdated?: string | null;
};

export default function Layout({ title, children, lastUpdated }: LayoutProps) {
  return (
    <html
      lang="en"
      className="dark:bg-gray-900 bg-white dark:text-white text-black"
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="hyperwave" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌊</text></svg>"
        />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@1.9.9"></script>
        <link rel="stylesheet" href="/styles/uno.css" />
        <script>htmx.config.globalViewTransitions = true</script>
        <EnableDarkMode />
        <style>{`* { box-sizing: border-box; margin: 0; outline: none; color: unset; }`}</style>
      </head>
      <body className="font-lato m-0 bg-white dark:bg-gray-900 p-0 text-black dark:text-white box-border">
        <Header lastUpdated={lastUpdated} />
        {children}
      </body>
    </html>
  );
}
