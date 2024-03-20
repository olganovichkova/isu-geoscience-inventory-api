import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import {
  GetObjectCommand,
  GetObjectRequest,
  S3Client,
} from "@aws-sdk/client-s3";
import { PoolClient } from "pg";
import xlsx from "xlsx";
import { Readable } from "stream";
import {
  Sample,
  insertSample,
  PresignedURL,
  responseError,
  responseOK,
  streamToBuffer,
  getPoolClient,
} from "./Utils";

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return responseError(400, "Request body is missing");
    }
    const presignedURL = JSON.parse(event.body) as PresignedURL;

    // Get data from S3
    const s3Client = new S3Client();
    const params: GetObjectRequest = {
      Bucket: process.env.DATA_BUCKET!,
      Key: presignedURL.destS3FileName,
    };
    const getObjectResponse = await s3Client.send(new GetObjectCommand(params));

    //Parse excel data
    const workbook = xlsx.read(
      await streamToBuffer(getObjectResponse.Body as Readable),
      { type: "buffer" }
    );
    const sheetName = workbook.SheetNames[0];
    const samples = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    ) as Sample[];

    // Insert samples
    let client: PoolClient;

    return getPoolClient()
      .then((newClient) => {
        client = newClient;
      })
      .then(() => {
        // Start a transaction
        return client.query("BEGIN");
      })
      .then(() => {
        // Insert all samples
        return Promise.all(
          samples.map((sample) =>
            insertSample(
              client,
              sample,
              event,
              true,
              presignedURL.sourceFileName,
              `s3://${process.env.DATA_BUCKET}/${presignedURL.destS3FileName}`
            )
          )
        );
      })
      .then(() => {
        // Commit the transaction
        return client.query("COMMIT");
      })
      .then(() => {
        console.log("Transaction successfully committed");
        return responseOK(201, { success: true, message: "" });
      })
      .catch((error) => {
        // Rollback the transaction if an error occurs
        console.log("Error in transaction:", error);
        client.query("ROLLBACK");
        return responseError(400, (error as Error).message);
      })
      .finally(() => {
        client.release();
      });
  } catch (error) {
    console.log("Error processing request:", error);
    return responseError();
  }
};
