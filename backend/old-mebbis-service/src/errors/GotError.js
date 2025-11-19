class GotError extends Error {  
    constructor(data) {
        super("GotError")
        this.type = "Got"
        this.status = data.status??400
        this.success = false
        this.data = data
        this.request = data.request??data.config ?? null
        this.response = data.response ?? null
    }
}

module.exports = GotError;