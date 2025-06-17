document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('credit-form');
    const resultContainer = document.getElementById('result');
    const backButton = document.getElementById('back-btn');
    const scoreValue = document.querySelector('.score-value');
    const scoreText = document.querySelector('.score-text');
    const resultMessage = document.querySelector('.result-message');
    const mortgageCalc = document.getElementById('mortgage-calc');
    
    // Automatically calculate mortgage values and update form fields
    function calculateAndUpdateFormFields() {
        // Read inputs from mortgage calculator
        const propertyPrice = Number(document.getElementById('property_price').value);
        const downPayment = Number(document.getElementById('down_payment').value);
        const years = Number(document.getElementById('mortgage_years').value);
        const annualRate = Number(document.getElementById('interest_rate').value);
        const monthlyIncomeVal = Number(document.getElementById('monthly_income_calc').value);

        // Calculate loan values
        const monthlyRate = annualRate / 12 / 100;
        const months = years * 12;
        const loanAmount = propertyPrice - downPayment;
        
        // Only calculate if values are valid
        if (propertyPrice > 0 && monthlyRate > 0 && months > 0) {
            const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months))
                / (Math.pow(1 + monthlyRate, months) - 1);
            const annuityRatioCalc = monthlyIncomeVal > 0 ? monthlyPayment / monthlyIncomeVal : 0;
            
            // Update form fields with calculator values
            document.getElementById('AMT_CREDIT').value = loanAmount;
            document.getElementById('AMT_CREDIT_display').textContent = Math.round(loanAmount).toLocaleString('ru-RU');
            
            document.getElementById('AMT_INCOME_TOTAL').value = monthlyIncomeVal;
            document.getElementById('AMT_INCOME_TOTAL_display').textContent = Math.round(monthlyIncomeVal).toLocaleString('ru-RU');
            
            document.getElementById('AMT_ANNUITY').value = Math.round(monthlyPayment);
            document.getElementById('AMT_ANNUITY_display').textContent = Math.round(monthlyPayment).toLocaleString('ru-RU');
            
            document.getElementById('LOAN_DURATION').value = months;
            document.getElementById('ANNUITY_INCOME_RATIO').value = annuityRatioCalc.toFixed(2);
            
            // Update mortgage result display
            document.getElementById('monthly_payment_display').textContent = Math.round(monthlyPayment).toLocaleString('ru-RU');
            const overpayment = monthlyPayment * months - loanAmount;
            document.getElementById('overpayment_display').textContent = Math.round(overpayment).toLocaleString('ru-RU');
            document.getElementById('annuity_ratio_display').textContent = annuityRatioCalc.toFixed(2);
            
            // Show mortgage calculation result
            document.getElementById('mortgage_result').classList.remove('hidden');
        }
    }
    
    // Add event listeners to calculator inputs to auto-update form
    const calcInputs = ['property_price', 'down_payment', 'mortgage_years', 'interest_rate', 'monthly_income_calc'];
    calcInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function() {
                calculateAndUpdateFormFields();
            });
        }
    });
    
    // Initial calculation on page load
    calculateAndUpdateFormFields();
    
    // Calculate button now just focuses on the form's submit button
    document.getElementById('calc_mortgage_btn').addEventListener('click', function() {
        calculateAndUpdateFormFields();
        // Optionally scroll to the form submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.scrollIntoView({behavior: 'smooth'});
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Ensure latest calculator values are used
        calculateAndUpdateFormFields();
        
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Обработка...';
        submitButton.disabled = true;
        
        // Get form data
        const formData = new FormData(form);
        
        // Send form data to server
        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.details || 'Ошибка сервера');
                });
            }
            return response.json();
        })
        .then(data => {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            
            const approvalChance = data.approval_chance;
            const creditScore = data.credit_score || 0;
            const recommendations = data.recommendations || "Нет рекомендаций";
            
            scoreValue.style.width = `${approvalChance}%`;
            scoreText.textContent = `${approvalChance}%`;
            
            // Build structured result HTML
            // Determine status message
            let imagePath = '';
            let statusMsg = '';
            if (approvalChance >= 80) {
                imagePath = '/static/img/like.png';
                statusMsg = 'Высокий шанс одобрения кредита!';
            } else if (approvalChance >= 50) {
                imagePath = '/static/img/neutral.png';
                statusMsg = 'Средний шанс одобрения кредита. Рекомендуем предоставить дополнительные гарантии.';
            } else {
                imagePath = '/static/img/dislike.png';
                statusMsg = 'Низкий шанс одобрения кредита. Рекомендуем пересмотреть условия.';
            }         

            // Fetch calculation results
            const monthlyPayment = document.getElementById('monthly_payment_display').textContent;
            const overpayment = document.getElementById('overpayment_display').textContent;
            const annuityRatio = document.getElementById('annuity_ratio_display').textContent;
            const ratioVal = parseFloat(document.getElementById('ANNUITY_INCOME_RATIO').value) || 0;
            let ratioRecText = '';
            if (ratioVal < 0.3) ratioRecText = 'Кредит безопасен: платежи составляют менее 30% от дохода.';
            else if (ratioVal < 0.4) ratioRecText = 'Кредит возможен, но нагрузка высокая. Рекомендуется снизить сумму кредита.';
            else ratioRecText = 'Кредит слишком обременителен: платежи превышают 40% от дохода. Рассмотрите меньший займ или увеличьте срок.';

            let resultHTML = `
                <div class="status-message-with-image vertical">
                    <span class="status-text">${statusMsg}</span>
                </div>
                <div class="result-details">
                    <h3>Основные показатели <span class="emoji">📊</span></h3>
                <ul>
                    <li>Кредитный скоринг: <strong>${creditScore}</strong> (300–1000)</li>
                    <li>Ежемесячный платёж: <strong>${monthlyPayment} ₸</strong></li>
                    <li>Переплата по кредиту: <strong>${overpayment} ₸</strong></li>
                    <li>Доля платежа к доходу: <strong>${annuityRatio}</strong></li>
                    <li>${ratioRecText}</li>
                </ul>
            </div>
            `;
            
            // Add mortgage recommendations
            if (recommendations && recommendations !== "⚠️ Нет подходящих ипотек") {
                resultHTML += `
                    <div class="mortgage-products">
                    <h3>Рекомендуемые ипотечные продукты <span class="emoji">🏠</span></h3>
                        <pre>${recommendations}</pre>
                    </div>`;
            }
            
            // Add ChatGPT recommendation
            if (data.gpt_recommendation) {
                resultHTML += `
                    <div class="chatgpt-recommendation">
                    <h3>Рекомендации от ИИ ассистента <span class="emoji">🤖</span></h3>
                        <p>${data.gpt_recommendation}</p>
                    </div>`;
            }
        
            resultMessage.innerHTML = resultHTML;
            
            // Hide both form and calculator when showing results
            form.classList.add('hidden');
            mortgageCalc.classList.add('hidden');
            resultContainer.classList.remove('hidden');
        })
        .catch(error => {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            
            console.error('Error:', error);
            alert('Произошла ошибка при обработке запроса: ' + error.message);
        });
    });
    
    backButton.addEventListener('click', function() {
        resultContainer.classList.add('hidden');
        form.classList.remove('hidden');
        mortgageCalc.classList.remove('hidden'); // Show calculator again when going back
    });
    
    const childrenInput = document.getElementById('CNT_CHILDREN');
    const familyInput = document.getElementById('CNT_FAM_MEMBERS');
    
    [childrenInput, familyInput].forEach(input => {
        input.addEventListener('input', function() {
            const children = parseInt(childrenInput.value) || 0;
            const family = parseInt(familyInput.value) || 0;
            
            if (children > 0 && family > 0 && children > family) {
                familyInput.setCustomValidity('Размер семьи должен быть больше или равен количеству детей');
            } else {
                familyInput.setCustomValidity('');
            }
        });
    });
    
    // Initialize slider displays
    document.querySelectorAll('.slider-group input[type="range"]').forEach(slider => {
        const display = document.getElementById(`${slider.id}_display`);
        if (display) {
            display.textContent = Number(slider.value).toLocaleString('ru-RU');
        }
        slider.addEventListener('input', () => {
            if (display) {
                display.textContent = Number(slider.value).toLocaleString('ru-RU');
            }
        });
    });

    // Mortgage calculator sliders initialization
    const mortgageSliders = ['property_price', 'down_payment', 'interest_rate', 'monthly_income_calc'];
    mortgageSliders.forEach(id => {
        const slider = document.getElementById(id);
        const display = document.getElementById(`${id}_display`);
        if (slider && display) {
            display.textContent = Number(slider.value).toLocaleString('ru-RU');
            slider.addEventListener('input', () => {
                display.textContent = Number(slider.value).toLocaleString('ru-RU');
            });
        }
    });
}); 