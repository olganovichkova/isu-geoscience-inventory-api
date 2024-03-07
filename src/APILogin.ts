import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { responseError, responseOK } from './Utils';



export const handler = async (
    event: APIGatewayEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {
    try {

        if (!event.body) {
            return responseError(400, 'Request body is missing');
        }

        const { username, password } = JSON.parse(event.body);
        const auth_data = { 'USERNAME': username, 'PASSWORD': password };

        const provider_client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
        const command = new AdminInitiateAuthCommand({
            UserPoolId: process.env.USER_POOL_ID,
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            AuthParameters: auth_data,
            ClientId: process.env.USER_POOL_CLIENT_ID
        });

        const resp = await provider_client.send(command);
        const token = resp.AuthenticationResult?.IdToken;

        return responseOK(201, { 'id_token': token });


    } catch (error) {
        console.log('error: ', error);
        return responseError();
    }
}

