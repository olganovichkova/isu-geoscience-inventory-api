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
        const filters = JSON.parse(event.body);

        const client = await getPoolClient();
        try {
            const filterProps = [
                "category",
                "collectorName",
                "advisorName",
                "collectionYear",
                "collectionReason",
                "sampleForm",
                "sampleType",
                "storageBuilding",
                "storageRoom"
            ]

            const conditions: string[] = [];
            const values: any[] = [];

            let cIndex = 1;
            for (let prop of filterProps) {
                const field = PROP_FILED_MAP[prop];

                if (filters[prop] == null ) continue;
                if(field.type == 'string' && filters[prop] != ''){
                    conditions.push(`${field.name} = $${cIndex++}`)
                    values.push(filters[prop]);
                } else if(field.type == 'number' && filters[prop] != null && `${filters[prop]}` != ""){
                    conditions.push(`${field.name} = $${cIndex++}`)
                    values.push(Number(filters[prop]));
                } else if(field.type == 'string[]' && filters[prop] != null && `${filters[prop]}` != ""){
                    conditions.push(`$${cIndex++} = ANY(${field.name})`)
                    values.push([filters[prop]]);
                }
            }

            let query = `SELECT * FROM sample`;
            if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;

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
