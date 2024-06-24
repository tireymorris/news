export interface Article {
  id: string;
  title: string;
  link: string;
  source: NewsSource["name"];
  created_at: string;
}

export type NewsSource = {
  name: string;
  url: string;
  listSelector: string;
  baseUrl?: string;
  limit?: number;
};
