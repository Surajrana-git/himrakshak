import Screen from "@/components/Screen";
import NewsTabs from "@/components/NewsTabs";
import { getSlideNews } from "@/lib/slide-news";

export default async function NewsPage() {
  const news = await getSlideNews();
  return (
    <Screen icon="news" title="Recent News" subtitle="Latest updates, advisories, and important information.">
      {!news && <p className="text-sm text-muted">Headlines are unavailable right now (Google News). Traveller events still show.</p>}
      <NewsTabs news={news?.items ?? []} />
      {news && <p className="text-xs text-muted">Headlines: Google News, checked every hour.</p>}
    </Screen>
  );
}
