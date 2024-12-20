document.addEventListener('DOMContentLoaded', function() {
    const incomeNav = document.getElementById('incomes-link');
    const dashboardNav = document.getElementById('dashboard-link');
    const dashboardContent = document.getElementById('dashboardContent');
    const incomeContent = document.getElementById('incomeContent');
    const expenseContent = document.getElementById('expenseContent');
    const totalIncomesElement = document.querySelector('#totalIncomes');
    const totalBalanceElement = document.querySelector('#totalBalance');

    if (incomeNav && dashboardContent && incomeContent) {
        incomeNav.addEventListener('click', (e) => {
            e.preventDefault();
            dashboardContent.style.display = 'none';
            incomeContent.style.display = 'block';
            expenseContent.style.display = 'none';
        });
    }

    if (dashboardNav && dashboardContent && incomeContent && expenseContent) {
        dashboardNav.addEventListener('click', (e) => {
            e.preventDefault();
            dashboardContent.style.display = 'block';
            incomeContent.style.display = 'none';
            expenseContent.style.display = 'none';
            initializeCharts(); // Reinitialize the charts
        });
    }

    // Handle form submission and update the list and total incomes
    const incomeForm = document.getElementById('incomeForm');
    const incomeList = document.getElementById('incomeList');

    // Fetch incomes from the database and update the list and total incomes
    function fetchIncomes() {
        fetch('/incomes/')
            .then(response => response.json())
            .then(data => {
                incomeList.innerHTML = '';
                let totalIncomeAmount = 0;

                data.forEach(income => {
                    const logoPath = categoryLogos[income.category] || categoryLogos['Other'];
                    const listItem = document.createElement('div');
                    listItem.classList.add('income-card');
                    listItem.innerHTML = `
                        <div class="income-logo">
                            <img src="${logoPath}" alt="${income.category}">
                        </div>
                        <div class="income-content">
                            <span class="income-title">${income.title}</span>
                            <div class="income-details">
                                <span>${income.amount}</span>
                                <span>${income.date}</span>
                                <span class="income-comment">${income.comment}</span>
                            </div>
                        </div>
                        <button class="delete-btn">&times;</button>
                    `;
                    incomeList.appendChild(listItem);
                    totalIncomeAmount += parseFloat(income.amount);

                    // Add event listener to the delete button
                    listItem.querySelector('.delete-btn').addEventListener('click', () => {
                        incomeList.removeChild(listItem);
                        totalIncomeAmount -= parseFloat(income.amount);
                        totalIncomesElement.textContent = totalIncomeAmount.toFixed(2);
                        updateTotalBalance();
                    });
                });

                totalIncomesElement.textContent = totalIncomeAmount.toFixed(2);
                updateCharts(data);
                updateTotalBalance();
            });
    }

    // Handle form submission and add income to the database
    if (incomeForm && incomeList && totalIncomesElement) {
        incomeForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('incomeTitle').value;
            const amount = parseFloat(document.getElementById('incomeAmount').value);
            const category = document.getElementById('incomeCategory').value;
            const date = document.getElementById('incomeDate').value;
            const comment = document.getElementById('incomeComment').value;

            fetch('/add_income/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, amount, category, date, comment }),
            })
            .then(response => response.json())
            .then(data => {
                // Update the total incomes instantly
                totalIncomesElement.textContent = (parseFloat(totalIncomesElement.textContent) + amount).toFixed(2);
                updateTotalBalance();

                // Add the new income to the list
                const logoPath = categoryLogos[category] || categoryLogos['Other'];
                const listItem = document.createElement('div');
                listItem.classList.add('income-card');
                listItem.innerHTML = `
                    <div class="income-logo">
                        <img src="${logoPath}" alt="${category}">
                    </div>
                    <div class="income-content">
                        <span class="income-title">${title}</span>
                        <div class="income-details">
                            <span>${amount}</span>
                            <span>${date}</span>
                            <span class="income-comment">${comment}</span>
                        </div>
                    </div>
                    <button class="delete-btn">&times;</button>
                `;
                incomeList.appendChild(listItem);

                // Add event listener to the delete button
                listItem.querySelector('.delete-btn').addEventListener('click', () => {
                    incomeList.removeChild(listItem);
                    totalIncomesElement.textContent = (parseFloat(totalIncomesElement.textContent) - amount).toFixed(2);
                    updateTotalBalance();
                });

                incomeForm.reset();
                fetchIncomes();
            });
        });
    }

    // Update charts with fetched data
    function updateCharts(incomes) {
        const incomeCategories = {};
        incomes.forEach(income => {
            if (!incomeCategories[income.category]) {
                incomeCategories[income.category] = 0;
            }
            incomeCategories[income.category] += parseFloat(income.amount);
        });

        const incomeChart = Chart.getChart('incomeChart');
        if (incomeChart) {
            incomeChart.data.labels = Object.keys(incomeCategories);
            incomeChart.data.datasets[0].data = Object.values(incomeCategories);
            incomeChart.update();
        }
    }

    // Function to update the total balance
    function updateTotalBalance() {
        const totalIncomes = parseFloat(totalIncomesElement.textContent) || 0;
        const totalExpenses = parseFloat(document.querySelector('#totalExpenses').textContent) || 0;
        const totalBalance = totalIncomes - totalExpenses;
        totalBalanceElement.textContent = totalBalance.toFixed(2);
    }

    fetchIncomes();
});
