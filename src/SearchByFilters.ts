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

        if (!event.body) {
            return responseError(400, 'Request body is missing');
        }
        const filters = JSON.parse(event.body);

        if (pool == null) pool = await createPool();
        const client = await pool.connect();
        try {

            const prop_field_map: { [key: string]: string } = {
                "category": "category",
                "collectorName": "collector_name",
                "advisorName": "advisor_name",
                // "collectionYear": "collection_year",
                // "collectionReason": "collection_reason",
                // "sampleForm": "sample_form",
                // "sampleType": "sample_type",
                "storageBuilding": "storage_building",
                "storageRoom": "storage_room"
            };
            const props: string[] = Object.keys(prop_field_map);
            const conditions: string[] = [];
            const values: string[] = [];

            let cIndex = 1;
            for (let i = 0; i < props.length; i++) {
                const prop = props[i];
                if (filters[prop] == null || filters[prop] == '') continue;

                conditions.push(`${prop_field_map[prop]} = $${cIndex++}`)
                values.push(filters[prop]);
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
