Financial-Scraper
=================
Gathers financial data and saves it to postgres.   

Currently gathers total domestic liabilities, total stock market cap, and historical sp500 data.   

Using Node.js 4.2+, Postgres, and Knex.   

### Usage:

```
git clone https://github.com/effinggames/financial-scraper.git && cd financial-scraper
npm install
(setup env variables)
npm start
```

Env variables:   
`DATABASE_URL`: Postgres connection string (required)   
`QUANDL_API_KEY`: Optional quandl api key if you run into rate limits.    

Postgres tables will be setup automatically by:   
`knex migrate:latest`   
