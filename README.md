Financial-Scraper
=================
Gathers financial data and saves it to postgres.

Currently gathers total domestic liabilities, total stock market cap, and historical sp500 data.

Using Node.js 4.2+, Postgres, and Knex.

### Usage:

```
git clone https://github.com/robgraeber/financial-scraper.git && cd financial-scraper
npm install
(setup env variables)
npm start
```

Env variables:  
`DATABASE_URL`: Postgres connection string (required)

Postgres tables that will be setup automatically by:
`knex migrate:latest`
