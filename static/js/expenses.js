document.addEventListener('DOMContentLoaded', function() {
    const expenseNav = document.getElementById('expenses-link');
    const dashboardNav = document.getElementById('dashboard-link');
    const dashboardContent = document.getElementById('dashboardContent');
    const incomeContent = document.getElementById('incomeContent');
    const expenseContent = document.getElementById('expenseContent');
    const totalExpensesElement = document.querySelector('#totalExpenses');
    const totalBalanceElement = document.querySelector('#totalBalance');

    if (expenseNav && dashboardContent && expenseContent) {
        expenseNav.addEventListener('click', (e) => {
            e.preventDefault();
            dashboardContent.style.display = 'none';
            incomeContent.style.display = 'none';
            expenseContent.style.display = 'block';
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

    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        const modal = document.getElementById('addCategoryModal');
        modal.style.display = 'block';
        setTimeout(() => {
            modal.style.left = 'calc(100% - 850px)'; // Adjust based on the width of the modal
        }, 10); // Small delay to trigger the transition
    });

    document.getElementById('saveCategoryBtn').addEventListener('click', () => {
        const newCategoryName = document.getElementById('newCategoryName').value.trim();
        const newCategoryLimit = parseFloat(document.getElementById('newCategoryLimit').value);

        if (newCategoryName && !isNaN(newCategoryLimit)) {
            const categorySelect = document.getElementById('expenseCategory');
            const options = Array.from(categorySelect.options);
            const categoryExists = options.some(option => option.value.toLowerCase() === newCategoryName.toLowerCase());

            if (categoryExists) {
                alert('Category already exists.');
            } else {
                // Send the new category data to the backend
                fetch('/add_expense_category/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        name: newCategoryName,
                        max_limit: newCategoryLimit
                    })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Added expense category:', data); // Add logging
                    if (data.message) {
                        // Add the new category to the select options
                        const newOption = document.createElement('option');
                        newOption.value = newCategoryName;
                        newOption.textContent = `${newCategoryName}`;
                        categorySelect.appendChild(newOption);

                        // Optionally, store the new category and its limit in a global object
                        categoryLimits[newCategoryName] = newCategoryLimit;
                        categoryExpenses[newCategoryName] = 0;

                        // Create a progress bar for the new category
                        createProgressBar(newCategoryName, newCategoryLimit);

                        // Hide the modal and reset the input fields
                        const modal = document.getElementById('addCategoryModal');
                        modal.style.left = '100%';
                        setTimeout(() => {
                            modal.style.display = 'none';
                            document.getElementById('newCategoryName').value = '';
                            document.getElementById('newCategoryLimit').value = '';
                        }, 300); // Match the transition duration
                    }
                })
                .catch(error => {
                    console.error('Error adding expense category:', error);
                    alert('An error occurred while adding the expense category.');
                });
            }
        } else {
            alert('Please enter a valid category name and limit.');
        }
    });

    document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
        const modal = document.getElementById('addCategoryModal');
        modal.style.left = '100%';
        setTimeout(() => {
            modal.style.display = 'none';
            document.getElementById('newCategoryName').value = '';
            document.getElementById('newCategoryLimit').value = '';
        }, 300); // Match the transition duration
    });

    // Global objects to store category limits and expenses
    const categoryLimits = {};
    const categoryExpenses = {};

    // Function to create a progress bar for a category
    function createProgressBar(category, limit, currentExpense = 0) {
        const expenseList = document.getElementById('expenseList');
        const progressBarContainer = document.createElement('div');
        progressBarContainer.classList.add('progress-bar-container');
        const percentage = (currentExpense / limit) * 100;
        progressBarContainer.innerHTML = `
            <label class="progt">${category} [Max: ${limit} TND]</label>
            <div class="progress-bar">
                <div class="progress" id="progress-${category}" style="width: ${percentage}%"></div>
            </div>
        `;
        expenseList.appendChild(progressBarContainer);

        // Set the initial color based on the percentage
        const progress = document.getElementById(`progress-${category}`);
        if (percentage >= 100) {
            progress.style.backgroundColor = 'red';
        } else {
            progress.style.backgroundColor = 'var(--green)';
        }
    }

    // Function to update the progress bar for a category
    function updateProgressBar(category, amount) {
        const progress = document.getElementById(`progress-${category}`);
        const limit = categoryLimits[category];
        categoryExpenses[category] += amount;
        const percentage = (categoryExpenses[category] / limit) * 100;
        progress.style.width = `${percentage}%`;

        if (percentage >= 100) {
            progress.style.backgroundColor = 'red';
            const categorySelect = document.getElementById('expenseCategory');
            const options = Array.from(categorySelect.options);
            options.forEach(option => {
                if (option.value === category) {
                    option.disabled = true;
                }
            });
        } else {
            progress.style.backgroundColor = 'var(--green)';
        }
    }

    // Fetch and display expenses
    fetch('/expenses/')
        .then(response => {
            console.log('Fetch expenses response:', response);
            return response.json();
        })
        .then(data => {
            console.log('Fetched expenses:', data); // Add logging
            const expensesTable = document.getElementById('expensesTable').getElementsByTagName('tbody')[0];
            let totalExpenses = 0;
            data.forEach(expense => {
                const newRow = expensesTable.insertRow();
                newRow.innerHTML = `
                    <td>${expense.title}</td>
                    <td>${expense.amount}</td>
                    <td>${expense.category}</td>
                    <td>${expense.date}</td>
                    <td>${expense.comment}</td>
                `;
                totalExpenses += parseFloat(expense.amount);
            });
            totalExpensesElement.textContent = totalExpenses.toFixed(2);
            updateTotalBalance();
        })
        .catch(error => {
            console.error('Error fetching expenses:', error);
            alert('An error occurred while fetching the expenses.');
        });

    // Fetch and display incomes
    fetch('/incomes/')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched incomes:', data); // Add logging
            const totalIncomesElement = document.querySelector('#totalIncomes');
            let totalIncomes = 0;
            data.forEach(income => {
                totalIncomes += parseFloat(income.amount);
            });
            totalIncomesElement.textContent = totalIncomes.toFixed(2);
            updateTotalBalance();
        })
        .catch(error => {
            console.error('Error fetching incomes:', error);
            alert('An error occurred while fetching the incomes.');
        });

    // Function to update the total balance
    function updateTotalBalance() {
        const totalIncomes = parseFloat(document.querySelector('#totalIncomes').textContent) || 0;
        const totalExpenses = parseFloat(totalExpensesElement.textContent) || 0;
        const totalBalance = totalIncomes - totalExpenses;
        totalBalanceElement.textContent = totalBalance.toFixed(2);
    }

    // Fetch and display expense categories and their progress
    fetch('/get_expense_categories/')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched expense categories:', data); // Add logging
            const categorySelect = document.getElementById('expenseCategory');
            data.forEach(category => {
                const newOption = document.createElement('option');
                newOption.value = category.name;
                newOption.textContent = `${category.name}`;
                categorySelect.appendChild(newOption);

                // Optionally, store the new category and its limit in a global object
                categoryLimits[category.name] = parseFloat(category.max_limit);
                categoryExpenses[category.name] = parseFloat(category.current_expense);

                // Create a progress bar for the new category
                createProgressBar(category.name, category.max_limit, category.current_expense);

                // Disable the category if the limit is reached
                if (category.current_expense >= category.max_limit) {
                    const progress = document.getElementById(`progress-${category.name}`);
                    progress.style.backgroundColor = 'red';
                    newOption.disabled = true;
                }
            });
        })
        .catch(error => {
            console.error('Error fetching expense categories:', error);
            alert('An error occurred while fetching the expense categories.');
        });

    // Example code to handle form submission and update progress bar
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('expenseTitle').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const date = document.getElementById('expenseDate').value;
        const comment = document.getElementById('expenseComment').value;

        if (category && !isNaN(amount)) {
            updateProgressBar(category, amount);

            // Add the expense to the hidden table
            const expensesTable = document.getElementById('expensesTable').getElementsByTagName('tbody')[0];
            const newRow = expensesTable.insertRow();
            newRow.innerHTML = `
                <td>${title}</td>
                <td>${amount}</td>
                <td>${category}</td>
                <td>${date}</td>
                <td>${comment}</td>
            `;

            // Send the expense data to the backend
            fetch('/add_expense/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    title: title,
                    amount: amount,
                    category: category,
                    date: date,
                    comment: comment
                })
            })
            .then(response => {
                console.log('Add expense response:', response);
                return response.json();
            })
            .then(data => {
                console.log('Added expense:', data); // Add logging
                if (data.message) {
                    totalExpensesElement.textContent = (parseFloat(totalExpensesElement.textContent) + amount).toFixed(2);
                    updateTotalBalance();
                }
            })
            .catch(error => {
                console.error('Error adding expense:', error);
                alert('An error occurred while adding the expense.');
            });
        }

        // Reset the form
        document.getElementById('expenseForm').reset();
    });

    // Function to get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Show expenses in a popup
    document.getElementById('showExpensesBtn').addEventListener('click', () => {
        const modal = document.getElementById('expensesModal');
        modal.style.display = 'block';
    });

    // Close the expenses popup
    document.querySelector('#expensesModal .close').addEventListener('click', () => {
        const modal = document.getElementById('expensesModal');
        modal.style.display = 'none';
    });
});
