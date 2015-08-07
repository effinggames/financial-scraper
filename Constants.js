'use strict';
const Assert = require('assert');

class Constants {
    constructor() {
        this.PostgresConnectionString = process.env.PG_CONN_STR;
        Assert(process.env.PG_CONN_STR, 'ENV variable: PG_CONN_STR is not set!');
    }
}

module.exports = new Constants();
