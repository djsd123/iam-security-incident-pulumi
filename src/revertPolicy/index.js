const AWS = require('aws-sdk')

let restrictedActions = process.env.restrictedActions.split(',')
let iam = new AWS.IAM({ apiVersion: '2010-05-08' })

exports.handler = async (event, context) => {
    console.log(event)

    /* The following command Create a new blank policy version as a placeholder */
    let createParams = {
        PolicyArn: event.policyMeta.arn, /* Required */
        PolicyDocument: '{"Version": "2012-10-17","Statement": [{ "Sid": "VisualEditor0","Effect": "Allow","Action": "logs:GetLogGroupFields", "Resource": "*"}] }',
        SetAsDefault: true
    }

    try {
        const res = await iam.createPolicyVersion(createParams).promise()
    } catch (err) {
        console.error(err)
    }

    /* Delete the restricted policy version */
    let deleteParams = {
        PolicyArn: event.policyMeta.arn, /* Required */
        VersionId: event.policyMeta.defaultVersionId /* Required */
    }

    try {
        const res = await iam.deletePolicyVersion(deleteParams).promise()
    } catch (err) {
        console.error(err)
    }

    return {
        'message': `Policy ${event.policyMeta.policyName} Has been altered and contains restricted Actions: ${event.policy}, please approve or deny this change`,
        'action': 'remedy'
    }
}
