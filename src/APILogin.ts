import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { SSM } from '@aws-sdk/client-ssm';
import { getSSMParameter, responseError, responseOK } from './Utils';




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

        const { stage } = event.requestContext;
        const ssm = new SSM();
        const stackBaseName = process.env.STACK_BASE_NAME;
        const userPoolId = await getSSMParameter(ssm, `/${stackBaseName}/${stage}/userpool/id`);
        const clientId = await getSSMParameter(ssm, `/${stackBaseName}/${stage}/userpool/client/id`);


        const provider_client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
        const command = new AdminInitiateAuthCommand({
            UserPoolId: userPoolId,
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            AuthParameters: auth_data,
            ClientId: clientId
        });

        const resp = await provider_client.send(command);
        const token = resp.AuthenticationResult?.IdToken;

        return responseOK(201, { 'id_token': token });


    } catch (error) {
        console.log('error: ', error);
        return responseError();
    }
}

