import type { LiveSourceConfig } from "@/providers";
import { liveNewsProviders } from "@/providers";

export type NewsSource = LiveSourceConfig & { name: string };

export const newsSources: NewsSource[] = liveNewsProviders();
