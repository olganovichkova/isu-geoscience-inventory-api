import { Pool, QueryResult, PoolClient } from "pg";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import {
  APIGatewayEvent,
  APIGatewayProxyResult,
} from "aws-lambda/trigger/api-gateway-proxy";
import { Readable } from "stream";
import { SSM } from "@aws-sdk/client-ssm";
import jwt from "jsonwebtoken";

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
    south: number;
    west: number;
    north: number;
    east: number;
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
    south: number;
    west: number;
    north: number;
    east: number;
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
  success: boolean;
  message: string;
}

export class Field {
  constructor(
    public name: string,
    public type: "string" | "string[]" | "number"
  ) {}
}

export const PROP_FILED_MAP: { [key: string]: Field } = {
  sampleId: new Field("sample_id", "string"),
  category: new Field("category", "string"),
  collectorName: new Field("collector_name", "string"),
  advisorName: new Field("advisor_name", "string"),
  advisorOtherName: new Field("advisor_other_name", "string"),
  collectionYear: new Field("collection_year", "number"),
  collectionReason: new Field("collection_reason", "string[]"),
  collectionReasonOther: new Field("collection_reason_other", "string"),
  collectionLocation: new Field("collection_location", "string[]"),
  shortDescription: new Field("short_description", "string"),
  longDescription: new Field("long_description", "string"),
  sampleForm: new Field("sample_form", "string[]"),
  sampleFormOther: new Field("sample_form_other", "string"),
  sampleType: new Field("sample_type", "string[]"),
  sampleTypeOther: new Field("sample_type_other", "string"),
  sampleImg: new Field("sample_img", "string"),
  storageBuilding: new Field("storage_building", "string"),
  storageBuildingOther: new Field("storage_building_other", "string"),
  storageRoom: new Field("storage_room", "string"),
  storageRoomOther: new Field("storage_room_other", "string"),
  storageDetails: new Field("storage_details", "string"),
  storageDuration: new Field("storage_duration", "number"),
  locationRectangleBoundsSouth: new Field("location_rectangle_south", "number"),
  locationRectangleBoundsWest: new Field("location_rectangle_west", "number"),
  locationRectangleBoundsNorth: new Field("location_rectangle_north", "number"),
  locationRectangleBoundsEast: new Field("location_rectangle_east", "number"),
  locationMarkerlat: new Field("location_marker_lat", "number"),
  locationMarkerlng: new Field("location_marker_lng", "number"),
};

export function buildSamples(dbRows: any[]): Sample[] {
  return dbRows.map(buildSample);
}

export async function insertSample(
  client: PoolClient,
  sampleData: any,
  event: APIGatewayEvent,
  isBatchUpload: boolean = false,
  batchUploadOriginalFName: string = "",
  batchUploadS3Uri: string = ""
): Promise<QueryResult> {
  const fieldNames: string[] = [];
  const fieldValues: string[] = [];
  const values: any[] = [];

  let cIndex = 1;

  if (
    "locationRectangleBounds" in sampleData &&
    sampleData.locationRectangleBounds != null
  ) {
    const bounds = sampleData.locationRectangleBounds;

    fieldNames.push("location_rectangle_south");
    values.push(bounds.south);
    fieldValues.push(`$${cIndex++}`);

    fieldNames.push("location_rectangle_west");
    values.push(bounds.west);
    fieldValues.push(`$${cIndex++}`);

    fieldNames.push("location_rectangle_north");
    values.push(bounds.north);
    fieldValues.push(`$${cIndex++}`);

    fieldNames.push("location_rectangle_east");
    values.push(bounds.east);
    fieldValues.push(`$${cIndex++}`);

    delete sampleData.locationRectangleBounds;
  }

  for (let prop of Object.keys(sampleData)) {
    if (prop in PROP_FILED_MAP == false) {
      // throw new Error(`Invalid property: ${prop}`);
      continue;
    }

    const field = PROP_FILED_MAP[prop];
    const value = sampleData[prop];

    if (field.type == "string") {
      if (value == null) {
        continue;
      }

      if (typeof value !== "string") {
        throw new Error(`Invalid value for ${prop}`);
      }
      values.push(value.trim());
      fieldNames.push(field.name);
      fieldValues.push(`$${cIndex++}`);
    } else if (field.type == "number") {
      if (value == null && `${value} ` != "") {
        continue;
      }

      try {
        values.push(Number(value));
      } catch (error) {
        throw new Error(`Invalid value for ${prop}`);
      }
      fieldNames.push(field.name);
      fieldValues.push(`$${cIndex++}`);
    } else if (field.type == "string[]") {
      if (value == null && `${value} ` != "") {
        continue;
      }

      if (value instanceof Array) {
        values.push(value);
      } else if (typeof value === "string") {
        const terms: string[] = value.split(",").map((term) => term.trim());
        values.push(terms);
      } else {
        throw new Error(`Invalid value for ${prop}`);
      }
      fieldNames.push(field.name);
      fieldValues.push(`$${cIndex++}`);
    }
  }

  if (fieldNames.length == 0) {
    throw new Error("No valid fields in a sample to be added");
  }

  //add system fields
  // sys_is_active
  // sys_create_timestamp
  // sys_create_user_uuid
  // sys_is_batch_upload
  // sys_batch_upload_s3_uri
  // sys_batch_upload_original_fname
  // sys_delete_timestamp
  // sys_delete_user_uuid

  fieldNames.push("sys_is_active");
  fieldValues.push(`$${cIndex++}`);
  values.push(true);

  fieldNames.push("sys_create_timestamp");
  fieldValues.push(`$${cIndex++}`);
  values.push(new Date().toISOString());

  fieldNames.push("sys_create_user_uuid");
  fieldValues.push(`$${cIndex++}`);
  values.push(getUserUUID(event));

  fieldNames.push("sys_is_batch_upload");
  fieldValues.push(`$${cIndex++}`);
  values.push(isBatchUpload);

  fieldNames.push("sys_batch_upload_s3_uri");
  fieldValues.push(`$${cIndex++}`);
  values.push(batchUploadS3Uri);

  fieldNames.push("sys_batch_upload_original_fname");
  fieldValues.push(`$${cIndex++}`);
  values.push(batchUploadOriginalFName);

  // fieldNames.push("sys_delete_timestamp");
  // fieldValues.push(`$${cIndex++}`);
  // values.push(true);

  // fieldNames.push("sys_delete_user_uuid");
  // fieldValues.push(`$${cIndex++}`);
  // values.push(true);

  const query = `insert into sample(${fieldNames.join(
    ","
  )} ) values( ${fieldValues.join(",")})`;
  return await client.query(query, values);
}

