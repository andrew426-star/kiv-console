import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandCenter } from "@/components/company/command-center";
import { TeamBoard } from "@/components/company/team-board";
import { UserManagementTable } from "@/components/company/user-management-table";
import { ClientPortalBoard } from "@/components/company/client-portal-board";

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function CompanyPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Company Dashboard</h1>

      <Suspense fallback={<SectionSkeleton rows={1} />}>
        <CommandCenter />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton />}>
          <TeamBoard />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <UserManagementTable />
        </Suspense>
      </div>

      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <ClientPortalBoard />
      </Suspense>
    </div>
  );
}
