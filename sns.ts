import { sns } from '@pulumi/aws'
import { config } from './variables'

export const alertTopic = new sns.Topic('alert-topic', {
    displayName: 'alert-topic',
})

new sns.TopicSubscription('email-subscription', {
    endpoint: config.emailAddress,
    protocol: 'email',
    topic: alertTopic.arn,
})
