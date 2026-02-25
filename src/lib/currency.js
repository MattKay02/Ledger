const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

let rateCache = { rates: null, fetchedAt: null }

export const getExchangeRates = async () => {
  const now = Date.now()
  if (rateCache.rates && (now - rateCache.fetchedAt) < CACHE_DURATION_MS) {
    return rateCache.rates
  }
  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${import.meta.env.VITE_EXCHANGE_RATE_API_KEY}/latest/GBP`
  )
  const data = await res.json()
  if (data.result !== 'success') {
    throw new Error(`Exchange rate API error: ${data['error-type']}`)
  }
  rateCache = { rates: data.conversion_rates, fetchedAt: now }
  return rateCache.rates
}

export const convertToGBP = (amount, fromCurrency, rates) => {
  if (fromCurrency === 'GBP') return { amountGBP: amount, rate: 1 }
  const rate = rates[fromCurrency]
  if (!rate) throw new Error(`Unknown currency: ${fromCurrency}`)
  return {
    amountGBP: parseFloat((amount / rate).toFixed(2)),
    rate: parseFloat((1 / rate).toFixed(6)),
  }
}

export const COMMON_CURRENCIES = [
  'GBP', 'USD', 'ZAR', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK',
  'DKK', 'NZD', 'SGD', 'HKD', 'INR', 'BRL', 'MXN', 'AED', 'PLN', 'CZK',
]

export const CURRENCY_SYMBOLS = {
  GBP: '£', USD: '$', EUR: '€', CAD: '$', AUD: '$', JPY: '¥',
  CHF: 'Fr', SEK: 'kr', NOK: 'kr', DKK: 'kr', NZD: '$', SGD: '$',
  HKD: '$', INR: '₹', BRL: 'R$', MXN: '$', ZAR: 'R', AED: 'د.إ',
  PLN: 'zł', CZK: 'Kč',
}
