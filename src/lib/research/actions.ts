"use server";

import { revalidatePath } from "next/cache";
import { generateBrief } from "./generate";

export async function regenerateBrief() {
  await generateBrief();
  revalidatePath("/research");
}