export async function insertSample1(
  client: PoolClient,
  sampleData: Sample
): Promise<QueryResult> {
  const locationRectangleBoundsSouth =
    sampleData.locationRectangleBounds != null
      ? sampleData.locationRectangleBounds.south
      : "locationRectangleBoundsSouth" in sampleData
      ? sampleData.locationRectangleBoundsSouth
      : null;

  const locationRectangleBoundsWest =
    sampleData.locationRectangleBounds != null
      ? sampleData.locationRectangleBounds.west
      : "locationRectangleBoundsWest" in sampleData
      ? sampleData.locationRectangleBoundsWest
      : null;

  const locationRectangleBoundsNorth =
    sampleData.locationRectangleBounds != null
      ? sampleData.locationRectangleBounds.north
      : "locationRectangleBoundsNorth" in sampleData
      ? sampleData.locationRectangleBoundsNorth
      : null;

  const locationRectangleBoundsEast =
    sampleData.locationRectangleBounds != null
      ? sampleData.locationRectangleBounds.east
      : "locationRectangleBoundsEast" in sampleData
      ? sampleData.locationRectangleBoundsEast
      : null;

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
    sampleData.locationMarkerlng,
  ];
  const ret: QueryResult = await client.query(query, values);
  return ret;
}

let pool: Pool | null = null;
export async function getPoolClient(): Promise<PoolClient> {
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

    locationRectangleBounds:
      dbRow.location_rectangle_south != null
        ? {
            south: dbRow.location_rectangle_south,
            west: dbRow.location_rectangle_west,
            north: dbRow.location_rectangle_north,
            east: dbRow.location_rectangle_east,
          }
        : null,
    locationMarkerlat: dbRow.location_marker_lat,
    locationMarkerlng: dbRow.location_marker_lng,
  };
}

export async function createPool(): Promise<Pool> {
  return new Pool(await getDBConfig());
}

export async function getDBConfig() {
  let secret = await getSecret(
    process.env.AWS_REGION,
    process.env.DB_SECRET_KEY
  );
  let secretData = JSON.parse(secret.SecretString);
  return {
    user: secretData.username!,
    password: secretData.password!,
    host: process.env.DB_HOST_NAME!,
    port: Number(process.env.DB_PORT!),
    database: process.env.DB_NAME!,
    ssl: { rejectUnauthorized: false },
  };
}

export async function getSecretValue(
  aws_region: string | undefined,
  secret_name: string | undefined,
  key: string
): Promise<string | undefined> {
  let secret = await getSecret(aws_region, secret_name);
  return secret.SecretString ? JSON.parse(secret.SecretString)[key] : undefined;
}

export async function getSecret(
  aws_region: string | undefined,
  secret_name: string | undefined
): Promise<any> {
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

export function responseOK(
  statusCode: number,
  data: any
): APIGatewayProxyResult {
  return {
    statusCode: statusCode,
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT, DELETE",
    },
  };
}

export function responseError(
  statusCode: number = 500,
  message: string = "Internal server error"
): APIGatewayProxyResult {
  return {
    statusCode: statusCode,
    body: JSON.stringify({ message }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT, DELETE",
    },
  };
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (error) => reject(error));
  });
}

export async function getSSMParameter(ssm: SSM, parameterName: string) {
  const params = {
    Name: parameterName,
    WithDecryption: true,
  };

  const data = await ssm.getParameter(params);
  return data.Parameter?.Value;
}

export function getUserUUID(event: APIGatewayEvent): string {
  const token: string | undefined = event.headers?.Authorization?.substring(
    "Bearer ".length
  );

  if (!token) {
    throw new Error("Authorization token is missing");
  }

  try {
    const decodedToken = jwt.decode(token, { complete: true });
    return (decodedToken?.payload as jwt.JwtPayload).sub!;
  } catch (error) {
    throw new Error("Invalid JWT token or missing sub claim");
  }
}
