const AWS = require('aws-sdk')
let message = {}
let sns = new AWS.SNS()

exports.handler = async (event, context) => {

    let allow = `${process.env.APIAllowEndpoint + '?token=' + JSON.stringify(event.token)}`
    let deny = `${process.env.APIDenyEndpoint + '?token=' + JSON.stringify(event.token)}`

    let params = {
        TopicArn: process.env.TOPIC,
        Message: 'A restricted Policy change has been detected \n\nApprove: ' + allow + ' \n\nOr Deny: ' + deny
    }

    try {
        const res = await sns.publish(params).promise()
    } catch (err) {
        console.log(err)
    }

    return event
}
