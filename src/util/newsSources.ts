type NewsSource = {
  name: string;
  url: string;
  listSelector: string;
  baseUrl?: string;
  limit?: number;
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
  {
    name: "CNN",
    url: `http://lite.cnn.com`,
    listSelector: "li.card--lite > a",
    baseUrl: "http://lite.cnn.com",
    limit: 20,
  },
];

export { newsSources, NewsSource };
