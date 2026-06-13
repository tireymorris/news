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

const repaired = await repairStoredPublishedAt({ source, sleepMs });
const sourceDescription = source ? ` for ${source}` : "";
console.log(
  `Repaired published_at for ${repaired} articles${sourceDescription}.`,
);
