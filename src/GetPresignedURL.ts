import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand, PutObjectRequest } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { FileParams, PresignedURL, responseError, responseOK } from './Utils';

export const handler = async (
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {

    try {
        if (!event.body) {
            return responseError(400, 'Request body is missing');
        }

        const fileParams: FileParams = JSON.parse(event.body) as FileParams;
        const res: PresignedURL = {
            url: '',
            sourceFileName: fileParams.name,
            destS3FileName: `upload/${uuidv4()}`
        }

        const params: PutObjectRequest = {
            Bucket: process.env.DATA_BUCKET,
            Key: res.destS3FileName,
            ContentType: fileParams.contentType
        };

        const client = new S3Client();
        const command = new PutObjectCommand(params);
        res.url = await getSignedUrl(client, command, { expiresIn: 3600 });

        return responseOK(201, res);

    } catch (error) {
        console.log('Error processing request:', error);
        return responseError();
    }
};
