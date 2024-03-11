// index.ts
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { QueryResult } from 'pg';
import { getPoolClient, buildSamples, responseError, responseOK, PROP_FILED_MAP } from './Utils';

export const handler = async (
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {

        if (!event.body) {
            return responseError(400, 'Request body is missing');
        }

        const textParams = JSON.parse(event.body);
        if ("searchterm" in textParams == false) {
            return responseError(400, 'searchterm parameter is missing');
        }

        const client = await getPoolClient();

        try {
            const conditions: string[] = [];
            const values: string[] = [];

            for (let prop of Object.keys(PROP_FILED_MAP)) {
                const field = PROP_FILED_MAP[prop];
                if(field.type == 'string'){
                    conditions.push(`${field.name} ilike $1`);
                } else if (field.type == 'string[]'){
                    conditions.push(`EXISTS (SELECT 1 FROM unnest(${field.name}) AS item WHERE item ILIKE $1)`);
                }
            }                
            values.push(`%${textParams.searchterm}%`);

            let query = `SELECT * FROM sample`;
            if (conditions.length > 0) query += ` WHERE ${conditions.join(' OR ')}`;

            // console.log('query:', query);
            // console.log('values:', values);

            const ret: QueryResult = await client.query(query, values);
            return responseOK(200, buildSamples(ret.rows));
        } finally {
            client.release();

        }

    } catch (error) {
        console.log('Error processing request:', error);
        return responseError();
    }
};
