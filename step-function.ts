import * as pulumi from '@pulumi/pulumi'
import { iam } from '@pulumi/aws'
import { stepfunctions } from '@pulumi/aws-native'
import { stateMachineLogGroup } from './cloudwatch'
import {
    askUserFunction,
    policyChangerApproveFunction,
    receiveUser as receiveUserFunction,
    revertPolicyFunction,
    validatePolicyFunction
} from './lambda'
import { alertTopic } from './sns'
import { region } from './variables';

export const stateMachine = pulumi.all([
    alertTopic.arn,
    askUserFunction.arn,
    policyChangerApproveFunction.arn,
    receiveUserFunction.receiveUserFunction.arn,
    revertPolicyFunction.arn,
    validatePolicyFunction.arn
]).apply(([
    alertTopicArn,
    askUserFunctionArn,
    policyChangerApproveFunctionArn,
    receiveUserFunctionArn,
    revertPolicyFunctionArn,
    validatePolicyFunctionArn
]) => {
    const stateExecutionRole = new iam.Role('state-execution-role', {
        name: 'state-execution',
        assumeRolePolicy: iam.assumeRolePolicyForPrincipal({ Service: `states.${region}.amazonaws.com` })
    })

    const stateExecutionPolicy = new iam.Policy('state-execution-policy', {
        name: 'state-machine-tasks',

        policy: {
            Version: '2012-10-17',

            Statement: [
                {
                    Sid: 'InvokeFunction',
                    Effect: 'Allow',
                    Action: [ 'lambda:InvokeFunction' ],

                    Resource: [
                        askUserFunctionArn,
                        policyChangerApproveFunctionArn,
                        receiveUserFunctionArn,
                        revertPolicyFunctionArn,
                        validatePolicyFunctionArn
                    ]
                },
                {
                    Sid: 'PublishToTopic',
                    Effect: 'Allow',
                    Action: [ 'sns:Publish' ],
                    Resource: alertTopicArn
                }
            ]
        }
    })

    new iam.RolePolicyAttachment('state-machine-role-policy-attachment', {
        role: stateExecutionRole.id,
        policyArn: stateExecutionPolicy.arn
    })

    return new stepfunctions.StateMachine('state-machine', {
        stateMachineName: 'iam-security-incident',
        stateMachineType: 'STANDARD',
        roleArn: stateExecutionRole.arn,

        loggingConfiguration: {
            includeExecutionData: true,

            destinations: [
                {
                    cloudWatchLogsLogGroup: {
                        logGroupArn: stateMachineLogGroup.arn
                    }
                }
            ]
        },

        definitionString: JSON.stringify({
                "Comment": "Defect detection state machine",
                "StartAt": "ModifyState",
                "States": {
                    "ModifyState": {
                        "Type": "Pass",
                        "Parameters": {
                            "policy.$": "$.detail.requestParameters.policyDocument",
                            "accountId.$": "$.detail.userIdentity.accountId",
                            "region.$": "$.region",
                            "policyMeta.$": "$.detail.responseElements.policy"
                        },
                        "ResultPath": "$",
                        "Next": "ValidatePolicy"
                    },
                    "ValidatePolicy": {
                        "Type": "Task",
                        "ResultPath": "$.taskresult",
                        "Resource": validatePolicyFunctionArn,
                        "Next": "ChooseAction"
                    },
                    "RevertPolicyArn": {
                        "Type": "Task",
                        "ResultPath": "$.taskresult",
                        "Resource": revertPolicyFunctionArn,
                        "Next": "AskUser"
                    },
                    "ChooseAction": {
                        "Type": "Choice",
                        "Choices": [
                            {
                                "Variable": "$.taskresult.action",
                                "StringEquals": "remedy",
                                "Next": "RevertPolicyArn"
                            },
                            {
                                "Variable": "$.taskresult.action",
                                "StringEquals": "alert",
                                "Next": "AllowWithNotification"
                            }
                        ],
                        "Default": "AllowWithNotification"
                    },
                    "AllowWithNotification": {
                        "Type": "Task",
                        "Resource": "arn:aws:states:::sns:publish",
                        "Parameters": {
                            "TopicArn": alertTopicArn,
                            "Subject": "Policy change detected!",
                            "Message.$": "$.taskresult.message"
                        },
                        "End": true
                    },
                    "AskUser": {
                        "Type": "Task",
                        "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
                        "Parameters": {
                            "FunctionName": askUserFunctionArn,
                            "Payload": {
                                "token.$": "$$.Task.Token"
                            }
                        },
                        "ResultPath": "$.taskresult",
                        "Next": "usersChoice"
                    },
                    "usersChoice": {
                        "Type": "Choice",
                        "Choices": [
                            {
                                "Variable": "$.taskresult.action",
                                "StringEquals": "delete",
                                "Next": "denied"
                            },
                            {
                                "Variable": "$.taskresult.action",
                                "StringEquals": "allow",
                                "Next": "approved"
                            }
                        ],
                        "Default": "denied"
                    },
                    "denied": {
                        "Type": "Pass",
                        "End": true
                    },
                    "approved": {
                        "Type": "Task",
                        "Resource": policyChangerApproveFunctionArn,
                        "End": true
                    }
                }
            }
        )
    })
})
