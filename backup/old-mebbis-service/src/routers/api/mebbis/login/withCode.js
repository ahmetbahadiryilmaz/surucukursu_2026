const { axios,knex } = require("@src/lib");
const convertToNetscapeCookie = require("@src/lib/ConvertToNetscapeCookie");
  
const { prelogin: Prelogin, isLoggedIn } = require("@src/services/mebbis/"); 
const fs = require('fs');
const path = require('path')

async  function  savePage (pagePath,html) {
    try {
      fs.writeFileSync(pagePath, html)
    } catch (error) {
      console.error('Error saving the page:', error)
    }
  }
  


 exports.schema = {
    body: {
        type: 'object',
        properties: {
 
            tbMebbisId: {
                type: 'number'
            },
             
            code: {
                type: 'string'
            }
        },
        required: [ 'code', 'tbMebbisId']
    }
}

async function  logginn(tbMebbisId, cookieName,  req) {
    
    console.log('Can login:', t, hidingID)
    const r = await isLoggedIn(cookieName)
    console.log('isLoggedIn', r)
    const cookiepath = path.join(__dirname, "/../../../../../storage/cookies/", cookieName)
    convertToNetscapeCookie(cookiepath)
    /*const savePath=path.join(__dirname,"/../../../../../storage/pages/",cookieName+".html")
    console.log('savePath', savePath)
    savePage(savePath, r.data)*/
    if (r.success) {
        await knex("tb_mebbis").update({ "mebbislogin": true }).where("id", tbMebbisId)
        req.io.to("mebbis" + tbMebbisId).emit("notiflogin", "success")
    }
}


exports.handler = async (req, reply) => {
    console.log("withCode")
    console.log("Request body:", req.body) // Log incoming request body for debugging
    const { code,tbMebbisId} = req.body
    const cookieName = "mebbis" + tbMebbisId + ".txt"
    const cookiepath = path.join(__dirname, "/../../../../../storage/cookies/", cookieName)
    
    const prelogin = new Prelogin("https://mebbisyd.meb.gov.tr/", cookieName)
    try {
        const trylogin = await prelogin.loginWithCode(code)
        if (trylogin.success) {
            const cookieString = fs.readFileSync(cookiepath, 'utf8')
            await knex("tb_mebbis").update({
                "lastLogin": new Date()/1000,
                "mebbislogin": true,
                "cookie": cookieString,
            }).where("id", tbMebbisId)
            
            req.io.to("mebbis" + tbMebbisId).emit("notiflogin", "success")
            
            req.sendResponse({
                "success": true,
                "message": "login success",
                data: {
                    tbMebbisId: tbMebbisId
                }
            })
            

        } else {
            req.sendError({
                data: {
                    
                },
                error: {
                    message: trylogin.data
                },
                message: "login failedwith notif"
            })
        }
    } catch (e) {
        req.sendError({
            data: {
                
            },
            error: {
                message: e.message
            },
            message: "login failed2"
        })
    }

   
    
}