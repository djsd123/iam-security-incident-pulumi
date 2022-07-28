import { iam } from '@pulumi/aws'
import { stateMachine } from './step-function'

export const loggingPolicy = new iam.Policy('logging-policy', {
    name: 'logging-policy',
    description: 'Policy to allow services to log their events',

    policy: {
        Version: '2012-10-17',
        Id: 'LoggingPolicy',

        Statement: [
            {
                Sid: 'LoggingPolicy',
                Effect: 'Allow',

                Action: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],

                Resource: 'arn:aws:logs:*:*:*',
            }
        ]
    }
})

const startStepFunctionsPolicy = new iam.Policy('start-step-functions-policy', {
    name: 'start-step-functions',

    policy: {
        Version: '2012-10-17',

        Statement: [
            {
                Sid: 'StartStepFunctions',
                Effect: 'Allow',
                Action: [ 'states:StartExecution' ],
                Resource: stateMachine.arn
            }
        ]
    }
})

export const cloudwatchEventsExecutionRole = new iam.Role('cloudwatch-events-execution-role', {
    name: 'cloudwatch-events-execution',
    assumeRolePolicy: iam.assumeRolePolicyForPrincipal({ Service: 'events.amazonaws.com' }),
})

new iam.RolePolicyAttachment('cloudwatch-events-execution-policy-attachment', {
    role: cloudwatchEventsExecutionRole.id,
    policyArn: startStepFunctionsPolicy.arn
})

export const cloudtrailLoggingRole = new iam.Role('cloudtrail-logging-role', {
    name: 'cloudtrail-logging',
    assumeRolePolicy: iam.assumeRolePolicyForPrincipal({ Service: 'cloudtrail.amazonaws.com' }),
})

new iam.RolePolicyAttachment('cloudtrail-logging-policy-attachment', {
    role: cloudtrailLoggingRole.id,
    policyArn: loggingPolicy.arn
})
