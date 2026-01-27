export const styles = {
  layout: {
    html: "dark",
    body: "m-0 p-0 min-h-screen",
    resetStyle: "* { box-sizing: border-box; margin: 0; outline: none; color: unset; }",
  },
  header: {
    container: "flex w-full cursor-pointer items-center rounded-lg glass-card bg-gradient-to-r from-primary/20 to-purple-500/20 px-4 py-3 text-foreground shadow-2xl transition-all hover:from-primary/30 hover:to-purple-500/30 hover:shadow-primary/20",
    icon: "mr-4 h-12 w-12",
    content: "flex flex-col",
    title: "font-serif text-xl italic",
    lastUpdated: "mt-1 text-sm",
  },
  main: {
    container: "flex min-h-screen flex-col gap-4 p-4 text-base",
    content: "w-full px-2",
  },
  search: {
    container: "mb-6",
    input: "w-full rounded-lg glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:bg-white/15 transition-all",
    resultsContainer: "mt-3",
    resultsText: "mb-2 text-sm text-muted-foreground glass-card rounded-lg px-3 py-2 inline-block",
  },
  articles: {
    list: "m-0 list-none p-0 space-y-3",
    item: "m-0 list-none p-0",
    card: "glass-card rounded-lg p-4 hover:bg-white/10 transition-all",
    link: "no-underline text-primary hover:text-primary/80 hover:underline visited:text-purple-500 block mb-2 font-medium",
    meta: "text-sm text-muted-foreground",
    emptyState: "py-8 text-center text-muted-foreground glass-card rounded-lg",
    infiniteScroll: "w-full",
  },
  ui: {
    card: {
      base: "rounded-lg border bg-card text-card-foreground shadow-sm",
      header: "flex flex-col space-y-1.5 p-6",
      title: "text-2xl font-semibold leading-none tracking-tight",
      description: "text-sm text-muted-foreground",
      content: "p-6 pt-0",
      footer: "flex items-center p-6 pt-0",
    },
    input: {
      base: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    },
  },
};
