import { fetchAndStoreArticles } from "./util/api";

const scheduleArticleUpdate = async () => {
  try {
    await fetchAndStoreArticles();
    const successMessage = "Articles fetched and stored successfully.";
    console.log(successMessage);
  } catch (error) {
    const errorMessage = `Error fetching articles: ${error.message}`;
    console.error(errorMessage);
  }
};

setInterval(scheduleArticleUpdate, 1000 * 60 * 60);

scheduleArticleUpdate();
