// proX.js - RSI7 en M15 (solo RSI, con thingproxy para Binance)

const API_URL = 'https://thingproxy.freeboard.io/fetch/' + 'https://fapi.binance.com/fapi/v1/ticker/price';

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
        // 1. Obtener símbolos
        const symbolsRes = await fetch(API_URL);
        if (!symbolsRes.ok) throw new Error('Error al cargar símbolos');
        const symbolsData = await symbolsRes.json();
        const symbolList = symbolsData.map(x => x.symbol).slice(0, 30); // Limitar a 30

        tbody.innerHTML = '';

        // 2. Procesar cada símbolo (con delay para no saturar)
        for (let i = 0; i < symbolList.length; i++) {
            const symbol = symbolList[i];
            const klinesUrl = `https://thingproxy.freeboard.io/fetch/https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=100`;
            
            try {
                const klinesRes = await fetch(klinesUrl);
                if (!klinesRes.ok) continue;
                const data = await klinesRes.json();
                if (!Array.isArray(data) || data.length < 8) continue;

                const rsi = calculateRSI(data).toFixed(2);
                const row = document.createElement('tr');
                row.innerHTML = `<td>${symbol}</td><td style="background-color: ${rsi >= 80 ? '#27ae60' : rsi <= 20 ? '#e74c3c' : 'transparent'}">${rsi}</td>`;
                tbody.appendChild(row);

                // Delay pequeño para no sobrecargar
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
                console.log(`Error con ${symbol}:`, e);
            }
        }

        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">Sin datos disponibles</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2">Error de conexión - Intenta recargar</td></tr>';
        console.error('Error general:', e);
    }
}

// Iniciar
updateTable();
setInterval(updateTable, 300000); // cada 5 min
