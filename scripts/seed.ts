// Create the DynamoDB table (if needed) and seed a demo user + published chart.
// Usage: npm run db:up && npm run seed

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import bcrypt from "bcryptjs";
import { TABLE } from "../lib/db";
import { createUser, getUserByEmail, publishChart, putChart } from "../lib/repo";
import { sampleChart } from "../lib/sample";
import type { ChartRecord } from "../lib/types";

const raw = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

async function ensureTable() {
  try {
    await raw.send(
      new CreateTableCommand({
        TableName: TABLE,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
          { AttributeName: "GSI1PK", AttributeType: "S" },
          { AttributeName: "GSI1SK", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI1",
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
      })
    );
    console.log(`Created table "${TABLE}"`);
  } catch (e) {
    if (e instanceof ResourceInUseException) {
      console.log(`Table "${TABLE}" already exists`);
    } else {
      throw e;
    }
  }
  // Wait until ACTIVE.
  for (let i = 0; i < 20; i++) {
    const d = await raw.send(new DescribeTableCommand({ TableName: TABLE }));
    if (d.Table?.TableStatus === "ACTIVE") return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Table never became ACTIVE");
}

async function seedDemo() {
  const email = "demo@example.com";
  let user = await getUserByEmail(email);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      email,
      name: "Demo Musician",
      passwordHash: await bcrypt.hash("demo1234", 10),
      createdAt: new Date().toISOString(),
    };
    await createUser(user);
    console.log(`Created demo user: ${email} / demo1234`);
  } else {
    console.log(`Demo user already exists: ${email}`);
  }

  const now = new Date().toISOString();
  const rec: ChartRecord = {
    id: "demo-chart-0001",
    ownerId: user.id,
    tags: ["demo", "country"],
    published: true,
    createdAt: now,
    updatedAt: now,
    doc: sampleChart,
  };
  await putChart(rec);
  await publishChart(rec, user.name);
  console.log(`Seeded + published "${sampleChart.title}" (id ${rec.id})`);
}

ensureTable()
  .then(seedDemo)
  .then(() => console.log("Done."))
  .catch((e) => {
    console.error("Seed failed:", e.message ?? e);
    process.exit(1);
  });
