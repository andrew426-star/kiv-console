import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center p-16">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>K.I.V.</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Foundation deployed. Company Dashboard, Intel Hub, Research, and Overview
          modules land next.
        </CardContent>
      </Card>
    </div>
  );
}
