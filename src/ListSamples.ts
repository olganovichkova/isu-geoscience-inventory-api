// index.ts
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { QueryResult } from "pg";
import {
  buildSamples,
  responseError,
  responseOK,
  getPoolClient,
} from "./Utils";

//function to get ALL samples
export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const client = await getPoolClient();
    try {
      const query = "SELECT * FROM sample where sys_is_active = TRUE";
      const ret: QueryResult = await client.query(query);
      return responseOK(200, buildSamples(ret.rows));
    } finally {
      client.release();
    }
  } catch (error) {
    console.log("Error processing request:", error);
    return responseError();
  }
};
