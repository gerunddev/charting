import { notFound, redirect } from "next/navigation";
import WysiwygEditor from "@/components/WysiwygEditor";
import { currentUser } from "@/lib/auth";
import { getChart } from "@/lib/repo";

export default async function EditChart({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/login");

  const { id } = await params;
  const record = await getChart(user.id, id);
  if (!record) notFound();

  return (
    <div className="wrap">
      <header className="app">
        <h1>Edit chart</h1>
        <span className="meta">
          autosaves as you edit ·{" "}
          {record.published ? "published — republish from My charts to update the public copy" : "private"}
        </span>
      </header>
      <WysiwygEditor record={record} />
    </div>
  );
}
