// index.ts
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { QueryResult } from 'pg';
import { responseError, responseOK, getPoolClient } from './Utils';

export const handler = async (
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {
        const sampleId = event.pathParameters?.sample_id;
        if (!sampleId) {
            return responseError(400, 'Missing "sample_id" parameter in the path');
        }

        const client = await getPoolClient();
        try {
            const query = 'DELETE FROM sample where id = $1';
            const values = [sampleId];
            const resultSet: QueryResult = await client.query(query, values);

            if (resultSet.rowCount == 0) {
                return responseError(404, `Sample with id=${sampleId} not found!`);
            }
    
            return responseOK(202,{success: true, message: ""});
        
        } finally {
            client.release();
        }
    } catch (error) {
        console.log('Error processing request:', error);
        return responseError();
    }
};
