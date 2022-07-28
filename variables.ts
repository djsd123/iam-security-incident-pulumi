import * as pulumi from '@pulumi/pulumi'
import { config as awsConfig } from '@pulumi/aws'

export const region = awsConfig.requireRegion()

const stackConfig = new pulumi.Config('iam-security-incident')
export const config = {
    restrictedActions: stackConfig.require('restrictedActions'),
    emailAddress: stackConfig.require('emailAddress')
}
