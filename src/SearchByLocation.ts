// index.ts
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { QueryResult } from "pg";
import {
  getPoolClient,
  buildSamples,
  responseError,
  responseOK,
} from "./Utils";

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return responseError(400, "Request body is missing");
    }

    const rect = JSON.parse(event.body);
    const s: number = rect.locationRectangleBounds.south;
    const w: number = rect.locationRectangleBounds.west;
    const n: number = rect.locationRectangleBounds.north;
    const e: number = rect.locationRectangleBounds.east;

    const client = await getPoolClient();
    try {
      const query = `
                SELECT * FROM sample 
                where ((location_marker_lat >= $1 and location_marker_lat <= $3 
                    and location_marker_lng >= $2 and location_marker_lng <= $4) 
                or  (location_rectangle_south >= $1 and location_rectangle_north <= $3 
                    and location_rectangle_west >= $2 and location_rectangle_east <= $4 
                    ) )
                AND sys_is_active = TRUE
            `;
      let values = [s, w, n, e];
      const ret: QueryResult = await client.query(query, values);
      return responseOK(200, buildSamples(ret.rows));
    } finally {
      client.release();
    }
  } catch (error) {
    console.log("Error processing request:", error);
    return responseError();
  }
};
