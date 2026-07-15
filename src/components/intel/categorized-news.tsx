import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNewsByCategory, isNewsApiConfigured, NEWS_CATEGORIES } from "@/lib/news/newsapi";
import { NewsTabs } from "./news-tabs";

export async function CategorizedNews() {
  const configured = isNewsApiConfigured();
  const categories = await Promise.all(
    NEWS_CATEGORIES.map(async (category) => ({
      ...category,
      articles: await getNewsByCategory(category.id),
    })),
  );

  const anyResults = categories.some((c) => c.articles.length > 0);

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Sector News</CardTitle>
      </CardHeader>
      <CardContent>
        {!configured ? (
          <p className="text-sm text-muted-foreground">
            Not connected — set NEWSAPI_KEY to pull a live feed here.
          </p>
        ) : !anyResults ? (
          <p className="text-sm text-muted-foreground">
            No articles right now — NewsAPI&apos;s free tier rate-limits at 100 requests/day, so
            this can go quiet temporarily. It&apos;ll resume on its own.
          </p>
        ) : (
          <NewsTabs categories={categories} />
        )}
      </CardContent>
    </Card>
  );
}
