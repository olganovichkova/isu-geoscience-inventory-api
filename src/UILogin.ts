import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
import { responseError, responseOK } from './Utils';

export const handler = async (
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {

    try {
        const { code } = event.queryStringParameters || {};

        if (!code) {
            return responseError(400, '"code" parameter is missing');
        }

        // const tokenEndpoint = "https://${process.env.USER_POOL_DOMAIN}/oauth2/token"
        const tokenEndpoint = "https://isu-geo.auth.us-east-1.amazoncognito.com/oauth2/token";
        // const clientId = process.env.USER_POOL_CLIENT_ID;
        const clientId = "qm3vkrssecf42c8nj7612oath";
        const { apiId, path, stage } = event.requestContext;
        // const redirectUri = `https://${apiId}.execute-api.${process.env.AWS_REGION}.amazonaws.com/${stage}${path}`;
        const redirectUri = `http://localhost:3001${path}`;



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


        // Construct the redirect URL with tokens as query parameters
        const uiRrl = `http://localhost:3000/login?code=${code}&id_token=${id_token}&access_token=${access_token}&refresh_token=${refresh_token}`;

        // Return HTTP 302 Redirect response
        return {
            statusCode: 302,
            headers: {
                Location: uiRrl,
            },
            body: '',
        };

    } catch (error) {
        console.error('Error:', error);
        return responseError();
    }
}