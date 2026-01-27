export const styles = {
  layout: {
    html: "dark",
    body: "m-0 p-0 min-h-screen font-mono",
    resetStyle: "* { box-sizing: border-box; margin: 0; outline: none; color: unset; }",
  },
  header: {
    container: "flex w-full cursor-pointer items-center hacker-card px-4 py-3 text-primary text-glow transition-all hover:border-primary/60 hover:text-primary/90 border-b-2 border-primary/50",
    icon: "mr-4 h-12 w-12 text-primary text-glow-soft",
    content: "flex flex-col",
    title: "font-mono text-xl font-bold uppercase tracking-wider text-glow",
    lastUpdated: "mt-1 text-xs text-muted-foreground font-mono",
  },
  main: {
    container: "flex min-h-screen flex-col gap-3 p-4 text-base font-mono",
    content: "w-full px-2",
  },
  search: {
    container: "mb-6",
    input: "w-full hacker-input px-4 py-3 text-sm text-primary placeholder:text-muted-foreground/50 focus-visible:outline-none transition-all font-mono",
    resultsContainer: "mt-3",
    resultsText: "mb-2 text-xs text-muted-foreground hacker-card px-3 py-2 inline-block font-mono border border-primary/20",
  },
  articles: {
    list: "m-0 list-none p-0 space-y-2",
    item: "m-0 list-none p-0",
    card: "hacker-card p-4 hover:border-primary/60 hover:text-primary/90 transition-all border-l-2 border-primary/30",
    link: "no-underline text-primary hover:text-primary/90 hover:text-glow visited:text-cyan-400 visited:text-glow-soft block mb-2 font-bold uppercase text-sm tracking-wide",
    meta: "text-xs text-muted-foreground font-mono",
    emptyState: "py-8 text-center text-muted-foreground hacker-card border border-primary/20",
    infiniteScroll: "w-full",
  },
  ui: {
    card: {
      base: "border bg-card text-card-foreground hacker-border",
      header: "flex flex-col space-y-1.5 p-6 border-b border-primary/20",
      title: "text-2xl font-bold leading-none tracking-tight font-mono uppercase text-glow",
      description: "text-sm text-muted-foreground font-mono",
      content: "p-6 pt-0",
      footer: "flex items-center p-6 pt-0 border-t border-primary/20",
    },
    input: {
      base: "flex h-10 w-full border border-input bg-background px-3 py-2 text-sm font-mono text-primary placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:hacker-glow disabled:cursor-not-allowed disabled:opacity-50",
    },
  },
};
