// index.ts
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { Pool, QueryResult } from 'pg';
import { createPool, buildSample, responseError, responseOK } from './Utils';

let pool: Pool | null = null;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const sampleId = event.pathParameters?.sample_id;

    if (!sampleId) {
      return responseError(400, 'Missing "sample_id" parameter in the path');
    }

    if (pool == null) pool = await createPool();

    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM sample where id = $1';
      const values = [sampleId];
      const ret: QueryResult = await client.query(query, values);

      if (ret.rowCount == 0) {
        return responseError(400, 'Sample not found');
      }
      return responseOK(200, buildSample(ret.rows[0]));
    } finally {
      client.release();
    }

  } catch (error) {
    console.log('Error processing request:', error);
    return responseError();
  }
};
