Financial-Scraper
=================
Gathers financial data and saves it to postgres.

Currently gathers total domestic liabilities, total stock market cap, and historical sp500 data.

Using io.js 2.4+, Postgres, and db-migrate.

### Usage:

```
git clone https://github.com/robgraeber/financial-scraper.git && cd financial-scraper
npm install
(setup env variables)
npm start
```

Env variables:  
`DATABASE_URL`: Postgres connection string (required)

Postgres tables that will be setup automatically:   
```
corporate_liabilites
  date DATE
  value NUMERIC(10,2)
local_gov_liabilites
  date DATE
  value NUMERIC(10,2)
federal_gov_liabilites
  date DATE
  value NUMERIC(10,2)
household_liabilites
  date DATE
  value NUMERIC(10,2)
world_liabilites
  date DATE
  value NUMERIC(10,2)
nonfinancial_market_cap
  date DATE
  value NUMERIC(10,3)
financial_market_cap
  date DATE
  value NUMERIC(10,3)
sp_500_monthly
  date DATE
  close NUMERIC(10,2)
  dividend NUMERIC(15,12)
  ...cpi, earnings, gs10, pe10, adjusted_close
```

Postgres views that are setup automatically: 
```
total_liabilities
  date DATE
  value NUMERIC(10,2)
total_market_cap
  date DATE
  value NUMERIC(10,3)
```
