// proX.js - SOLO RSI7 en M15 (sin tiempo, sin filtros, sin ordenar)

const API_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://fapi.binance.com/fapi/v1/ticker/price');

function calculateRSI(data, period = 7) {
    if (data.length < period + 1) return 0;
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
        avgGain = ((avgGain * (period - 1)) + (diff > 0 ? diff : 0)) / period;
        avgLoss = ((avgLoss * (period - 1)) + (diff < 0 ? -diff : 0)) / period;
    }
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

async function updateTable() {
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '<tr><td colspan="2" class="loading">Cargando símbolos...</td></tr>';

    try {
        const symbols = await fetch(API_URL)
            .then(r => r.json())
            .then(d => d.map(x => x.symbol));

        tbody.innerHTML = '';

        for (let i = 0; i < Math.min(50, symbols.length); i++) {
            const symbol = symbols[i];
            const url = 'https://corsproxy.io/?' + encodeURIComponent(
                `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=100`
            );
            try {
                const data = await fetch(url).then(r => r.json());
                const rsi = calculateRSI(data).toFixed(2);
                const row = document.createElement('tr');
                row.innerHTML = `<td>${symbol}</td><td>${rsi}</td>`;
                tbody.appendChild(row);
            } catch (e) {
                // Silenciar errores individuales
            }
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2">Error de conexión</td></tr>';
    }
}

// Iniciar
updateTable();
setInterval(updateTable, 300000); // cada 5 minutos
