type NewsSource = {
  name: string;
  url: string;
  listSelector: string;
  baseUrl?: string;
};

const newsSources: NewsSource[] = [
  {
    name: "NPR",
    url: `http://text.npr.org`,
    listSelector: "ul > li > a",
    baseUrl: "https://text.npr.org",
  },
  {
    name: "Al Jazeera",
    url: `https://www.aljazeera.com/us-canada`,
    listSelector: "article .gc__content a",
    baseUrl: "https://www.aljazeera.com",
  },
];

export { newsSources, NewsSource };
