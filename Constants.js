const Assert = require('assert');

const getEnvVariable = function(name) {
  const value = process.env[name];
  Assert(value, `ENV variable: ${name} is not set!`);
  return value;
};

const getEnvVariableOptional = function(name) {
  return process.env[name];
};

class Constants {
  constructor() {
    //Mandatory env variables
    this.PostgresConnectionString = getEnvVariable('DATABASE_URL');
    //Optional env variables
    this.QuandlApiKey = getEnvVariableOptional('QUANDL_API_KEY');
  }
}

module.exports = new Constants();
