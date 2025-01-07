document.addEventListener('DOMContentLoaded', () => {
    fetchRates();
    if (document.getElementById('updatePrices')) {
        document.getElementById('updatePrices').addEventListener('click', fetchPrices);
    }
});

// Assuming there's an investment form
document.getElementById('investmentForm').addEventListener('submit', function(event) {
    event.preventDefault();
    fetchRates();
});

// Placeholder for fetchPrices function, which wasn't provided
function fetchPrices() {
    console.log('Fetching prices...'); // TODO: Implement this function
}

async function fetchRates() {
    try {
        const [selicResponse, trResponse] = await Promise.all([
            fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
            fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados/ultimos/1?formato=json')
        ]);

        const selicData = await selicResponse.json();
        const trData = await trResponse.json();

        const selic = parseFloat(selicData[0].valor);
        const tr = parseFloat(trData[0].valor);

        document.getElementById('selicRate').textContent = `${selic.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
        document.getElementById('trRate').textContent = `${tr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
        document.getElementById('cdbRate').textContent = `${selic.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

        // Get user inputs with fallback to 0 or 1 if not numeric
        const initialInvestment = parseFloat(document.getElementById('initialAmount').value) || 0;
        const timeInMonths = parseInt(document.getElementById('timeInMonths').value) || 1;

        // Calculate savings (Poupança)
        let poupancaMonthlyRate;
        if (selic > 8.5) {
            poupancaMonthlyRate = 0.005;
        } else {
            poupancaMonthlyRate = (selic / 100 * 0.7) / 12;
        }
        const trMonthly = tr / 100 / 12;
        const poupancaFinalAmount = initialInvestment * Math.pow((1 + (poupancaMonthlyRate + trMonthly)), timeInMonths);

        // Calculate CDB
        const cdbRate = ((selic / 100) - 0.002) / 12;
        let cdbGrossAmount = initialInvestment * Math.pow((1 + cdbRate), timeInMonths);

        // IOF calculation
        let iofAmount = 0;
        if (timeInMonths < 1) { 
            const days = Math.floor(timeInMonths * 30); 
            if (days < 30) {
                const maxIOF = 0.96;
                const iofReductionPerDay = 0.032;
                const iofRate = Math.max(0, maxIOF - (days * iofReductionPerDay));
                iofAmount = (cdbGrossAmount - initialInvestment) * iofRate;
                cdbGrossAmount -= iofAmount;
            }
        }

        // Income Tax calculation
        let taxRate = 0.225; 
        if (timeInMonths > 6) taxRate = 0.20;
        if (timeInMonths > 12) taxRate = 0.175;
        if (timeInMonths > 24) taxRate = 0.15;
        const taxAmount = (cdbGrossAmount - initialInvestment) * taxRate;
        const cdbNetAmount = cdbGrossAmount - taxAmount;

        // Update results display
        document.getElementById('results').innerHTML = `
            <section class="financial-details">
                <div class="detail-item"><span>Taxa Selic:</span><p class="amount">${selic.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</p></div>
                <div class="detail-item"><span>Investimento inicial:</span><p class="amount">R$ ${initialInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                <div class="detail-item"><span>Valor final na poupança após ${timeInMonths} meses:</span><p class="amount">R$ ${poupancaFinalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                <div class="detail-item"><span>Valor bruto no CDB após ${timeInMonths} meses:</span><p class="amount">R$ ${cdbGrossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                <div class="detail-item"><span>Imposto de Renda descontado:</span><p class="amount">R$ ${taxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                <div class="detail-item"><span>IOF descontado:</span><p class="amount">R$ ${iofAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                <div class="detail-item"><span>Valor líquido no CDB após ${timeInMonths} meses (após IR e IOF):</span><p class="amount">R$ ${cdbNetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
            </section>
        `;
    } catch (error) {
        console.error('Erro ao buscar as taxas ou calcular investimentos:', error);
        document.getElementById('results').innerHTML = '<p>Erro ao buscar as taxas ou calcular investimentos. Por favor, tente novamente mais tarde.</p>';
    }
}