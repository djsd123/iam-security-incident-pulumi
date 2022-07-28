import * as pulumi from '@pulumi/pulumi'
import { iam, lambda } from '@pulumi/aws'
import { apigateway } from '@pulumi/awsx';
import * as path from 'path';

import { loggingPolicy } from './iam'
import { alertTopic } from './sns';
import { config } from './variables'


export { askUserFunction, policyChangerApproveFunction, receiveUser, revertPolicyFunction, validatePolicyFunction }

const sourcePath = 'src'
const handler = 'index.handler'
const runtime = 'nodejs14.x'
const assumeRolePolicy = iam.assumeRolePolicyForPrincipal({ Service: 'lambda.amazonaws.com' })

const functionParams = {
    handler,
    runtime,
    environment: {
        variables: {
            restrictedActions: config.restrictedActions
        }
    }
}

const receiveUser = pulumi.all([]).apply(([]) => {
    const receiveUserPolicy = new iam.Policy('receive-user-policy', {
        name: 'receive-user',

        policy: {
            Version: '2012-10-17',

            Statement: [
                {
                    Sid: 'ReceiveUser',
                    Effect: 'Allow',
                    Action: [ 'states:SendTaskSuccess' ],
                    Resource: '*' // Can't reference stateMachine which in turn references this
                }
            ]
        }
    })

    const receiveUserRole = new iam.Role('receive-user-role', {
        name: 'receive-user',
        assumeRolePolicy
    })

    new iam.RolePolicyAttachment('receive-user-role-policy-attachment', {
        role: receiveUserRole.id,
        policyArn: receiveUserPolicy.arn
    })

    new iam.RolePolicyAttachment('receive-user-logging-policy-attachment', {
        role: receiveUserRole.id,
        policyArn: loggingPolicy.arn,
    })

    const receiveUserFunction =  new lambda.Function('receive-user-function', {
        name: 'receive-user',
        role: receiveUserRole.arn,
        code: new pulumi.asset.FileArchive(path.join(sourcePath, 'receiveUser')),
        ...functionParams,
    })

    new lambda.Permission('receive-user--lambda-permission', {
        action: 'lambda:InvokeFunction',
        function: receiveUserFunction.name,
        principal: 'apigateway.amazonaws.com'
    })

    const receiveUserApi = new apigateway.API('receive-user-api', {
        stageName: 'Prod',

        restApiArgs: {
            binaryMediaTypes: []
        },

        routes: [
            {
                path: '/allow',
                method: 'GET',
                eventHandler: receiveUserFunction
            },
            {
                path: '/deny',
                method: 'GET',
                eventHandler: receiveUserFunction
            }
        ]
    })

    return { receiveUserFunction, receiveUserApi }
})

const askUserFunction = pulumi.all([alertTopic.arn, receiveUser.receiveUserApi]).apply(([topicArn, api]) => {
    const askUserPolicy = new iam.Policy('ask-user-policy', {
        name: 'ask-user',

        policy: {
            Version: '2012-10-17',

            Statement: [
                {
                    Sid: 'AskUser',
                    Effect: 'Allow',
                    Action: [ 'sns:Publish' ],
                    Resource: topicArn
                }
            ]
        }
    })

    const askUserRole = new iam.Role('ask-user-role', {
        name: 'ask-user',
        assumeRolePolicy,
    })

    new iam.RolePolicyAttachment('ask-user-role-policy-attachment', {
        role: askUserRole.id,
        policyArn: askUserPolicy.arn
    })

    new iam.RolePolicyAttachment('ask-user-logging-policy-attachment', {
        role: askUserRole.id,
        policyArn: loggingPolicy.arn,
    })

    /* Add environment variables */
    const askUserParams = {...functionParams, environment: {
        ...functionParams.environment, variables: {
            ...functionParams.environment.variables,
                APIAllowEndpoint: pulumi.interpolate `${api.stage.invokeUrl}/allow`,
                APIDenyEndpoint: pulumi.interpolate `${api.stage.invokeUrl}/deny`,
                TOPIC: topicArn
        }
    }}

    return new lambda.Function('ask-user-function', {
        name: 'ask-user',
        role: askUserRole.arn,
        code: new pulumi.asset.FileArchive(path.join(sourcePath, 'askUser')),
        ...askUserParams,
    })
})

const policyChangerApproveFunction = pulumi.all([]).apply(([]) => {
    const policyChangerApprovePolicy = new iam.Policy('policy-changer-approve-policy', {
        name: 'policy-changer-approve',

        policy: {
            Version: '2012-10-17',

            Statement: [
                {
                    Sid: 'PolicyChangerApprove',
                    Effect: 'Allow',
                    Action: [ 'iam:CreatePolicyVersion' ],
                    Resource: '*'
                }
            ]
        }
    })

    const policyChangerApproveRole = new iam.Role('policy-changer-approve-role', {
        name: 'policy-changer-approve',
        assumeRolePolicy
    })

    new iam.RolePolicyAttachment('policy-changer-approve-role-policy-attachment', {
        role: policyChangerApproveRole.id,
        policyArn: policyChangerApprovePolicy.arn
    })

    new iam.RolePolicyAttachment('policy-changer-approve-logging-policy-attachment', {
        role: policyChangerApproveRole.id,
        policyArn: loggingPolicy.arn,
    })

    return new lambda.Function('policy-changer-approve-function', {
        name: 'policy-changer-approve',
        role: policyChangerApproveRole.arn,
        code: new pulumi.asset.FileArchive(path.join(sourcePath, 'policyChangerApprove')),
        ...functionParams,
    })
})

const revertPolicyFunction = pulumi.all([]).apply(([]) => {
    const revertPolicyPolicy = new iam.Policy('revert-policy-policy', {
        name: 'revert-policy',

        policy: {
            Version: '2012-10-17',

            Statement: [
                {
                    Sid: 'RevertPolicy',
                    Effect: 'Allow',

                    Action: [
                        'iam:CreatePolicyVersion',
                        'iam:DeletePolicyVersion',
                    ],

                    Resource: '*'
                }
            ]
        }
    })

    const revertPolicyRole = new iam.Role('revert-policy-role', {
        name: 'revert-policy',
        assumeRolePolicy
    })

    new iam.RolePolicyAttachment('revert-policy-role-policy-attachment', {
        role: revertPolicyRole.id,
        policyArn: revertPolicyPolicy.arn
    })

    new iam.RolePolicyAttachment('revert-policy-logging-policy-attachment', {
        role: revertPolicyRole.id,
        policyArn: loggingPolicy.arn,
    })

    return new lambda.Function('revert-policy-function', {
        name: 'revert-policy',
        role: revertPolicyRole.arn,
        code: new pulumi.asset.FileArchive(path.join(sourcePath, 'revertPolicy')),
        ...functionParams,
    })
})

const validatePolicyFunction = pulumi.all([]).apply(([]) => {

    const validatePolicyRole = new iam.Role('validate-policy-role', {
        name: 'validate-policy',
        assumeRolePolicy
    })

    new iam.RolePolicyAttachment(`${validatePolicyRole.name}-logging-policy-attachment`, {
        role: validatePolicyRole.id,
        policyArn: loggingPolicy.arn,
    })

    return new lambda.Function('validate-policy-function', {
        name: 'validate-policy',
        role: validatePolicyRole.arn,
        code: new pulumi.asset.FileArchive(path.join(sourcePath, 'validatePolicy')),
        ...functionParams,
    })
})
