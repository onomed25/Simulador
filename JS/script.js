document.addEventListener('DOMContentLoaded', () => {
    fetchRates();
    fetchPrices();
});

const CONSTANTS = {
    POUPANCA_BASE_RATE: 0.005,
    SELIC_THRESHOLD: 8.5,
    CDB_RATE_ADJUSTMENT: 0.002,
    MAX_IOF: 0.96,
    IOF_REDUCTION_PER_DAY: 0.032,
    MONTHS_PER_YEAR: 12,
    DAYS_PER_MONTH: 30,
    TAX_RATES: {
        UP_TO_6_MONTHS: 0.225,
        UP_TO_12_MONTHS: 0.20,
        UP_TO_24_MONTHS: 0.175,
        ABOVE_24_MONTHS: 0.15
    }
};

// Funções utilitárias
const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercentage = (value) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

/**
 * Valida os valores de entrada do formulário
 * @param {number} initialAmount - Valor inicial do investimento
 * @param {number} timeInMonths - Tempo em meses
 */
function validateInputs(initialAmount, timeInMonths) {
    if (isNaN(initialAmount) || initialAmount <= 0) {
        throw new Error('O valor inicial deve ser um número positivo');
    }
    if (isNaN(timeInMonths) || timeInMonths < 0) {
        throw new Error('O tempo em meses deve ser um número não negativo');
    }
}

/**
 * Busca taxas financeiras da API do Banco Central
 * @returns {Promise<Object>} Objeto com taxas SELIC e TR
 */
async function fetchFinancialRates() {
    try {
        const [selicResponse, trResponse] = await Promise.all([
            fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
            fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados/ultimos/1?formato=json')
        ]);

        if (!selicResponse.ok || !trResponse.ok) {
            throw new Error('Falha na requisição das taxas');
        }

        const [selicData, trData] = await Promise.all([
            selicResponse.json(),
            trResponse.json()
        ]);

        return {
            selic: parseFloat(selicData[0].valor),
            tr: parseFloat(trData[0].valor)
        };
    } catch (error) {
        throw new Error(`Erro ao buscar taxas: ${error.message}`);
    }
}

/**
 * Calcula os rendimentos de investimentos
 * @param {number} initialInvestment - Valor inicial do investimento
 * @param {number} timeInMonths - Tempo em meses
 * @param {number} selic - Taxa Selic anual
 * @param {number} tr - Taxa Referencial anual
 * @returns {Object} Resultados dos cálculos
 */
function calculateInvestments(initialInvestment, timeInMonths, selic, tr) {
    // Cálculo da Poupança
    let poupancaMonthlyRate = selic > CONSTANTS.SELIC_THRESHOLD 
        ? CONSTANTS.POUPANCA_BASE_RATE 
        : (selic / 100 * 0.7) / CONSTANTS.MONTHS_PER_YEAR;
    
    const trMonthly = tr / 100 / CONSTANTS.MONTHS_PER_YEAR;
    const poupancaFinalAmount = initialInvestment * Math.pow((1 + (poupancaMonthlyRate + trMonthly)), timeInMonths);

    // Cálculo do CDB
    const cdbRate = ((selic / 100) - CONSTANTS.CDB_RATE_ADJUSTMENT) / CONSTANTS.MONTHS_PER_YEAR;
    let cdbGrossAmount = initialInvestment * Math.pow((1 + cdbRate), timeInMonths);

    // Cálculo do IOF
    let iofAmount = 0;
    if (timeInMonths < 1) {
        const days = timeInMonths * CONSTANTS.DAYS_PER_MONTH;
        if (days < CONSTANTS.DAYS_PER_MONTH) {
            const iofRate = Math.max(0, CONSTANTS.MAX_IOF - (days * CONSTANTS.IOF_REDUCTION_PER_DAY));
            iofAmount = (cdbGrossAmount - initialInvestment) * iofRate;
            cdbGrossAmount -= iofAmount;
        }
    }

    // Cálculo do Imposto de Renda
    let taxRate = CONSTANTS.TAX_RATES.UP_TO_6_MONTHS;
    if (timeInMonths > 24) taxRate = CONSTANTS.TAX_RATES.ABOVE_24_MONTHS;
    else if (timeInMonths > 12) taxRate = CONSTANTS.TAX_RATES.UP_TO_24_MONTHS;
    else if (timeInMonths > 6) taxRate = CONSTANTS.TAX_RATES.UP_TO_12_MONTHS;

    const taxAmount = (cdbGrossAmount - initialInvestment) * taxRate;
    const cdbNetAmount = cdbGrossAmount - taxAmount;

    return {
        poupancaFinalAmount,
        cdbGrossAmount,
        iofAmount,
        taxAmount,
        cdbNetAmount
    };
}

