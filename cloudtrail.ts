import * as pulumi from '@pulumi/pulumi'
import { cloudtrail, getCallerIdentity, s3 } from '@pulumi/aws'
import { iamSecurityIncidentCloudtrailLogGroup } from './cloudwatch'
import { cloudtrailLoggingRole } from './iam'

const accountId = getCallerIdentity().then(id => id.accountId)

const cloudtrailBucket = new s3.BucketV2('cloudtrail-bucket', {
    bucketPrefix: 'iam-security',
    forceDestroy: true,
})

new s3.BucketAclV2('cloudtrail-bucket-acl', {
    bucket: cloudtrailBucket.id,
    acl: 'private'
})
pulumi.all([cloudtrailBucket.arn, accountId]).apply(([cloudtrailBucketArn, accountId]) => {
    new s3.BucketPolicy('cloudtrail-bucket-policy', {
        bucket: cloudtrailBucket.id,
        policy: {
            Version: '2012-10-17',

            Statement: [
                {
                    Sid: 'AWSCloudTrailAclCheck',
                    Effect: 'Allow',
                    Action: ['s3:GetBucketAcl'],

                    Principal: {
                        Service: 'cloudtrail.amazonaws.com'
                    },

                    Resource: cloudtrailBucketArn
                },
                {
                    Sid: 'AWSCloudTrailWrite',
                    Effect: 'Allow',
                    Action: ['s3:PutObject'],

                    Principal: {
                        Service: 'cloudtrail.amazonaws.com'
                    },

                    Resource: pulumi.interpolate `${cloudtrailBucketArn}/iam/AWSLogs/${accountId}/*`,
                    Condition: {
                        StringEquals: {
                            's3:x-amz-acl': 'bucket-owner-full-control'
                        }
                    }
                }
            ]
        }
    })
});
/*
*  https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event.html
*  To record events with a detail-type value of AWS API Call via CloudTrail, a CloudTrail trail with logging enabled is required.
*/
new cloudtrail.Trail('iam-security-incident-cloudtrail', {
    name: 'iam-security-incident',
    enableLogging: true,
    s3BucketName: cloudtrailBucket.id,
    isMultiRegionTrail: true,
    s3KeyPrefix: 'iam',
    cloudWatchLogsGroupArn: pulumi.interpolate `${iamSecurityIncidentCloudtrailLogGroup.arn}:*`,
    cloudWatchLogsRoleArn: cloudtrailLoggingRole.arn
});
