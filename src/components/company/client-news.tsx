import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientNewsFeeds } from "@/lib/news/client-news";
import { NewsTabs } from "@/components/intel/news-tabs";

export async function ClientNews() {
  const feeds = await getClientNewsFeeds();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Client Media Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No confirmed clients yet — once a lead becomes a client, their news and publicity
            coverage will show up here.
          </p>
        ) : (
          <NewsTabs
            categories={feeds.map((f) => ({ id: f.clientId, label: f.clientName, articles: f.articles }))}
          />
        )}
      </CardContent>
    </Card>
  );
}
