# IAM Security Incident Pulumi
A complete Pulumi representation of this AWS sample: [automating a security incident with step functions](https://github.com/aws-samples/automating-a-security-incident-with-step-functions)

[pulumi]: https://www.pulumi.com/docs/get-started/install/

[node]: https://nodejs.org/en/download/package-manager/

## Requirements

| Name     | Version            |
|----------|--------------------|
| [Pulumi] | > = 3.8.0, < 4.0.0 |
| [node]   | > = 14.x, < 15.x   |


## Providers

| Name | Version        |
| ---- |----------------|
| aws  | > = 5.0.0, < 6.0.0 |
| awsx  | = 0.40.0       |
| aws-native  | = 0.19.0       |

## Usage

**Note**

Must be deployed to the `us-east-1` region.  This is because IAM is a global service which mean it exists in `us-east-1` only.
Events from IAM can only be captured with a cloudtrail in the `us-east-1` region

As well as setting your AWS credentials you'll need to set the following environment variables

```shell
export AWS_REGION=us-east-1
export PULUMI_PREFER_YARN=true  // Optional
export PULUMI_BACKEND_URL=s3://<YOUR-BUCKET>
```

Create Stack

```shell
pulumi stack init
```

Set Your email address to receive notifications form sns

```shell
pulumi config set --secret emailaddress <YOUR EMAIL ADDRESS>
```

Plan/Preview

```shell
pulumi preview
```

Deploy

```shell
pulumi up
```

Cleanup

```shell
pulumi destroy -y
```

## Test Deployment

Use the AWS CLI to create a new policy. An example policy document has been included in this repository named [badpolicy.json](badpolicy.json).

```shell
aws iam create-policy --policy-name my-bad-policy --policy-document file://badpolicy.json
```

Or

Use Pulumi to deploy a bad policy [iam-bad-policy](https://github.com/djsd123/iam-bad-policy)
