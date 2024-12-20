document.addEventListener('DOMContentLoaded', function() {
    const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

    allSideMenu.forEach(item => {
        const li = item.parentElement;

        item.addEventListener('click', function() {
            allSideMenu.forEach(i => {
                i.parentElement.classList.remove('active');
            });
            li.classList.add('active');
        });
    });

    // TOGGLE SIDEBAR
    const menuBar = document.querySelector('#content nav .bx.bx-menu');
    const sidebar = document.getElementById('sidebar');

    if (menuBar && sidebar) {
        menuBar.addEventListener('click', function() {
            sidebar.classList.toggle('hide');
        });
    }

    const searchButton = document.querySelector('#content nav form .form-input button');
    const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
    const searchForm = document.querySelector('#content nav form');

    if (searchButton && searchButtonIcon && searchForm) {
        searchButton.addEventListener('click', function(e) {
            if (window.innerWidth < 576) {
                e.preventDefault();
                searchForm.classList.toggle('show');
                if (searchForm.classList.contains('show')) {
                    searchButtonIcon.classList.replace('bx-search', 'bx-x');
                } else {
                    searchButtonIcon.classList.replace('bx-x', 'bx-search');
                }
            }
        });

        if (window.innerWidth < 768) {
            sidebar.classList.add('hide');
        } else if (window.innerWidth > 576) {
            searchButtonIcon.classList.replace('bx-x', 'bx-search');
            searchForm.classList.remove('show');
        }

        window.addEventListener('resize', function() {
            if (this.innerWidth > 576) {
                searchButtonIcon.classList.replace('bx-x', 'bx-search');
                searchForm.classList.remove('show');
            }
        });
    }

    const switchMode = document.getElementById('switch-mode');

    if (switchMode) {
        switchMode.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        });
    }

    // Initialize the charts on page load
    initializeCharts();
});

let incomeChartInstance = null;
let expenseChartInstance = null;
let incomeExpensesChartInstance = null;

function initializeCharts() {
    fetch('/incomes/')
        .then(response => response.json())
        .then(data => {
            const incomeCategories = {};
            data.forEach(income => {
                if (!incomeCategories[income.category]) {
                    incomeCategories[income.category] = 0;
                }
                incomeCategories[income.category] += parseFloat(income.amount);
            });

            const incomeCtx = document.getElementById('incomeChart')?.getContext('2d');
            const expenseCtx = document.getElementById('expenseChart')?.getContext('2d');
            const incomeExpensesCtx = document.getElementById('incomeExpensesChart')?.getContext('2d');

            if (incomeCtx) {
                if (incomeChartInstance) {
                    incomeChartInstance.destroy();
                }
                incomeChartInstance = new Chart(incomeCtx, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(incomeCategories),
                        datasets: [{
                            label: 'Incomes by Category',
                            data: Object.values(incomeCategories),
                            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                align: 'center',
                            }
                        }
                    }
                });
            }

            if (expenseCtx) {
                fetch('/get_expense_categories/')
                    .then(response => response.json())
                    .then(expenseData => {
                        const expenseCategories = {};
                        expenseData.forEach(category => {
                            expenseCategories[category.name] = parseFloat(category.current_expense);
                        });

                        if (expenseChartInstance) {
                            expenseChartInstance.destroy();
                        }
                        expenseChartInstance = new Chart(expenseCtx, {
                            type: 'pie',
                            data: {
                                labels: Object.keys(expenseCategories),
                                datasets: [{
                                    label: 'Expenses by Category',
                                    data: Object.values(expenseCategories),
                                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'right', // Set legend on the right
                                        align: 'center',  // Align legend vertically
                                    }
                                }
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching expense categories:', error);
                    });

                // Toggle between the two charts and update title
                const toggleChartBtn = document.getElementById('toggleChartBtn');
                const incomeChartCanvas = document.getElementById('incomeChart');
                const expenseChartCanvas = document.getElementById('expenseChart');
                const chartTitle = document.getElementById('chartTitle');

                if (toggleChartBtn && incomeChartCanvas && expenseChartCanvas && chartTitle) {
                    toggleChartBtn.addEventListener('click', () => {
                        if (incomeChartCanvas.style.display === 'block') {
                            incomeChartCanvas.style.display = 'none';
                            expenseChartCanvas.style.display = 'block';
                            chartTitle.textContent = 'Expenses by Category';
                        } else {
                            incomeChartCanvas.style.display = 'block';
                            expenseChartCanvas.style.display = 'none';
                            chartTitle.textContent = 'Incomes by Category';
                        }
                    });
                }
            }

            if (incomeExpensesCtx) {
                fetch('/get_incomes_expenses_by_week/')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (incomeExpensesChartInstance) {
                            incomeExpensesChartInstance.destroy();
                        }
                        incomeExpensesChartInstance = new Chart(incomeExpensesCtx, {
                            type: 'line',
                            data: {
                                labels: data.labels, // Weekly labels
                                datasets: [
                                    {
                                        label: 'Income',
                                        data: data.incomes,
                                        borderColor: '#347928',
                                        backgroundColor: 'rgb(52, 121, 40, 0.2)',
                                        fill: true
                                    },
                                    {
                                        label: 'Expenses',
                                        data: data.expenses,
                                        borderColor: '#FCCD2A',
                                        backgroundColor: 'rgba(252, 205, 42, 0.2)',
                                        fill: true
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                scales: {
                                    x: {
                                        beginAtZero: true
                                    },
                                    y: {
                                        beginAtZero: true
                                    }
                                }
                            }
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching weekly income and expenses:', error);
                    });
            }
        });
}
