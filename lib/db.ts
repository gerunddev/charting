import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Local dev talks to DynamoDB Local (docker compose up -d). On AWS, unset
// DYNAMODB_ENDPOINT (and set USE_LOCAL_DYNAMO=false) and the same code hits
// real DynamoDB via the normal credential chain — nothing else changes.
const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const isLocal = process.env.USE_LOCAL_DYNAMO !== "false";

export const TABLE = process.env.TABLE_NAME ?? "charting";

export const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    ...(isLocal
      ? { endpoint, credentials: { accessKeyId: "local", secretAccessKey: "local" } }
      : {}),
  }),
  { marshallOptions: { removeUndefinedValues: true } }
);
