let restrictedActions = process.env.restrictedActions.split(',')
let message = ''
let action = ''

exports.handler = async (event, context) => {

    let policyObject = JSON.parse(event.policy)
    let policyActions = policyObject.Statement[0].Action
    console.log(policyActions)

    let found = 0
    for (i = 0; i < restrictedActions.length; i++) {
        if (policyActions.indexOf(restrictedActions[i]) >= 0) {
            found = 1
            break
        }
    }

    if (found) {
        message = `Policy was changed with restricted actions: ${restrictedActions}`
        action = 'remedy'
    } else {
        message = `Policy was changed to: ${event.policy}`
        action = 'alert'
    }

    return {
        'message': message,
        'action': action
    }
}
