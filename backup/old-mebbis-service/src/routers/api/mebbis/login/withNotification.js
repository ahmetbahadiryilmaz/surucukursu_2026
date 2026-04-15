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
        required: ['username', 'password','tbMebbisId']
    }
}

async function callback(tbMebbisId, cookieName, t, hidingID,req) {
    console.log('Can login:', t, hidingID)
    const r = await isLoggedIn(cookieName)
    console.log('isLoggedIn', r)
    const cookiepath = path.join(__dirname, "/../../../../../storage/cookies/", cookieName)
    convertToNetscapeCookie(cookiepath)
    /*const savePath=path.join(__dirname,"/../../../../../storage/pages/",cookieName+".html")
    console.log('savePath', savePath)
    savePage(savePath, r.data)*/
    if (r.success) {
        const cookieString = fs.readFileSync(cookiepath, 'utf8')
        await knex("tb_mebbis").update({
            "lastLogin": new Date()/1000,
            "mebbislogin": true,
            "cookie": cookieString,
        }).where("id", tbMebbisId)
        
        req.io.to("mebbis" + tbMebbisId).emit("notiflogin", "success")
    }
}


exports.handler = async (req, reply) => {
    console.log("withNotification")
    const { username, password,tbMebbisId} = req.body
    const cookieName = "mebbis" + tbMebbisId + ".txt"
    const prelogin = new Prelogin("https://mebbisyd.meb.gov.tr/", cookieName)
    try {
        const trylogin = await prelogin.login(username, password,   async (t, hidingID)=> {
         
            return await callback(tbMebbisId,cookieName,t,hidingID,req)
        })
        


        if (trylogin.success) {
            req.sendResponse({
                message: "login success",
                data: {
                    tbMebbisId: tbMebbisId,
                    inputs:trylogin.data.inputs
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