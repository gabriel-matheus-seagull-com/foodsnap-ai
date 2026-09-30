import { auth } from "@clerk/nextjs/server";

import { getUserGoals } from "@/lib/db/goals";
import { GoalsForm } from "@/components/foodsnap/goals-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function GoalsPage() {
  // Resource-based auth check, same pattern as /results and /profile.
  const { userId } = await auth.protect();
  const goals = await getUserGoals(userId);

  return (
    <div className="container max-w-xl py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Nutrition goals</h1>
      <Card>
        <CardHeader>
          <CardTitle>Daily targets</CardTitle>
          <CardDescription>
            Used to show your progress on the History page. You can update these
            any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoalsForm goals={goals} />
        </CardContent>
      </Card>
    </div>
  );
}
