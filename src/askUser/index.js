const AWS = require('aws-sdk')
let message = {}
let sns = new AWS.SNS()

exports.handler = async (event, context) => {

    let params = {
        TopicArn: process.env.TOPIC,
        Message: 'A restricted Policy change has been detected Approve: ' + process.env.APIAllowEndpoint + '?token=' + JSON.stringify(event.token) + ' \n\nOr Deny: ' + process.env.APIDenyEndpoint + '?token=' + JSON.stringify(event.token)
    }

    try {
        const res = await sns.publish(params).promise()
    } catch (err) {
        console.log(err)
    }

    return event
}
