# isu-geoscience-inventory-api

REST API for the geoscience sample inventory at Idaho State University. This REST API is implemented in Typescript and this module is deployed as a serverless application.

### Steps To Deploy

1. Login to the AWS console.

2. Make sure the region is set to the correct region.

3. open AWS CloudShell in the AWS console.

4. Run commands to install prerequisites:

```bash
sudo npm install -g ts-node
sudo npm install -g esbuild
```

5. Clone the API github repository.

```bash
git clone [github_repo]
```

6. Direct to the projects root directory.

```bash
cd isu-geoscience-inventory-api
```

7. Run npm install:

```bash
npm install
```

8. Run sam build:

```bash
sam build
```

9. Run the following command to deploy to AWS:

```bash
ts-node deploy.ts
```

10. Enter the stack environment prefix.

11. Enter the database credentials

12. NOTE:**_This step is required if there is an issue with login_** Direct to the AWS cognito service in the console and go to the Hosted UI and edit the hosted UI, then save without making any changes.

13. Run the following command to create the table in the database:

```bash
sudo yum install postgresql15 [endpoint_to_rds] -a -f ./db.sql
```

14. Go to cognito user pool users to create a user.
