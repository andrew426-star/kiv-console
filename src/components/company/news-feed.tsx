import { getNewsFeed } from "@/lib/news/newsapi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function NewsFeed() {
  const articles = await getNewsFeed();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Fintech &amp; AI News</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not connected — set NEWSAPI_KEY to pull a live feed here.
          </p>
        ) : (
          articles.map((article) => (
            <a
              key={article.url}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <span className="font-medium">{article.title}</span>
              <span className="text-xs text-muted-foreground">
                {article.source} · {new Date(article.publishedAt).toLocaleDateString()}
              </span>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
}
