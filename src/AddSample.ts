import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';
import { Sample, createPool, insertSample, responseError, responseOK } from './Utils';

let pool: Pool | null = null;

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return responseError(400, 'Request body is missing');
    }
    const sampleData = JSON.parse(event.body) as Sample;

    if (pool == null) pool = await createPool();
    const client = await pool.connect();

    try {
      await insertSample(client, sampleData);
      return responseOK(201, {success: true, message: ""});
    } catch (error) {
      //TODO: e.g. sampleId must be unique
      return responseError(400, 'Request body is missing');
    } finally {
      client.release();
    }

  } catch (error) {
    console.log('Error processing request:', error);
    return responseError();
  }
};
