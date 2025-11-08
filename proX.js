// proX.js - RSI7 M15 para TODOS los pares (SIN RSI 100)

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
    tbody.innerHTML = '<tr><td colspan="2" class="loading">Cargando todos los pares...</td></tr>';

    try {
        // 1. Obtener TODOS los símbolos
        const symbolsRes = await fetch('https://fapi.binance.com/fapi/v1/ticker/price');
        if (!symbolsRes.ok) throw new Error('No se pudo cargar símbolos');
        const symbolsData = await symbolsRes.json();
        const symbolList = symbolsData.map(x => x.symbol);

        tbody.innerHTML = '';

        // 2. Procesar cada símbolo
        for (let i = 0; i < symbolList.length; i++) {
            const symbol = symbolList[i];
            const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=100`;

            try {
                const res = await fetch(url);
                if (!res.ok) continue;
                const data = await res.json();
                if (data.length < 8) continue;

                const rsi = calculateRSI(data);
                const rsiRounded = rsi.toFixed(2);

                // FILTRAR: NO MOSTRAR RSI = 100
                if (rsi === 100) continue;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${symbol}</td>
                    <td style="background-color: ${rsi >= 80 ? '#27ae60' : rsi <= 20 ? '#e74c3c' : 'transparent'}">
                        ${rsiRounded}
                    </td>
                `;
                tbody.appendChild(row);

                // Pequeño delay cada 10 símbolos
                if (i % 10 === 0) await new Promise(r => setTimeout(r, 50));
            } catch (e) {
                console.log(`Error con ${symbol}`);
            }
        }

        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">No hay datos válidos (todos RSI 100)</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2">Error de conexión</td></tr>';
        console.error(e);
    }
}

// Iniciar
updateTable();
setInterval(updateTable, 600000); // cada 10 min
