import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, TABLE } from "./db";
import type { ChartRecord, PublishedChart, User } from "./types";

// Single-table layout:
//   USER#<id>  / PROFILE      → user (GSI1: EMAIL#<email> for login lookup)
//   USER#<id>  / CHART#<id>   → private chart record
//   PUB        / CHART#<id>   → published snapshot (public catalog)

// Strip table key attributes before handing items back to the app.
function clean<T>(item: Record<string, unknown>): T {
  const { PK, SK, GSI1PK, GSI1SK, ...rest } = item;
  return rest as T;
}

// --- Users -----------------------------------------------------------------

export async function createUser(u: User): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `USER#${u.id}`,
        SK: "PROFILE",
        GSI1PK: `EMAIL#${u.email.toLowerCase()}`,
        GSI1SK: "USER",
        ...u,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const r = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :e",
      ExpressionAttributeValues: { ":e": `EMAIL#${email.toLowerCase()}` },
    })
  );
  return r.Items?.[0] ? clean<User>(r.Items[0]) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const r = await db.send(
    new GetCommand({ TableName: TABLE, Key: { PK: `USER#${id}`, SK: "PROFILE" } })
  );
  return r.Item ? clean<User>(r.Item) : null;
}

// --- Private charts ----------------------------------------------------------

export async function putChart(rec: ChartRecord): Promise<void> {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: { PK: `USER#${rec.ownerId}`, SK: `CHART#${rec.id}`, ...rec },
    })
  );
}

export async function getChart(ownerId: string, id: string): Promise<ChartRecord | null> {
  const r = await db.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `USER#${ownerId}`, SK: `CHART#${id}` },
    })
  );
  return r.Item ? clean<ChartRecord>(r.Item) : null;
}

export async function listCharts(ownerId: string): Promise<ChartRecord[]> {
  const r = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `USER#${ownerId}`, ":sk": "CHART#" },
    })
  );
  const recs = (r.Items ?? []).map((i) => clean<ChartRecord>(i));
  return recs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteChart(ownerId: string, id: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { PK: `USER#${ownerId}`, SK: `CHART#${id}` },
    })
  );
  await unpublishChart(id); // published snapshot shouldn't outlive the source
}

// --- Public catalog ----------------------------------------------------------

export async function publishChart(rec: ChartRecord, ownerName: string): Promise<PublishedChart> {
  const pub: PublishedChart = {
    id: rec.id,
    ownerId: rec.ownerId,
    ownerName,
    tags: rec.tags,
    publishedAt: new Date().toISOString(),
    doc: rec.doc,
  };
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: { PK: "PUB", SK: `CHART#${pub.id}`, ...pub },
    })
  );
  return pub;
}

export async function unpublishChart(id: string): Promise<void> {
  await db.send(
    new DeleteCommand({ TableName: TABLE, Key: { PK: "PUB", SK: `CHART#${id}` } })
  );
}

export async function getPublished(id: string): Promise<PublishedChart | null> {
  const r = await db.send(
    new GetCommand({ TableName: TABLE, Key: { PK: "PUB", SK: `CHART#${id}` } })
  );
  return r.Item ? clean<PublishedChart>(r.Item) : null;
}

// The whole public catalog. Search/filter happens in the app layer — fine at
// prototype scale; on AWS this becomes a search index (e.g. OpenSearch) later.
export async function listPublished(): Promise<PublishedChart[]> {
  const r = await db.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "PUB" },
    })
  );
  const pubs = (r.Items ?? []).map((i) => clean<PublishedChart>(i));
  return pubs.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
