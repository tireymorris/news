import { fetchAndStoreArticles } from "models/article";
import { debug } from "util/log";
import { newsSources } from "models/newsSources";
import sendTelegramMessage from "util/sendTelegramMessage";

const scheduleArticleUpdate = async () => {
  try {
    const articles = await fetchAndStoreArticles();
    const successMessage = generateSuccessMessage(articles);
    if (articles.length > 0) {
      await sendTelegramMessage(successMessage);
      debug(successMessage);
    } else {
      debug("No new articles found");
    }
  } catch (error) {
    const errorMessage = `Error fetching articles: ${JSON.stringify(error, null, 2)}`;
    debug(errorMessage);
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
    .filter((source) => counts[source.name] > 0)
    .map((source) => `${source.name}: ${counts[source.name] || 0}`)
    .join("\n");

  return `Articles fetched and stored successfully.\n\n${articleCounts}\n\nVisit: https://hyperwave.news`;
};

const runEveryMinute = () => {
  const now = new Date();
  const millisecondsUntilNextMinute =
    60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

  setTimeout(() => {
    scheduleArticleUpdate();
    setInterval(scheduleArticleUpdate, 60000);
  }, millisecondsUntilNextMinute);
};

runEveryMinute();
