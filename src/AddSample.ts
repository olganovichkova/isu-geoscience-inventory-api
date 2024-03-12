import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { Sample, insertSample, responseError, responseOK, getPoolClient } from './Utils';


export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return responseError(400, 'Request body is missing');
    }
    const sampleData = JSON.parse(event.body);

    const client = await getPoolClient();
    try {
      await insertSample(client, sampleData);
      return responseOK(201, {success: true, message: ""});
    } catch (error) {
      return responseError(400, (error as Error).message);
    } finally {
      client.release();
    }

  } catch (error) {
    console.log('Error processing request:', error);
    return responseError();
  }
};
