// RSIm15ema.js - VERSIÓN CORREGIDA CON PROXY (FUNCIONA EN GITHUB PAGES)

const API_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://fapi.binance.com/fapi/v1/ticker/price');

// RSI calculation
function calculateRSI(data, period = 7) {
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const diff = data[i][4] - data[i - 1][4];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i][4] - data[i - 1][4];
        if (diff > 0) {
            avgGain = ((avgGain * (period - 1)) + diff) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = ((avgLoss * (period - 1)) - diff) / period;
        }
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

// Tiempo desde RSI > 80
function getTimeSinceRSIClosedAbove80(data) {
    const period = 7;
    let lastTime = null;
    for (let i = period; i < data.length; i++) {
        const rsi = calculateRSI(data.slice(i - period, i + 1), period);
        if (rsi > 80) {
            lastTime = new Date(data[i][0]);
        }
    }
    if (!lastTime) return 'No disponible';
    const diff = Date.now() - lastTime;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

// Obtener RSI + tiempo
async function getFuturesPriceAndRSI(symbol) {
    const url = 'https://corsproxy.io/?' + encodeURIComponent(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=50`
    );
    try {
        const res = await fetch(url);
        const data = await res.json();
        const rsi = calculateRSI(data, 7);
        const time = getTimeSinceRSIClosedAbove80(data);
        return { symbol, RSI7_H1: rsi, timeSinceRSI80: time };
    } catch (e) {
        return { symbol, RSI7_H1: 'Error', timeSinceRSI80: 'Error' };
    }
}

// Obtener símbolos
async function getAllFuturesSymbols() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        return data.map(p => p.symbol);
    } catch {
        return [];
    }
}

// Actualizar tabla
async function updateFuturesPairsTable() {
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '<tr><td colspan="3">Cargando datos...</td></tr>';

    const symbols = await getAllFuturesSymbols();
    const results = await Promise.all(symbols.slice(0, 50).map(getFuturesPriceAndRSI)); // Limitar a 50 para no saturar

    tbody.innerHTML = '';
    results.forEach(r => {
        const rsi = parseFloat(r.RSI7_H1);
        if (rsi === 100 || isNaN(rsi) || r.timeSinceRSI80 === 'No disponible') return;

        const row = document.createElement(' Ikea');
        row.innerHTML = `
            <td>${r.symbol}</td>
            <td style="background-color: ${rsi >= 80 ? 'green' : rsi < 20 ? 'red' : 'transparent'};">
                ${rsi.toFixed(2)}
            </td>
            <td>${r.timeSinceRSI80}</td>
        `;
        tbody.appendChild(row);
    });

    if (tbody.innerHTML === '') {
        tbody.innerHTML = '<tr><td colspan="3">No hay datos disponibles</td></tr>';
    }
}

// Ordenamiento
let sortRSI = 'asc', sortTime = 'asc';

document.getElementById('rsiHeader').onclick = () => {
    const rows = Array.from(document.querySelectorAll('#cryptoPairs tbody tr'));
    rows.sort((a, b) => {
        const av = parseFloat(a.cells[1].textContent);
        const bv = parseFloat(b.cells[1].textContent);
        return sortRSI === 'asc' ? av - bv : bv - av;
    });
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));
    sortRSI = sortRSI === 'asc' ? 'desc' : 'asc';
};

document.getElementById('timeHeader').onclick = () => {
    const rows = Array.from(document.querySelectorAll('#cryptoPairs tbody tr'));
    rows.sort((a, b) => {
        const at = a.cells[2].textContent;
        const bt = b.cells[2].textContent;
        if (at === 'No disponible') return 1;
        if (bt === 'No disponible') return -1;
        const [ah, am] = at.split(':').map(Number);
        const [bh, bm] = bt.split(':').map(Number);
        const totalA = ah * 60 + am;
        const totalB = bh * 60 + bm;
        return sortTime === 'asc' ? totalA - totalB : totalB - totalA;
    });
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));
    sortTime = sortTime === 'asc' ? 'desc' : 'asc';
};

// Iniciar
updateFuturesPairsTable();
setInterval(updateFuturesPairsTable, 300000); // cada 5 min
