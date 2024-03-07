// index.ts
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { Pool, QueryResult } from 'pg';
import { createPool, buildSamples, responseError, responseOK } from './Utils';

let pool: Pool | null = null;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (pool == null) pool = await createPool();

    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM sample ';
      const ret: QueryResult = await client.query(query);
      return responseOK(200, buildSamples(ret.rows));
    } finally {
      client.release();
    }
  } catch (error) {
    console.log('Error processing request:', error);
    return responseError();
  }
};