/**
 * Atualiza a exibição das taxas na interface
 * @param {Object} rates - Objeto contendo as taxas SELIC e TR
 */
function updateRatesDisplay(rates) {
    document.getElementById('selicRate').textContent = formatPercentage(rates.selic);
    document.getElementById('trRate').textContent = formatPercentage(rates.tr);
    document.getElementById('cdbRate').textContent = formatPercentage(rates.selic);
}

/**
 * Atualiza a exibição dos resultados na interface
 * @param {number} initialInvestment - Valor inicial
 * @param {number} timeInMonths - Tempo em meses
 * @param {Object} results - Resultados dos cálculos
 */
function updateResultsDisplay(initialInvestment, timeInMonths, results) {
    document.getElementById('results').innerHTML = `
        <section class="financial-details" role="region" aria-label="Resultados do investimento">
            <div class="detail-item" role="listitem">
                <span>Investimento inicial:</span>
                <p class="amount" aria-live="polite">${formatCurrency(initialInvestment)}</p>
            </div>
            <div class="detail-item" role="listitem">
                <span>Poupança após ${timeInMonths} meses:</span>
                <p class="amount" aria-live="polite">${formatCurrency(results.poupancaFinalAmount)}</p>
            </div>
            <div class="detail-item" role="listitem">
                <span>CDB após ${timeInMonths} meses:</span>
                <p class="amount" aria-live="polite">${formatCurrency(results.cdbGrossAmount)}</p>
            </div>
            <div class="detail-item" role="listitem">
                <span>Imposto de Renda descontado:</span>
                <p class="amount" aria-live="polite">${formatCurrency(results.taxAmount)}</p>
            </div>
            <div class="detail-item" role="listitem">
                <span>IOF descontado:</span>
                <p class="amount" aria-live="polite">${formatCurrency(results.iofAmount)}</p>
            </div>
            <div class="detail-item" role="listitem">
                <span>Valor líquido no CDB após ${timeInMonths} meses:</span>
                <p class="amount" aria-live="polite">${formatCurrency(results.cdbNetAmount)}</p>
            </div>
        </section>
    `;
}

/**
 * Exibe mensagem de erro na interface
 * @param {string} message - Mensagem de erro a ser exibida
 */
function displayError(message) {
    document.getElementById('results').innerHTML = `
        <p class="error" role="alert">${message}</p>
    `;
}

const debouncedFetchRates = debounce(async () => {
    try {
        const rates = await fetchFinancialRates();
        updateRatesDisplay(rates);

        const initialInvestment = parseFloat(document.getElementById('initialAmount').value);
        const timeInMonths = parseInt(document.getElementById('timeInMonths').value);

        validateInputs(initialInvestment, timeInMonths);

        const results = calculateInvestments(initialInvestment, timeInMonths, rates.selic, rates.tr);
        updateResultsDisplay(initialInvestment, timeInMonths, results);
    } catch (error) {
        displayError(`Erro ao processar cálculo: ${error.message}`);
    }
}, 300);

// Event Listeners
document.getElementById('investmentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    debouncedFetchRates();
});

document.getElementById('updatePrices').addEventListener('click', fetchPrices);

// Função fetchPrices mantida como placeholder
async function fetchPrices() {
    // Implementação pendente conforme o código original
}