const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); 

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ===== CONFIG =====
const PAIRS = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'ADA',
  'AVAX',
  'DOGE',
  'LINK',
  'MATIC',
  'LTC',
  'TRX',
  'DOT',
  'ATOM',
  'BNB',
  'UNI'
];

const MIN_PROFIT = 0.3;

// ===== EXCHANGES =====
const exchanges = [
  {
    name: 'Binance',
    fee: 0.10,
    getPrice: async (pair) => {
      const r = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${pair}USDT`, { timeout: 5000 });
      return parseFloat(r.data.price);
    }
  },
  {
    name: 'Coinbase',
    fee: 0.50,
    getPrice: async (pair) => {
      const r = await axios.get(
        `https://api.coinbase.com/v2/prices/${pair}-USD/spot`, { timeout: 5000 });
      return parseFloat(r.data.data.amount);
    }
  },
  {
    name: 'Bybit',
    fee: 0.10,
    getPrice: async (pair) => {
      const r = await axios.get(
        `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pair}USDT`, { timeout: 5000 });
      return parseFloat(r.data.result.list[0].lastPrice);
    }
  },
  {
    name: 'KuCoin',
    fee: 0.10,
    getPrice: async (pair) => {
      const r = await axios.get(
        `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${pair}-USDT`, { timeout: 5000 });
      return parseFloat(r.data.data.price);
    }
  },
  {
    name: 'OKX',
    fee: 0.10,
    getPrice: async (pair) => {
      const r = await axios.get(
        `https://www.okx.com/api/v5/market/ticker?instId=${pair}-USDT`, { timeout: 5000 });
      return parseFloat(r.data.data[0].last);
    }
  },
  {
    name: 'Kraken',
    fee: 0.26,
    getPrice: async (pair) => {
      const map = {
  BTC: 'XXBTZUSD',
  ETH: 'XETHZUSD',
  SOL: 'SOLUSD',
  XRP: 'XXRPZUSD',
  ADA: 'ADAUSD',
  DOT: 'DOTUSD',
  ATOM: 'ATOMUSD',
  LTC: 'XLTCZUSD',
  DOGE: 'XDGUSD'
};

      if (!map[pair]) return null;

      const r = await axios.get(
        `https://api.kraken.com/0/public/Ticker?pair=${map[pair]}`, { timeout: 5000 });
      return parseFloat(
        r.data.result[Object.keys(r.data.result)[0]].c[0]
      );
    }
  }
];

// ===== FUNÇÃO DE PREÇOS =====
async function getPrices(pair) {
  const prices = [];

  for (const ex of exchanges) {
    try {
      const price = await ex.getPrice(pair);
      if (price) {
        prices.push({
          name: ex.name,
          price,
          fee: ex.fee
        });
      }
    } catch (e) {
      console.log(`Erro em ${ex.name}`);
    }
  }

  return prices;
}

// ===== ROTA =====
app.get('/arbitragem', async (req, res) => {
  try {
    const opportunities = [];

    for (const pair of PAIRS) {
      const prices = await getPrices(pair);
      if (prices.length < 2) continue;

      const min = prices.reduce((a,b)=>a.price<b.price?a:b);
      const max = prices.reduce((a,b)=>a.price>b.price?a:b);

      const diff = ((max.price - min.price) / min.price) * 100;
      const realProfit = diff - (min.fee + max.fee);

      if (realProfit >= MIN_PROFIT) {
        opportunities.push({
          pair,
          buy: min.name,
          sell: max.name,
          buyPrice: min.price,
          sellPrice: max.price,
          spread: diff,
          profit: realProfit
        });
      }
    }

    res.json(opportunities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no backend' });
  }
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});