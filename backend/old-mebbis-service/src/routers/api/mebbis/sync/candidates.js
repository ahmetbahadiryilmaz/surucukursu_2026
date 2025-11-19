const { axios, knex } = require("@src/lib");

const fs = require('fs');
const path = require('path');
const { candidatesList } = require("@src/services/mebbis/");


exports.schema = {
    body: {
        type: 'object',
        properties: {
            tbMebbisId: {
                type: 'number'
            }
        },
        required: ['tbMebbisId']
    }
}




exports.handler = async (req, reply) => {
    const { tbMebbisId } = req.body
    const cookieName = "mebbis" + tbMebbisId + ".txt"
    const r = await candidatesList(cookieName)
    if (r.success) {
        req.sendResponse(r.data)
    } else {
        req.sendError({
            data: {

            },
            error: {
                message: r.data
            },
            message: " candidate failed"
        })
    }


}