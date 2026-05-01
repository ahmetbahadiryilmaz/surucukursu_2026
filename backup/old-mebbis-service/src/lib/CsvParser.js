const { parse } = require('csv-parse')

class CsvParser{

    constructor() {
        this.csvData = []
    }
    parseCsv(string) {
        parse(string, {}, (err, output) => {
            if (err) {
                console.log(err)
            } else {
                this.csvData = output
            }
        })
    }

}