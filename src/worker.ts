import { fetchAndStoreArticles } from "models/article";
import { shouldFetchArticles } from "util/time";

const runFetchIfDue = () => {
  if (shouldFetchArticles()) {
    return fetchAndStoreArticles();
  }
  return Promise.resolve();
};

void runFetchIfDue();

const scheduleArticleUpdate = () => {
  void runFetchIfDue();
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
