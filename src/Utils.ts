import { Pool, QueryResult, PoolClient } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand,} from "@aws-sdk/client-secrets-manager";
import { APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';
import { Readable } from 'stream';
import { SSM } from '@aws-sdk/client-ssm';


export interface Sample {
    id?: number;
    sampleId: string;
    category: string;
    collectorName: string;
    advisorName?: string;
    advisorOtherName?: string;
    collectionYear?: number;
    collectionReason?: string[];
    collectionReasonOther?: string;
    collectionLocation?: string[];
    shortDescription?: string;
    longDescription?: string;
    sampleForm?: string[];
    sampleFormOther?: string;
    sampleType?: string[];
    sampleTypeOther?: string;
    sampleImg?: string;
    storageBuilding?: string;
    storageBuildingOther?: string;
    storageRoom?: string;
    storageRoomOther?: string;
    storageDetails?: string;
    storageDuration?: number;
    locationRectangleBounds?: {
        south: number,
        west: number,
        north: number,
        east: number
    } | null;
    locationMarkerlat?: number | null;
    locationMarkerlng?: number | null;
}

export interface SearchFulltextParams {
    searchterm: string;
}



export interface SearchFilterParams {
    category: string;
    collectorName: string;
    advisorName: string;
    collectionYear: string;
    collectionReason: string;
    sampleForm: string;
    sampleType: string;
    storageBuilding: string;
    storageRoom: string;
}

export interface SearchLocationParams {
    locationRectangleBounds: {
        south: number,
        west: number,
        north: number,
        east: number
    };
}

export interface PresignedURL {
    url: string;
    sourceFileName: string;
    destS3FileName: string;
}

export interface FileParams {
    name: string;
    contentType: string;
}

export interface ResultStatus {
    success: boolean,
    message: string
}

export class Field {
    constructor(public name: string, public type: 'string' | 'string[]' | 'number'){};
}

export const PROP_FILED_MAP : {[key: string] : Field} = {
    'sampleId' : new Field('sample_id', 'string'),
    'category' : new Field('category', 'string'),
    'collectorName' : new Field('collector_name', 'string'),
    'advisorName' : new Field('advisor_name', 'string'),
    'advisorOtherName' : new Field('advisor_other_name', 'string'),
    'collectionYear' : new Field('collection_year', 'number'),
    'collectionReason' : new Field('collection_reason', 'string[]'),
    'collectionReasonOther' : new Field('collection_reason_other', 'string'),
    'collectionLocation' : new Field('collection_location', 'string[]'),
    'shortDescription' : new Field('short_description', 'string'),
    'longDescription' : new Field('long_description', 'string'),
    'sampleForm' : new Field('sample_form', 'string[]'),
    'sampleFormOther' : new Field('sample_form_other', 'string'),
    'sampleType' : new Field('sample_type', 'string[]'),
    'sampleTypeOther' : new Field('sample_type_other', 'string'),
    'sampleImg' : new Field('sample_img', 'string'),
    'storageBuilding' : new Field('storage_building', 'string'),
    'storageBuildingOther' : new Field('storage_building_other', 'string'),
    'storageRoom' : new Field('storage_room', 'string'),
    'storageRoomOther' : new Field('storage_room_other', 'string'),
    'storageDetails' : new Field('storage_details', 'string'),
    'storageDuration' : new Field('storage_duration', 'number'),
    'locationRectangleBounds.south' : new Field('location_rectangle_south', 'number'),
    'locationRectangleBounds.west' : new Field('location_rectangle_west', 'number'),
    'locationRectangleBounds.north' : new Field('location_rectangle_north', 'number'),
    'locationRectangleBounds.east' : new Field('location_rectangle_east', 'number'),
    'locationMarkerlat' : new Field('location_marker_lat', 'number'),
    'locationMarkerlng' : new Field('location_marker_lng', 'number')
}


export function buildSamples(dbRows: any[]): Sample[] {
    return dbRows.map(buildSample);
}

export async function insertSample(client: PoolClient, sampleData: Sample): Promise<QueryResult> {

    const locationRectangleBoundsSouth = sampleData.locationRectangleBounds != null ? 
        sampleData.locationRectangleBounds.south : 
        ('locationRectangleBoundsSouth' in sampleData? sampleData.locationRectangleBoundsSouth: null);

    const locationRectangleBoundsWest = sampleData.locationRectangleBounds != null ? 
        sampleData.locationRectangleBounds.west : 
        ('locationRectangleBoundsWest' in sampleData? sampleData.locationRectangleBoundsWest: null);

    const locationRectangleBoundsNorth = sampleData.locationRectangleBounds != null ? 
        sampleData.locationRectangleBounds.north : 
        ('locationRectangleBoundsNorth' in sampleData? sampleData.locationRectangleBoundsNorth: null);

    const locationRectangleBoundsEast = sampleData.locationRectangleBounds != null ? 
        sampleData.locationRectangleBounds.east : 
        ('locationRectangleBoundsEast' in sampleData? sampleData.locationRectangleBoundsEast: null);

    const query = `
        insert into sample(
        sample_id,
        category,
        collector_name,
        advisor_name,
        advisor_other_name,
        collection_year,
        collection_reason,
        collection_reason_other,
        collection_location,
        short_description,
        long_description,
        sample_form,
        sample_form_other,
        sample_type,
        sample_type_other,
        sample_img,
        storage_building,
        storage_building_other,
        storage_room,
        storage_room_other,
        storage_details,
        storage_duration,
        location_rectangle_south,
        location_rectangle_west,
        location_rectangle_north,
        location_rectangle_east,
        location_marker_lat,
        location_marker_lng        
        ) 
        values(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28)`;
    const values = [
        sampleData.sampleId,
        sampleData.category,
        sampleData.collectorName,
        sampleData.advisorName,
        sampleData.advisorOtherName,
        sampleData.collectionYear,
        sampleData.collectionReason,
        sampleData.collectionReasonOther,
        sampleData.collectionLocation,
        sampleData.shortDescription,
        sampleData.longDescription,
        sampleData.sampleForm,
        sampleData.sampleFormOther,
        sampleData.sampleType,
        sampleData.sampleTypeOther,
        sampleData.sampleImg,
        sampleData.storageBuilding,
        sampleData.storageBuildingOther,
        sampleData.storageRoom,
        sampleData.storageRoomOther,
        sampleData.storageDetails,
        sampleData.storageDuration,
        locationRectangleBoundsSouth,
        locationRectangleBoundsWest,
        locationRectangleBoundsNorth,
        locationRectangleBoundsEast,
        sampleData.locationMarkerlat,
        sampleData.locationMarkerlng
    ];
    const ret: QueryResult = await client.query(query, values);
    return ret;
}

let pool: Pool | null = null;
export async function getPoolClient(): Promise<PoolClient>{
    if (pool == null) pool = await createPool();
    return await pool.connect();    
}

export function buildSample(dbRow: any): Sample {

    console.log("row:", dbRow.id, dbRow.location_rectangle_bounds_south);
    return {
        id: dbRow.id,
        sampleId: dbRow.sample_id,
        category: dbRow.category,
        collectorName: dbRow.collector_name,
        advisorName: dbRow.advisor_name,
        advisorOtherName: dbRow.advisor_other_name,
        collectionYear: dbRow.collection_year,
        collectionReason: dbRow.collection_reason,
        collectionReasonOther: dbRow.collection_reason_other,
        collectionLocation: dbRow.collection_location,
        shortDescription: dbRow.short_description,
        longDescription: dbRow.long_description,
        sampleForm: dbRow.sample_form,
        sampleFormOther: dbRow.sample_form_other,
        sampleType: dbRow.sample_type,
        sampleTypeOther: dbRow.sample_type_other,
        sampleImg: dbRow.sample_img,
        storageBuilding: dbRow.storage_building,
        storageRoom: dbRow.storage_room,
        storageDetails: dbRow.storage_details,
        storageDuration: dbRow.storage_duration,

        locationRectangleBounds: dbRow.location_rectangle_south != null ? {
            south: dbRow.location_rectangle_south,
            west: dbRow.location_rectangle_west,
            north: dbRow.location_rectangle_north,
            east: dbRow.location_rectangle_east
        } : null,
        locationMarkerlat: dbRow.location_marker_lat,
        locationMarkerlng: dbRow.location_marker_lng
    }
}

export async function createPool(): Promise<Pool> {
    return new Pool(await getDBConfig());
}

export async function getDBConfig() {
    let secret = await getSecret(process.env.AWS_REGION, process.env.DB_SECRET_KEY);
    let secretData = JSON.parse(secret.SecretString);
    return {
        user: secretData.username!,
        password: secretData.password!,
        host: process.env.DB_HOST_NAME!,
        port: Number(process.env.DB_PORT!),
        database: process.env.DB_NAME!,
        ssl : { rejectUnauthorized: false }
    };
}

export async function getSecretValue(aws_region: string | undefined, secret_name: string | undefined, key: string): Promise<string | undefined> {
    let secret = await getSecret(aws_region, secret_name);
    return secret.SecretString ? JSON.parse(secret.SecretString)[key] : undefined;
}

export async function getSecret(aws_region: string | undefined, secret_name: string | undefined): Promise<any> {
    const client = new SecretsManagerClient({ region: aws_region });

    let response;

    try {
        response = await client.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT",
            })
        );
    } catch (error) {
        throw error;
    }

    return response;
}

export function responseOK(statusCode: number, data: any): APIGatewayProxyResult {
    return {
        statusCode: statusCode,
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE'
        }
    };
};


export function responseError(statusCode: number = 500, message: string = 'Internal server error'): APIGatewayProxyResult {
    return {
        statusCode: statusCode,
        body: JSON.stringify({ message }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE'
        }
    };
};

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
  
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (error) => reject(error));
    });
  }

  export async function getSSMParameter(ssm:SSM, parameterName:string){
    const params = {
        Name: parameterName,
        WithDecryption: true
      };
  
      const data = await ssm.getParameter(params);
      return data.Parameter?.Value;
}  