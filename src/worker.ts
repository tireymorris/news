import { fetchAndStoreArticles } from "./util/api";
import sendTelegramMessage from "./util/sendTelegramMessage";
import { newsSources } from "./util/newsSources";
import { log } from "./util/log";

const scheduleArticleUpdate = async () => {
  try {
    const articles = await fetchAndStoreArticles();
    const successMessage = generateSuccessMessage(articles);
    log(successMessage);
    if (articles.length > 0) await sendTelegramMessage(successMessage);
  } catch (error) {
    const errorMessage = `Error fetching articles: ${JSON.stringify(error, null, 2)}`;
    log(errorMessage);
    await sendTelegramMessage(errorMessage);
  }
};

const generateSuccessMessage = (articles: any[]) => {
  const counts = articles.reduce(
    (acc: Record<string, number>, article: any) => {
      acc[article.source] = (acc[article.source] || 0) + 1;
      return acc;
    },
    {},
  );

  const articleCounts = newsSources
    .map((source) => `${source.name}: ${counts[source.name] || 0}`)
    .join("\n");

  return `Articles fetched and stored successfully.\n\n${articleCounts}\n\nVisit: https://hyperwave.codes`;
};

const runEveryQuarterHour = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  const nextRunInMilliseconds =
    (15 - (minutes % 15)) * 60 * 1000 - seconds * 1000 - milliseconds;

  setTimeout(() => {
    scheduleArticleUpdate();
    setInterval(
      () => {
        const now = new Date();
        const nextRunInMilliseconds =
          (15 - (now.getMinutes() % 15)) * 60 * 1000 -
          now.getSeconds() * 1000 -
          now.getMilliseconds();
        scheduleArticleUpdate();
        setTimeout(runEveryQuarterHour, nextRunInMilliseconds);
      },
      1000 * 60 * 15,
    );
  }, nextRunInMilliseconds);
};

runEveryQuarterHour();
