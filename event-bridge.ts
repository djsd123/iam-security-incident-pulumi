import { cloudwatch } from '@pulumi/aws'
import { cloudwatchEventsExecutionRole } from './iam'
import { stateMachine } from './step-function'

/*
*  https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event.html
*  To record events with a detail-type value of AWS API Call via CloudTrail, a CloudTrail trail with logging enabled is required.
*/
const iamEventRule = new cloudwatch.EventRule('iam-event-rule', {
    name: 'iam-event-rule',
    description: 'New Policy Created',
    isEnabled: true,

    eventPattern: `{
        "source": ["aws.iam"],
        "detail-type": ["AWS API Call via CloudTrail"],
        "detail": {
            "eventSource": ["iam.amazonaws.com"],
            "eventName": ["CreatePolicy"]
        }
    }`
})

new cloudwatch.EventTarget('iam-event-target', {
    targetId: 'StateMachineTarget',
    arn: stateMachine.arn,
    rule: iamEventRule.name,
    roleArn: cloudwatchEventsExecutionRole.arn,
})
