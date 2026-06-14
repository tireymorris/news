import type { HslColor, NewsProvider } from "./types";
import { allNewsProviders } from "./registry";

const hsl = (color: HslColor) => `${color.h} ${color.s}% ${color.l}%`;

export const providerThemeEntries = () =>
  allNewsProviders()
    .filter((provider) => provider.style)
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      style: provider.style!,
    }));

export const providerCssVariables = (): string =>
  providerThemeEntries()
    .flatMap(({ id, style }) => [
      `  --provider-${id}: ${hsl(style.color)};`,
      `  --provider-${id}-bg: ${hsl(style.background)};`,
    ])
    .join("\n");

export const providerBadgeCss = (): string =>
  providerThemeEntries()
    .map(
      ({ id }) => `
.provider-badge-${id} {
  background: hsl(var(--provider-${id}-bg));
  color: hsl(var(--provider-${id}));
  border: 1.5px solid hsl(var(--provider-${id}));
}`,
    )
    .join("\n");

export const providerBadgeClass = (source: string): string => {
  const provider = allNewsProviders().find(
    (entry) => entry.name.toLowerCase() === source.toLowerCase(),
  );

  return provider ? `provider-badge provider-badge-${provider.id}` : "provider-badge";
};

export const providerStyleMap = (): Record<string, string> =>
  Object.fromEntries(
    providerThemeEntries().map(({ id }) => [
      id,
      `provider-badge provider-badge-${id}`,
    ]),
  );

export const providerColorRecord = (): Record<
  string,
  { name: string; color: HslColor; background: HslColor }
> =>
  Object.fromEntries(
    providerThemeEntries().map(({ id, name, style }) => [
      id,
      { name, color: style.color, background: style.background },
    ]),
  );

export const providerByDisplayName = (
  name: string,
): NewsProvider | undefined =>
  allNewsProviders().find(
    (provider) => provider.name.toLowerCase() === name.toLowerCase(),
  );
