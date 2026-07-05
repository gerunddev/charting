import { notFound, redirect } from "next/navigation";
import Editor from "@/components/Editor";
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
          {record.published ? "published — republish after saving to update the public copy" : "private"}
        </span>
      </header>
      <Editor record={record} />
    </div>
  );
}
