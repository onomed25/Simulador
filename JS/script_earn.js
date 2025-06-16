const apiUrls = {
    usdc: 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl',
    btc: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
};

function calculateReturn() {
    const real = parseFloat(document.getElementById('real').value);
    const earn = parseFloat(document.getElementById('earn').value);
    const years = parseFloat(document.getElementById('years').value);

    if (isNaN(real) || isNaN(earn) || isNaN(years) || real <= 0 || earn <= 0 || years <= 0) {
        document.getElementById('results').innerHTML = "<p class='error'>Por favor, preencha todos os campos com valores válidos maiores que zero.</p>";
        return;
    }

    fetch(apiUrls.usdc)
        .then(response => response.json())
        .then(data => {
            const usdcToBrl = data['usd-coin'].brl;

            const initialUsdc = real / usdcToBrl; 
            const annualRate = earn / 100;

            // Cálculo de juros compostos: A = P(1 + r)^t
            const finalUsdc = initialUsdc * Math.pow((1 + annualRate), years);
            const interestUsdc = finalUsdc - initialUsdc;

            const finalBrl = finalUsdc * usdcToBrl; 
            const interestBrl = interestUsdc * usdcToBrl;

            document.getElementById('investedAmount').textContent = `${real.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            document.getElementById('earnDollars').textContent = `${interestUsdc.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
            document.getElementById('earnReais').textContent = `${interestBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            document.getElementById('finalAmountDollars').textContent = `${finalUsdc.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
            document.getElementById('finalAmountReais').textContent = `${finalBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
            
            document.getElementById('results').innerHTML = "<p class='success'>Cálculo realizado com sucesso!</p>";
        })
        .catch(error => {
            document.getElementById('results').innerHTML = "<p class='error'>Erro ao obter a taxa de câmbio atual. Tente novamente mais tarde.</p>";
            console.error('Error:', error);
        });
}

function fetchAndDisplayRates() {
    // USDC/BRL
    fetch(apiUrls.usdc)
        .then(response => response.json())
        .then(data => {
            const usdcToBrl = data['usd-coin'].brl;
            document.getElementById('usd-coin').textContent = usdcToBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        })
        .catch(error => {
            document.getElementById('usd-coin').textContent = "Erro ao carregar";
            console.error('Error:', error);
        });

    // BTC/USD
    fetch(apiUrls.btc)
        .then(response => response.json())
        .then(data => {
            const btcToUsd = data.bitcoin.usd;
            document.getElementById('btc-usd').textContent = btcToUsd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        })
        .catch(error => {
            document.getElementById('btc-usd').textContent = "Erro ao carregar";
            console.error('Error:', error);
        });
}

window.onload = fetchAndDisplayRates;