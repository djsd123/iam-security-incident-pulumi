import { cloudwatch } from '@pulumi/aws'

export const stateMachineLogGroup = new cloudwatch.LogGroup('state-machine-log-group', {
    name: 'iam-security-incident-state-machine',
})

export const iamSecurityIncidentCloudtrailLogGroup = new cloudwatch.LogGroup('iam-security-incident-cloudtrail', {
    name: 'iam-security-incident'
})
