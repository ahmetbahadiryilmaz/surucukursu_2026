const { axios } = require('../lib')
const domain = "https://mtsk.online"
const run = async () => {
     const result = await axios.get(domain  + "/cron/cronPercentIsle" ,{
      cookieName:"cronPercentIsle"
    })
     return result.data
}
run().then(() => {
  console.log("done sira getir")
}).catch(e => {
    console.log("error sira getir", e)
})
    