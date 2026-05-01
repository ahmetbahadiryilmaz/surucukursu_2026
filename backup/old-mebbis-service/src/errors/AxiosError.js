class AxiosError extends Error {  
    constructor(data) {
        super("AxiosError")
        this.type = "axios"
        this.status = data.status??400
        this.success = false
        this.data = data
        this.request = data.request??data.config ?? null
        this.response = data.response ?? null
    }
}

module.exports = AxiosError;