

exports.schema = {

}




exports.handler = async (req, reply) => {
    const { tbMebbisId } = req.body
    req.io.to("mebbis" + tbMebbisId).emit("message", "test")
    req.sendResponse(tbMebbisId)


}