export const styles = {
  layout: {
    html: "",
    body: "m-0 p-0 min-h-screen antialiased",
    resetStyle: "* { box-sizing: border-box; margin: 0; outline: none; color: unset; }",
  },
  header: {
    container: "w-full border-b-2 border-primary relative",
    icon: "hidden",
    content: "w-full max-w-7xl mx-auto px-6 py-8 md:py-12",
    title: "font-serif text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-foreground leading-none",
    lastUpdated: "mt-3 text-xs tracking-widest uppercase text-muted-foreground font-sans",
  },
  main: {
    container: "flex min-h-screen flex-col gap-8 p-6 md:p-8",
    content: "w-full max-w-7xl mx-auto",
  },
  search: {
    container: "mb-10 border-b border-border pb-8 section-rule",
    input: "w-full editorial-input px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none transition-all font-sans text-lg",
    resultsContainer: "mt-4",
    resultsText: "text-sm text-muted-foreground font-sans italic",
  },
  articles: {
    list: "m-0 list-none p-0 space-y-0",
    item: "m-0 list-none p-0 border-b border-border last:border-b-0",
    card: "py-6 md:py-8 pr-4 group hover:pl-6 transition-all duration-300 ease-out cursor-pointer",
    link: "no-underline text-foreground hover:text-primary visited:text-foreground block mb-2",
    meta: "flex items-center gap-3 text-sm text-muted-foreground font-sans",
    emptyState: "py-16 text-center text-muted-foreground font-sans text-lg italic",
    infiniteScroll: "w-full",
  },
  ui: {
    card: {
      base: "border bg-card text-card-foreground editorial-border",
      header: "flex flex-col space-y-1.5 p-6 border-b border-border",
      title: "text-3xl font-bold leading-none tracking-tight font-serif italic uppercase",
      description: "text-sm text-muted-foreground font-sans",
      content: "p-6 pt-0",
      footer: "flex items-center p-6 pt-0 border-t border-border",
    },
    input: {
      base: "flex h-12 w-full border border-input bg-background px-4 py-3 text-base font-sans text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50",
    },
  },
};