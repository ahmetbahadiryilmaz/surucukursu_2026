const Prelogin = require("@src/services/mebbis/prelogin")
exports.schema = {
    body: {
        type: 'object',
        properties: {
            username: {
                type: 'string'
            },
            password: {
                type: 'string'
            },
            tbMebbisId: {
                type: 'number'
            }
        },
        required: ['username', 'password']
    }
}
exports.handler = async (req, reply) => {
    const { username, password, tbMebbisId } = req.body
    const cookieName = "mebbis" + tbMebbisId + ".txt"
    const prelogin = new Prelogin("https://mebbisyd.meb.gov.tr/", cookieName)
    const trylogin = await prelogin.tryLogin(username, password)
    if (trylogin.success) {
        req.sendResponse("login success")
    } else {
        req.sendError({
            data: {},
            error: { message: trylogin.data },
            message: "login failed"
        })
    }
}