import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { getSavedAnalysis } from "@/lib/db/saved-analyses";
import { EditSavedResult } from "@/components/foodsnap/edit-saved-result";

export default async function EditSavedResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth.protect();
  const saved = await getSavedAnalysis(userId, id);

  if (!saved) notFound();

  return <EditSavedResult saved={saved} />;
}
