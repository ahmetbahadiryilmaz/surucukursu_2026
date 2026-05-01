 
const authenticate = async (request, reply) => {
  try {
    const authorization = request?.headers?.authorization
   
    // return request.sendResponse(request, reply, 400, {}, new Error('notHeaderAuthorization'))
    
    return true
  } catch (error) {
    console.log(error)
    request.sendResponse(request, reply, 401, {}, error)
  }
}

/**
 * 
 
 * @returns  {Promise<null|{id: number,mail: string,mebbisAccounts:Array }>}
 */
const getTokenInfo = async (knex, token) => {
  if(!token || token=='') return null
  const user = await knex('tb_user').select(["id", "mail"]).where('token', token).first()
  if (user) {
    const tb_mebbisses = await knex('tb_mebbis').select(["id"]).where('user_id', user.id)
    user.mebbisAccounts = tb_mebbisses 
  }
  return user
}

module.exports = {
  authenticate,
  getTokenInfo
}
