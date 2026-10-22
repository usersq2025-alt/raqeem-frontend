import { SubjectsHome } from "@/components/SubjectsHome";

type Props = {
  searchParams: Promise<{ childId?: string }>;
};

// No server-side data fetching here on purpose - see SubjectsHome.tsx's doc comment.
// StudentShell (the layout wrapper) already validates/redirects based on the child
// profile it loads client-side; this page only needs to pass the id through.
export default async function SubjectsPage({ searchParams }: Props) {
  const { childId } = await searchParams;
  return <SubjectsHome childId={Number(childId)} />;
}
