// RSIm15ema.js - CON FIX DE CORS
const API_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://fapi.binance.com/fapi/v1/ticker/price');

// Función para calcular el RSI usando el cierre
function calculateRSI(data, period = 7) {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const difference = data[i][4] - data[i - 1][4];
        if (difference > 0) {
            gains += difference;
        } else {
            losses -= difference;
        }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
        const difference = data[i][4] - data[i - 1][4];
        if (difference > 0) {
            averageGain = ((averageGain * (period - 1)) + difference) / period;
            averageLoss = (averageLoss * (period - 1)) / period;
        } else {
            averageGain = (averageGain * (period - 1)) / period;
            averageLoss = ((averageLoss * (period - 1)) - difference) / period;
        }
    }

    if (averageLoss === 0) {
        return 100;
    }

    const rs = averageGain / averageLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

function getTimeSinceRSIClosedAbove80(data) {
    const period = 7;
    let lastTimeRSIAbove80 = null;

    for (let i = period; i < data.length; i++) {
        const slice = data.slice(i - period, i + 1);
        const rsi = calculateRSI(slice, period);
        if (rsi > 80) {
            lastTimeRSIAbove80 = new Date(data[i][0]);
        }
    }

    if (!lastTimeRSIAbove80) {
        return 'No disponible';
    }

    const currentTime = new Date();
    const timeDifference = currentTime - lastTimeRSIAbove80;
    const minutes = Math.floor((timeDifference / 1000) / 60);
    const hours = Math.floor(minutes / 60);

    return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function getFuturesPriceAndRSI(symbol) {
    const historicalUrl = 'https://corsproxy.io/?' + encodeURIComponent(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=50`
    );

    const fetchRSI = (url) => {
        return fetch(url)
            .then(response => response.json())
            .then(data => {
                const rsi7 = calculateRSI(data, 7);
                const timeSinceRSI80 = getTimeSinceRSIClosedAbove80(data);
                return { symbol, RSI7_H1: rsi7, timeSinceRSI80 };
            })
            .catch(error => {
                console.error(`Error al obtener RSI para ${symbol}:`, error);
                return { symbol, RSI7_H1: 'No disponible', timeSinceRSI80: 'No disponible' };
            });
    };

    return fetchRSI(historicalUrl);
}

function getAllFuturesSymbols() {
    return fetch(API_URL)
        .then(response => response.json())
        .then(data => data.map(pair => pair.symbol))
        .catch(() => []);
}

function updateFuturesPairsTable() {
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '';

    getAllFuturesSymbols()
        .then(symbols => {
            Promise.all(symbols.map(getFuturesPriceAndRSI))
                .then(results => {
                    results.forEach(result => {
                        const rsiValue = parseFloat(result.RSI7_H1);
                        if (rsiValue === 100) return;
                        if (result.timeSinceRSI80 === 'No disponible') return;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${result.symbol}</td>
                            <td style="background-color: ${rsiValue >= 80 ? 'green' : rsiValue < 20 ? 'red' : 'transparent'};">${rsiValue.toFixed(2)}</td>
                            <td>${result.timeSinceRSI80}</td>
                        `;
                        tbody.appendChild(row);
                    });
                });
        });
}

// Ordenamiento
let sortOrderRSI = 'asc', sortOrderTime = 'asc';

document.getElementById('rsiHeader').addEventListener('click', () => {
    const rows = Array.from(document.querySelectorAll('#cryptoPairs tbody tr'));
    const sorted = rows.sort((a, b) => {
        const av = parseFloat(a.cells[1].textContent);
        const bv = parseFloat(b.cells[1].textContent);
        return sortOrderRSI === 'asc' ? av - bv : bv - av;
    });
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '';
    sorted.forEach(r => tbody.appendChild(r));
    sortOrderRSI = sortOrderRSI === 'asc' ? 'desc' : 'asc';
});

document.getElementById('timeHeader').addEventListener('click', () => {
    const rows = Array.from(document.querySelectorAll('#cryptoPairs tbody tr'));
    const sorted = rows.sort((a, b) => {
        const av = a.cells[2].textContent;
        const bv = b.cells[2].textContent;
        if (av === 'No disponible') return 1;
        if (bv === 'No disponible') return -1;
        const [ah, am] = av.split(':').map(Number);
        const [bh, bm] = bv.split(':').map(Number);
        const totalA = ah * 60 + am;
        const totalB = bh * 60 + bm;
        return sortOrderTime === 'asc' ? totalA - totalB : totalB - totalA;
    });
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '';
    sorted.forEach(r => tbody.appendChild(r));
    sortOrderTime = sortOrderTime === 'asc' ? 'desc' : 'asc';
});

// Auto-update
setInterval(updateFuturesPairsTable, 300000); // cada 5 min
updateFuturesPairsTable();