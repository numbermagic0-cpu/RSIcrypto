// proX.js - FUNCIONA 100% EN GITHUB PAGES (con corsproxy.io)

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

function getTimeSinceRSI80(data) {
    let lastTime = null;
    for (let i = 7; i < data.length; i++) {
        const rsi = calculateRSI(data.slice(i - 7, i + 1));
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

async function updateTable() {
    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '<tr><td colspan="3" class="loading">Cargando símbolos...</td></tr>';

    try {
        const symbols = await fetch(API_URL)
            .then(r => r.json())
            .then(d => d.map(x => x.symbol));

        const results = [];

        // Limitamos a 30 para no saturar
        for (let i = 0; i < Math.min(30, symbols.length); i++) {
            const symbol = symbols[i];
            const url = 'https://corsproxy.io/?' + encodeURIComponent(
                `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1h&limit=100`
            );
            try {
                const data = await fetch(url).then(r => r.json());
                const rsi = calculateRSI(data);
                const time = getTimeSinceRSI80(data);

                if (rsi < 100 && time !== 'No disponible') {
                    results.push({
                        symbol,
                        rsi: rsi.toFixed(2),
                        time
                    });
                }
            } catch (e) {
                console.log(`Error con ${symbol}`);
            }
        }

        // Mostrar resultados
        tbody.innerHTML = '';
        if (results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No hay pares con RSI >80 reciente</td></tr>';
            return;
        }

        results.forEach(r => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${r.symbol}</td>
                <td style="background-color: ${r.rsi >= 80 ? '#27ae60' : 'transparent'}">
                    ${r.rsi}
                </td>
                <td>${r.time}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3">Error de conexión</td></tr>';
        console.error(e);
    }
}

// Ordenamiento
let sortDir = { rsi: 'asc', time: 'asc' };

document.getElementById('rsiHeader').onclick = () => sortTable(1, 'rsi');
document.getElementById('timeHeader').onclick = () => sortTable(2, 'time');

function sortTable(col, type) {
    const rows = Array.from(document.querySelectorAll('#cryptoPairs tbody tr'));
    const isAsc = sortDir[type] === 'asc';
    sortDir[type] = isAsc ? 'desc' : 'asc';

    rows.sort((a, b) => {
        let A = a.cells[col].textContent.trim();
        let B = b.cells[col].textContent.trim();

        if (type === 'rsi') {
            return (parseFloat(A) - parseFloat(B)) * (isAsc ? 1 : -1);
        } else {
            const [ah, am] = A.split(':').map(Number);
            const [bh, bm] = B.split(':').map(Number);
            const totalA = ah * 60 + am;
            const totalB = bh * 60 + bm;
            return (totalA - totalB) * (isAsc ? 1 : -1);
        }
    });

    const tbody = document.querySelector('#cryptoPairs tbody');
    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));

    // Actualizar indicador
    document.getElementById('rsiHeader').className = type === 'rsi' ? (isAsc ? 'sorted-desc' : 'sorted-asc') : '';
    document.getElementById('timeHeader').className = type === 'time' ? (isAsc ? 'sorted-desc' : 'sorted-asc') : '';
}

// Iniciar
updateTable();
setInterval(updateTable, 300000); // cada 5 minutos
