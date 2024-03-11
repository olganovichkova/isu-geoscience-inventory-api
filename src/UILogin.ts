import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { SSM } from '@aws-sdk/client-ssm';
import axios from 'axios';
import { getSSMParameter, responseError } from './Utils';

export const handler = async (
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {

    try {
        const { code } = event.queryStringParameters || {};

        if (!code) {
            return responseError(400, '"code" parameter is missing');
        }
        const { resourcePath, stage } = event.requestContext;

        const ssm = new SSM();
        const stackBaseName = process.env.STACK_BASE_NAME;
        const apiEndPoint = await getSSMParameter(ssm, `/${stackBaseName}/${stage}/api/endpoint`);
        const clientId = await getSSMParameter(ssm, `/${stackBaseName}/${stage}/userpool/client/id`);
        const userPoolDomain = await getSSMParameter(ssm, `/${stackBaseName}/${stage}/userpool/domain`);

        const tokenEndpoint = `https://${userPoolDomain}.auth.${process.env.AWS_REGION}.amazoncognito.com/oauth2/token`;
        const redirectUri = `${apiEndPoint}${resourcePath}`;

        const tokenResponse = await axios.post(tokenEndpoint, {
            grant_type: 'authorization_code',
            client_id: clientId,
            redirect_uri: redirectUri,
            code
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { id_token, access_token, refresh_token } = tokenResponse.data;
        const webAppURL = `${process.env.WEB_APP_REDIRECT_URL}?code=${code}&id_token=${id_token}&access_token=${access_token}&refresh_token=${refresh_token}`;
        console.log('--- webAppURL:', webAppURL);

        // Return HTTP 302 Redirect response
        return {
            statusCode: 302,
            headers: {
                Location: webAppURL,
            },
            body: '',
        };

    } catch (error) {
        console.error('Error:', error);
        return responseError();
    }
}

