// proX.js - RSI7 en M15 (SIN PROXY, SIN ERROR, FUNCIONA EN GITHUB PAGES)

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
    tbody.innerHTML = '<tr><td colspan="2" class="loading">Cargando...</td></tr>';

    // Lista fija de símbolos populares (evitamos fetch a /ticker/price)
    const symbols = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
        'SOLUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT',
        'LINKUSDT', 'LTCUSDT', 'BCHUSDT', 'UNIUSDT', 'ATOMUSDT'
    ];

    tbody.innerHTML = '';

    for (const symbol of symbols) {
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=100`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const data = await res.json();
            if (data.length < 8) continue;

            const rsi = calculateRSI(data).toFixed(2);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${symbol}</td>
                <td style="background-color: ${rsi >= 80 ? '#27ae60' : rsi <= 20 ? '#e74c3c' : 'transparent'}">
                    ${rsi}
                </td>
            `;
            tbody.appendChild(row);

            // Pequeño delay para no saturar
            await new Promise(r => setTimeout(r, 80));
        } catch (e) {
            console.log(`Error con ${symbol}`);
        }
    }

    if (tbody.children.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2">Sin datos</td></tr>';
    }
}

// Iniciar
updateTable();
setInterval(updateTable, 300000); // 5 min
