class SystemEror extends Error {  
    constructor(data) {
        super("SystemError")
        this.type = "system"
        this.status = 500
        this.success = false
        this.data= data
    }
}

module.exports = SystemEror;