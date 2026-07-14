import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNewsByCategory, NEWS_CATEGORIES } from "@/lib/news/newsapi";
import { NewsTabs } from "./news-tabs";

export async function CategorizedNews() {
  const categories = await Promise.all(
    NEWS_CATEGORIES.map(async (category) => ({
      ...category,
      articles: await getNewsByCategory(category.id),
    })),
  );

  const configured = categories.some((c) => c.articles.length > 0);

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
        ) : (
          <NewsTabs categories={categories} />
        )}
      </CardContent>
    </Card>
  );
}
