
document.addEventListener('DOMContentLoaded', () => {
    fetchRates();
    fetchPrices();
});

document.getElementById('investmentForm').addEventListener('submit', function(event) {
    event.preventDefault();
    fetchRates(); 
});

document.getElementById('updatePrices').addEventListener('click', fetchPrices);

async function fetchRates() {
    try {
        
        const selicResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
        const selicData = await selicResponse.json();
        const selic = parseFloat(selicData[0].valor);
        document.getElementById('selicRate').textContent = `${selic.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

     
        const trResponse = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados/ultimos/1?formato=json');
        const trData = await trResponse.json();
        const tr = parseFloat(trData[0].valor);
        document.getElementById('trRate').textContent = `${tr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

      
        document.getElementById('cdbRate').textContent = `${selic.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

        const initialInvestment = parseFloat(document.getElementById('initialAmount').value);
        const timeInMonths = parseInt(document.getElementById('timeInMonths').value);

        let poupancaMonthlyRate;
        if (selic > 8.5) {
            poupancaMonthlyRate = 0.005; 
        } else {
            poupancaMonthlyRate = (selic / 100 * 0.7) / 12; 
        }
        const trMonthly = tr / 100 / 12; 
        const poupancaFinalAmount = initialInvestment * Math.pow((1 + (poupancaMonthlyRate + trMonthly)), timeInMonths);

        
        const cdbRate = ((selic / 100) - 0.002) / 12; 
        let cdbGrossAmount = initialInvestment * Math.pow((1 + cdbRate), timeInMonths);

        
        let iofAmount = 0;
        if (timeInMonths < 1) { 
            const days = timeInMonths * 30; 
            if (days < 30) {
                const maxIOF = 0.96; 
                const iofReductionPerDay = 0.032; 
                const iofRate = Math.max(0, maxIOF - (days * iofReductionPerDay));
                iofAmount = (cdbGrossAmount - initialInvestment) * iofRate; 
                cdbGrossAmount -= iofAmount; 
            }
        }

       
        let taxRate = 0.225; 
        if (timeInMonths > 6) { 
            taxRate = 0.20; 
            if (timeInMonths > 12) {
                taxRate = 0.175; 
                if (timeInMonths > 24) {
                    taxRate = 0.15; 
                }
            }
        }
        const taxAmount = (cdbGrossAmount - initialInvestment) * taxRate;
        const cdbNetAmount = cdbGrossAmount - taxAmount;

        
        document.getElementById('results').innerHTML = `
            <section class="financial-details">
  
    <div class="detail-item">
        <span>Investimento inicial:</span>
        <p class="amount">R$ ${initialInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
    <div class="detail-item">
        <span>Poupança após ${timeInMonths} meses:</span>
        <p class="amount">R$ ${poupancaFinalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
    <div class="detail-item">
        <span>CDB após ${timeInMonths} meses:</span>
        <p class="amount">R$ ${cdbGrossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
    <div class="detail-item">
        <span>Imposto de Renda descontado:</span>
        <p class="amount">R$ ${taxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
    <div class="detail-item">
        <span>IOF descontado:</span>
        <p class="amount">R$ ${iofAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
    <div class="detail-item">
        <span>Valor líquido no CDB após ${timeInMonths} meses:</span>
        <p class="amount">R$ ${cdbNetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
</section>

        `;
    } catch (error) {
        document.getElementById('results').innerHTML = '<p>Erro ao buscar as taxas ou calcular investimentos: ' + error.message + '</p>';
    }
}

