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

  const anyResults = categories.some((c) => c.articles.length > 0);

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Sector News</CardTitle>
      </CardHeader>
      <CardContent>
        {!anyResults ? (
          <p className="text-sm text-muted-foreground">
            No articles right now. The Intel feed refreshes hourly from vetted outlets (Reuters, WSJ,
            FT, Bloomberg, Barron&apos;s and others); it&apos;ll fill in on its own.
          </p>
        ) : (
          <>
            <NewsTabs categories={categories} />
            <p className="mt-3 text-xs text-muted-foreground">
              From outlets vetted for credibility and lean, refreshed hourly. The same feed as
              Jarvis&apos;s Intel.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
