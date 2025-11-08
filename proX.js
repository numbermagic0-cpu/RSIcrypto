// proX.js - RSI7 en M15 (SOLO RSI, sin tiempo, FUNCIONA EN GITHUB PAGES)

const API_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://fapi.binance.com/fapi/v1/ticker/price');

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
        // 1. Obtener todos los símbolos
        const symbolsRes = await fetch(API_URL);
        if (!symbolsRes.ok) throw new Error('No se pudo cargar símbolos');
        const symbols = await symbolsRes.json();
        const symbolList = symbols.map(x => x.symbol).slice(0, 40); // Limitar a 40

        tbody.innerHTML = '';

        // 2. Procesar cada símbolo
        for (const symbol of symbolList) {
            const klinesUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
                `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=100`
            )}`;
            try {
                const klinesRes = await fetch(klinesUrl, { timeout: 8000 });
                if (!klinesRes.ok) continue;
                const data = await klinesRes.json();
                if (!Array.isArray(data) || data.length < 8) continue;

                const rsi = calculateRSI(data).toFixed(2);
                const row = document.createElement('tr');
                row.innerHTML = `<td>${symbol}</td><td>${rsi}</td>`;
                tbody.appendChild(row);
            } catch (e) {
                // Ignorar errores por símbolo
            }
        }

        if (tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="2">No hay datos disponibles</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2">Error de conexión</td></tr>';
        console.error(e);
    }
}

// Iniciar
updateTable();
setInterval(updateTable, 300000); // cada 5 min
