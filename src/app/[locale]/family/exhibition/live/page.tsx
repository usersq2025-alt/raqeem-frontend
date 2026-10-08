import { ExhibitionLauncher } from "@/components/exhibition/ExhibitionLauncher";
import { requireParentSession } from "@/lib/server/requireParentSession";

// Not behind the guardian lock on purpose: the manager returns here from the child view to start the next visitor.
export default async function ExhibitionLivePage() {
  await requireParentSession();
  return <ExhibitionLauncher />;
}