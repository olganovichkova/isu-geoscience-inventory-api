process.env.AWS_SDK_LOAD_CONFIG="1";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import * as readlineSync from 'readline-sync';
import { exec } from 'child_process';

const STACK_BASE_NAME = "isu-geo";

async function deployStack(): Promise<void>{
    // Get the environment from the user
    const environment: string = readlineSync.question("Enter the environment (dev, staging, prod): ");

    // Get the database username and password from the user
    const dbUsername: string = readlineSync.question("Enter the database username: ");
    const dbPassword: string = readlineSync.question("Enter the database password: ", {
        hideEchoBack: true
    });

    // Create a Secrets Manager client
    const secretsManager = new SecretsManager();

    // Create the secret string as a JSON-formatted string
    const secretString = JSON.stringify({
        username: dbUsername,
        password: dbPassword,
    });

    // Create the secret name based on the environment
    const secretName: string = `/${STACK_BASE_NAME}/${environment}/db/credentials`;

    try{
        // Create the secret in AWS Secrets Manager
        const response = await secretsManager.createSecret({
            Name: secretName,
            SecretString: secretString,
        });

        console.log("Secret created successfully.");
        console.log(`Secret ARN: ${response.ARN}`);

    } catch(error){
        console.log("Error creating secret:", (error as Error).message);
    }
    deploySAM(environment, secretName);
}

function deploySAM(stageName: string, secretName: string): void {
    const stackName = `${STACK_BASE_NAME}-api-${stageName}`;
    const command = `sam deploy --stack-name ${stackName} --capabilities CAPABILITY_IAM --parameter-overrides DBSecretKey=${secretName} --no-confirm-changeset`;

    const childProcess = exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error deploying SAM stack: ${error.message}`);
            return;
        }
    });

    childProcess.stdout?.on('data', (data) => {
        console.log(data.trimRight());
    });

    childProcess.stderr?.on('data', (data) => {
        console.log(data.trimRight());
    });
}



deployStack();





