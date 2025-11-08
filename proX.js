// URL de la API de Binance Futuros para obtener todos los precios
const API_URL = 'https://fapi.binance.com/fapi/v1/ticker/price';
const HISTORICAL_URL = 'https://fapi.binance.com/fapi/v1/klines?symbol=';

// Función para calcular el RSI
function calculateRSI(data, period = 7) {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const difference = data[i][4] - data[i - 1][4];
        if (difference > 0) {
            gains += difference;
        } else {
            losses -= difference; // Pérdidas son negativas
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
        return 100; // Evita división por cero, RSI sería 100 en este caso
    }

    const rs = averageGain / averageLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi.toFixed(2);
}

// Función para calcular la EMA
function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let emaArray = [];

    if (data.length < period) {
        console.error("No hay suficientes datos para calcular la EMA");
        return NaN;
    }

    emaArray.push(parseFloat(data[0][4]));

    for (let i = 1; i < data.length; i++) {
        const closePrice = parseFloat(data[i][4]);
        const emaPrev = emaArray[i - 1];
        const emaCurrent = (closePrice - emaPrev) * k + emaPrev;
        emaArray.push(emaCurrent);
    }

    return emaArray[emaArray.length - 1];
}

// Función para obtener el RSI7 (1h) para futuros
function getFuturesPriceAndRSI(symbol) {
    const historicalUrl = `${HISTORICAL_URL}${symbol}&interval=15m&limit=60`;

    const fetchRSI = (url) => {
        return fetch(url)
            .then(response => response.json())
            .then(data => calculateRSI(data, 7))
            .catch(error => {
                console.error(`Error al obtener RSI para ${symbol}:`, error);
                return 'No disponible';
            });
    };

    return fetchRSI(historicalUrl)
        .then(rsi1h => {
            return { symbol, RSI7_1h: rsi1h };
        })
        .catch(error => {
            console.error(`Error al obtener los datos para ${symbol}:`, error);
            return { symbol, RSI7_1h: 'No disponible' };
        });
}

// Función para obtener datos históricos y calcular la EMA200 (m15)
function getEMA200M15(symbol) {
    const url = `${HISTORICAL_URL}${symbol}&interval=15m&limit=200`;

    return fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                return calculateEMA(data, 200);
            } else {
                console.error(`No se encontraron datos históricos para ${symbol}`);
                return NaN;
            }
        })
        .catch(error => {
            console.error(`Error al obtener EMA200 para ${symbol}:`, error);
            return NaN;
        });
}

// Función para obtener todos los pares de futuros y sus precios
function getAllFuturesSymbols() {
    return fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            return data.map(pair => ({ symbol: pair.symbol, price: parseFloat(pair.price) }));
        })
        .catch(error => {
            console.error('Error al obtener los símbolos de futuros:', error);
            return [];
        });
}

// Función para actualizar la tabla con los pares de futuros
function updateFuturesPairsTable() {
    const futuresPairsTable = document.getElementById('cryptoPairs').getElementsByTagName('tbody')[0];
    futuresPairsTable.innerHTML = ''; // Limpiar contenido anterior

    getAllFuturesSymbols()
        .then(futuresPairs => {
            Promise.all(futuresPairs.map(pair => {
                return Promise.all([
                    getFuturesPriceAndRSI(pair.symbol),
                    getEMA200M15(pair.symbol)
                ]).then(([rsiData, ema200]) => ({
                    symbol: pair.symbol,
                    RSI7_1h: rsiData.RSI7_1h,
                    ema200: ema200,
                    price: pair.price
                }));
            }))
            .then(results => {
                results.forEach(result => {
                    // Mostrar solo los RSI mayores a 70 o menores a 30, excluyendo los que sean 100 y USDCUSDT
                    if ((result.RSI7_1h > 10 || result.RSI7_1h < 10) && 
                        result.RSI7_1h != 100 &&
                        result.symbol !== 'USDCUSDT' &&
                        !isNaN(result.ema200) && 
                        !isNaN(result.price)) {
                        const percentageDifferenceEMA200 = ((result.price - result.ema200) / result.ema200) * 100;
                        const emaColor = percentageDifferenceEMA200 >= 0 ? 'green' : 'orange';
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><a href="https://www.tradingview.com/chart/?symbol=BINANCE:${result.symbol}.P" target="tradingview">${result.symbol}</a></td>
                            <td style="background-color: ${result.RSI7_1h >= 70 ? 'green' : '#FF9999'};">${result.RSI7_1h}</td>
                            <td style="background-color: ${emaColor};">${percentageDifferenceEMA200.toFixed(2)}%</td>
                        `;
                        futuresPairsTable.appendChild(row);
                    }
                });
                // Ordenar por defecto por EMA200 (descendente)
                sortTableByEMA200('desc');
            });
        });
}

// Función para ordenar la tabla por RSI7 (1h)
let sortOrderRSI = 'asc'; // Orden inicial: ascendente

function sortTableByRSI() {
    const table = document.getElementById('cryptoPairs');
    const rows = Array.from(table.getElementsByTagName('tr')).slice(1);
    const sortedRows = rows.sort((a, b) => {
        const aValue = parseFloat(a.cells[1].textContent);
        const bValue = parseFloat(b.cells[1].textContent);
        return sortOrderRSI === 'asc' ? aValue - bValue : bValue - aValue;
    });

    const tbody = table.getElementsByTagName('tbody')[0];
    tbody.innerHTML = ''; // Limpiar contenido anterior

    sortedRows.forEach(row => tbody.appendChild(row));

    // Cambiar el orden de clasificación para el próximo clic
    sortOrderRSI = sortOrderRSI === 'asc' ? 'desc' : 'asc';
    document.getElementById('rsiHeader').className = sortOrderRSI === 'asc' ? 'sorted-asc' : 'sorted-desc';
}

// Función para ordenar la tabla por EMA200 (m15)
let sortOrderEMA200 = 'desc'; // Orden inicial descendente

function sortTableByEMA200(initialSortOrder = null) {
    const table = document.getElementById('cryptoPairs');
    const rows = Array.from(table.getElementsByTagName('tr')).slice(1);

    const currentSortOrder = initialSortOrder ? initialSortOrder : sortOrderEMA200;

    const sortedRows = rows.sort((a, b) => {
        const aValue = parseFloat(a.cells[2].textContent.replace('%', ''));
        const bValue = parseFloat(b.cells[2].textContent.replace('%', ''));
        return currentSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    const tbody = table.getElementsByTagName('tbody')[0];
    tbody.innerHTML = ''; // Limpiar contenido anterior

    sortedRows.forEach(row => tbody.appendChild(row));

    sortOrderEMA200 = sortOrderEMA200 === 'asc' ? 'desc' : 'asc';
    document.getElementById('emaHeader200').className = sortOrderEMA200 === 'asc' ? 'sorted-asc' : 'sorted-desc';
}

// Llamar a updateFuturesPairsTable() cada 300 segundos (5 minutos)
setInterval(updateFuturesPairsTable, 3000000);

// Llamar a updateFuturesPairsTable() una vez para mostrar los datos iniciales
updateFuturesPairsTable();

// Agregar eventos de clic para ordenar por RSI7 (1h) y EMA200 (m15)
document.getElementById('rsiHeader').addEventListener('click', sortTableByRSI);
document.getElementById('emaHeader200').addEventListener('click', () => sortTableByEMA200());
