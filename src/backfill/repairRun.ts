import { repairStoredPublishedAt } from "./repairPublishedAt";

const args = Bun.argv.slice(2);
const source = args
  .find((arg) => arg.startsWith("--source="))
  ?.replace("--source=", "");
const sleepMs = Number(
  args
    .find((arg) => arg.startsWith("--sleep-ms="))
    ?.replace("--sleep-ms=", "") || "500",
);

const sourceDescription = source ? ` for ${source}` : "";
const repaired = await repairStoredPublishedAt({
  source,
  sleepMs,
  onProgress: ({ processed, repaired, total }) => {
    if (processed === 1 || processed % 50 === 0 || processed === total) {
      const percent = ((processed / total) * 100).toFixed(1);
      console.log(
        `published_at repair${sourceDescription}: ${processed}/${total} processed (${percent}%), ${repaired} repaired`,
      );
    }
  },
});
console.log(
  `Repaired published_at for ${repaired} articles${sourceDescription}.`,
);
