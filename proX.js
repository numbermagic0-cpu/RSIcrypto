// proX.js - RSI7 M15 (actualiza cada 60s + ordenar RSI con clic)

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

let allSymbols = [];
let sortDirection = 'desc'; // 'desc' = mayor a menor, 'asc' = menor a mayor

// Cargar símbolos una vez
async function loadAllSymbols() {
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '<tr><td colspan="2" class="loading">Cargando pares...</td></tr>';

    try {
        const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/price');
        if (!res.ok) throw new Error();
        const data = await res.json();
        allSymbols = data.map(x => x.symbol);

        tbody.innerHTML = '';
        for (const symbol of allSymbols) {
            const row = document.createElement('tr');
            row.id = `row-${symbol}`;
            row.innerHTML = `
                <td>${symbol}</td>
                <td class="rsi-value" style="background-color:transparent">—</td>
            `;
            tbody.appendChild(row);
        }

        // Activar ordenamiento al hacer clic en el encabezado RSI
        document.querySelector('#rsiHeader').style.cursor = 'pointer';
        document.querySelector('#rsiHeader').onclick = () => {
            sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
            sortTableByRSI();
        };

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2">Error cargando símbolos</td></tr>';
    }
}

// Ordenar tabla por RSI
function sortTableByRSI() {
    const rows = Array.from(document.querySelectorAll('#cryptoPairs tbody tr'));
    rows.sort((a, b) => {
        const rsiA = parseFloat(a.querySelector('.rsi-value').textContent) || 0;
        const rsiB = parseFloat(b.querySelector('.rsi-value').textContent) || 0;
        return sortDirection === 'desc' ? rsiB - rsiA : rsiA - rsiB;
    });

    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

// Actualizar solo valores RSI
async function updateRSIValues() {
    const rows = document.querySelectorAll('#cryptoPairs tbody tr');
    if (rows.length === 0 || allSymbols.length === 0) return;

    for (let i = 0; i < allSymbols.length; i += 10) {
        const batch = allSymbols.slice(i, i + 10);
        await Promise.all(batch.map(async (symbol) => {
            try {
                const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&limit=100`;
                const res = await fetch(url);
                if (!res.ok) return;
                const data = await res.json();
                if (data.length < 8) return;

                const rsi = calculateRSI(data);
                if (rsi === 100) return;

                const rsiCell = document.querySelector(`#row-${symbol} .rsi-value`);
                if (rsiCell) {
                    const rsiRounded = rsi.toFixed(2);
                    rsiCell.textContent = rsiRounded;
                    rsiCell.style.backgroundColor = 
                        rsi >= 80 ? '#27ae60' : 
                        rsi <= 20 ? '#e74c3c' : 
                        'transparent';
                }
            } catch (e) {}
        }));
        await new Promise(r => setTimeout(r, 50));
    }

    // Reordenar después de actualizar
    sortTableByRSI();
}

// Iniciar
loadAllSymbols().then(() => {
    updateRSIValues();
    setInterval(updateRSIValues, 60000); // cada 60s
});
