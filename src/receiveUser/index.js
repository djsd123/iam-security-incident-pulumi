const AWS = require('aws-sdk')

console.log('Loading Function')
const stepFunctions = new AWS.StepFunctions()

exports.handler = async (event, context) => {

    let NextAction
    (event.requestContext.resourcePath === '/allow') ? NextAction = 'allow' : NextAction = 'delete'

    let taskToken = event.queryStringParameters.token
    taskTokenClean = taskToken.split(' ').join('+')

    console.log(event)

    let params = {
        output: JSON.stringify({ 'action': NextAction }),
        taskToken: taskTokenClean
    }

    try {
        const res = await stepFunctions.sendTaskSuccess(params).promise()
    } catch (err) {
        console.log(err)
    }

    return {
        statusCode: '200',
        body: JSON.stringify({ 'action': NextAction }),
        headers: {
            'Content-Type': 'application/json'
        }
    }
}
