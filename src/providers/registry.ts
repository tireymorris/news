import type {
  BackfillCapabilities,
  DayBackfillResult,
  LiveSourceConfig,
  NewsProvider,
  SourceCounts,
} from "./types";

const newsProviders: NewsProvider[] = [];

const always = async () => true;

export const registerNewsProvider = (provider: NewsProvider) => {
  newsProviders.push(provider);
};

export const allNewsProviders = (): NewsProvider[] => newsProviders;

export const newsProviderNames = (): string[] =>
  newsProviders.map((provider) => provider.name);

export const providerById = (id: string): NewsProvider | undefined =>
  newsProviders.find((provider) => provider.id === id);

export const providerByName = (name: string): NewsProvider | undefined =>
  newsProviders.find(
    (provider) => provider.name.toLowerCase() === name.toLowerCase(),
  );

export const liveNewsProviders = (): Array<
  LiveSourceConfig & { name: string }
> =>
  newsProviders
    .filter((provider) => provider.live)
    .map((provider) => ({
      name: provider.name,
      ...provider.live!,
    }));

export const backfillProviders = (): Array<
  BackfillCapabilities & { name: string }
> =>
  newsProviders
    .filter((provider) => provider.backfill)
    .map((provider) => ({
      name: provider.name,
      ...provider.backfill!,
    }));

export const selectBackfillProviders = (
  source?: string,
  catalog = backfillProviders(),
) => {
  if (!source) {
    return catalog;
  }

  const normalizedSource = source.toLowerCase();
  return catalog.filter(
    (provider) => provider.name.toLowerCase() === normalizedSource,
  );
};

export const emptySourceCounts = (): SourceCounts =>
  Object.fromEntries(newsProviders.map((provider) => [provider.name, 0]));

export const emptyDayBackfillResult = (): DayBackfillResult =>
  Object.fromEntries(
    newsProviders.map((provider) => [
      provider.name,
      { inserted: 0, attempted: false },
    ]),
  );

export interface ProviderPlan {
  provider: BackfillCapabilities & { name: string };
  shouldAttempt: boolean;
  requireCoverage: boolean;
}

export const resolveProviderPlans = async (
  month: string,
): Promise<ProviderPlan[]> =>
  Promise.all(
    backfillProviders().map(async (provider) => ({
      provider,
      shouldAttempt: await (provider.shouldAttempt ?? always)(month),
      requireCoverage: await (provider.requireCoverage ?? always)(month),
    })),
  );

export const sourceNamesSql = (): string =>
  newsProviderNames().map(() => "?").join(", ");

export const parseSourceNames = (value?: string): string[] => {
  const names = value
    ?.split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  return names?.length ? names : newsProviderNames();
};

export const sourceNamesSqlIn = (names = newsProviderNames()): string =>
  names.map((name) => `'${name.replace(/'/g, "''")}'`).join(", ");
