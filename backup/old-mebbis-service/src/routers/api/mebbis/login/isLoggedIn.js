const { axios,knex } = require("@src/lib");
const convertToNetscapeCookie = require("@src/lib/ConvertToNetscapeCookie");
 
const {  isLoggedIn } = require("@src/services/mebbis/"); 
const fs = require('fs');
const path = require('path')

 


 exports.schema = {
    body: {
        type: 'object',
        properties: {
 
            tbMebbisId: {
                type: 'number'
            }
        },
        required: [ 'tbMebbisId']
    }
}

  


exports.handler = async (req, reply) => {
    const { tbMebbisId} = req.body
    const cookieName = "mebbis" + tbMebbisId + ".txt"
         req.io.to("mebbis"+tbMebbisId).emit("message", "isLoggedIn")
        const r = await isLoggedIn(cookieName)

        if (r.success) {
            req.sendResponse("login success with " + r.data)
            const loadpath = path.join(__dirname, "/../../../../../storage/cookies/", cookieName)

      
            convertToNetscapeCookie(loadpath)
            console.log("converted to netscape cookie", loadpath)
            const cookieString = fs.readFileSync(loadpath, 'utf8')
            await knex("tb_mebbis").update({
                "lastLogin": new Date()/1000,
                "mebbislogin": true,
                "cookie": cookieString,
            }).where("id", tbMebbisId)
        } else {
            await knex("tb_mebbis").update({
                "mebbislogin": false       
            }).where("id", tbMebbisId)
            req.sendError({
                data: {
                    
                },
                error: {
                    message: r.data
                },
                message: "login failed1"
            })
        }
 
    
}