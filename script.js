// Global Data
let stock = {
    '101': {code:'101', name:'Laptop Dell', price:45000, stock:50},
    '102': {code:'102', name:'Mouse Wireless', price:350, stock:200},
    '103': {code:'103', name:'Keyboard Mechanical', price:2500, stock:100},
    '104': {code:'104', name:'Monitor 24 inch', price:12000, stock:75},
    '105': {code:'105', name:'USB Cable', price:150, stock:500}
};

let workers = {
    '1': {number:'01', name:'Rajesh Kumar', pieces:0, bills:0, incentive:0},
    '2': {number:'02', name:'Priya Singh', pieces:0, bills:0, incentive:0}
};

let customers = {};
let bills = [];
let billItems = [];
let currentProduct = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEnterKeyNavigation();
    setupStockCodeSearch();
    setupWorkerNumberInput();
    updateStockTable();
    updateWorkerTable();
    updateReports();
    setupNavigation();
});

// Update DateTime
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN');
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-IN');
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.dataset.section;
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(section).classList.add('active');
            this.classList.add('active');
            
            if (section === 'reports') updateReports();
        });
    });
}

// ENTER KEY NAVIGATION FOR ALL FIELDS
function setupEnterKeyNavigation() {
    const fields = [
        'customerName',
        'customerPhone',
        'customerEmail',
        'customerAddress',
        'stockCode',
        'itemQuantity',
        'itemDiscount',
        'workerNumber'
    ];
    
    // Customer Name -> Phone
    document.getElementById('customerName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('customerPhone').focus();
        }
    });
    
    // Phone -> Email
    document.getElementById('customerPhone').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('customerEmail').focus();
        }
    });
    
    // Email -> Address
    document.getElementById('customerEmail').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('customerAddress').focus();
        }
    });
    
    // Address -> Stock Code
    document.getElementById('customerAddress').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('stockCode').focus();
        }
    });
    
    // Stock Code -> Quantity (after product loads)
    document.getElementById('stockCode').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (currentProduct) {
                document.getElementById('itemQuantity').focus();
            }
        }
    });
    
    // Quantity -> Discount
    document.getElementById('itemQuantity').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('itemDiscount').focus();
        }
    });
    
    // Discount -> Add Item & back to Stock Code
    document.getElementById('itemDiscount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem();
        }
    });
    
    // Worker Number -> Generate Bill
    document.getElementById('workerNumber').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            generateBill();
        }
    });
    
    // Generate Bill button click
    document.getElementById('generateBillBtn').addEventListener('click', generateBill);
}

// Stock Code Search
function setupStockCodeSearch() {
    const input = document.getElementById('stockCode');
    input.addEventListener('input', function() {
        const code = this.value;
        if (code.length === 3 && stock[code]) {
            currentProduct = stock[code];
            showProductDetails(stock[code]);
        } else {
            hideProductDetails();
        }
    });
}

function showProductDetails(product) {
    document.getElementById('productDetails').style.display = 'block';
    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent = product.price.toFixed(2);
    document.getElementById('productStock').textContent = product.stock;
    document.getElementById('itemQuantity').value = 1;
    document.getElementById('itemDiscount').value = 0;
}

function hideProductDetails() {
    document.getElementById('productDetails').style.display = 'none';
    currentProduct = null;
}

// Worker Number Input
function setupWorkerNumberInput() {
    const input = document.getElementById('workerNumber');
    input.addEventListener('input', function() {
        const number = this.value;
        const worker = workers[number];
        const totalPieces = billItems.reduce((sum, item) => sum + item.qty, 0);
        
        if (worker) {
            document.getElementById('workerInfo').style.display = 'block';
            document.getElementById('workerName').textContent = worker.name;
            document.getElementById('currentIncentive').textContent = (totalPieces * 1).toFixed(2);
        } else {
            document.getElementById('workerInfo').style.display = 'none';
        }
    });
}

// Add Item
function addItem() {
    if (!currentProduct) {
        notify('Please enter a valid stock code', 'error');
        return;
    }
    
    const qty = parseInt(document.getElementById('itemQuantity').value);
    const disc = parseFloat(document.getElementById('itemDiscount').value) || 0;
    
    if (qty > currentProduct.stock) {
        notify('Not enough stock available', 'error');
        return;
    }
    
    const total = (qty * currentProduct.price) * (1 - disc/100);
    
    billItems.push({
        id: Date.now(),
        code: currentProduct.code,
        name: currentProduct.name,
        qty,
        price: currentProduct.price,
        disc,
        total
    });
    
    updateBillTable();
    document.getElementById('stockCode').value = '';
    hideProductDetails();
    document.getElementById('stockCode').focus();
    notify('Item added!', 'success');
    
    // Update worker incentive preview
    const workerNum = document.getElementById('workerNumber').value;
    if (workers[workerNum]) {
        const totalPieces = billItems.reduce((sum, item) => sum + item.qty, 0);
        document.getElementById('currentIncentive').textContent = (totalPieces * 1).toFixed(2);
    }
}

function removeItem(id) {
    billItems = billItems.filter(i => i.id !== id);
    updateBillTable();
    
    // Update worker incentive preview
    const workerNum = document.getElementById('workerNumber').value;
    if (workers[workerNum]) {
        const totalPieces = billItems.reduce((sum, item) => sum + item.qty, 0);
        document.getElementById('currentIncentive').textContent = (totalPieces * 1).toFixed(2);
    }
}

function updateBillTable() {
    const tbody = document.getElementById('billTableBody');
    
    if (billItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No items added</td></tr>';
        document.getElementById('subtotal').textContent = '₹0.00';
        document.getElementById('total').textContent = '₹0.00';
        return;
    }
    
    tbody.innerHTML = billItems.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>${item.disc}%</td>
            <td>₹${item.total.toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="removeItem(${item.id})">Remove</button></td>
        </tr>
    `).join('');
    
    const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('total').textContent = '₹' + subtotal.toFixed(2);
}

// Generate Bill
function generateBill() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const workerNum = document.getElementById('workerNumber').value.trim();
    
    if (!name || !phone) {
        notify('Enter customer name and phone', 'error');
        return;
    }
    
    if (billItems.length === 0) {
        notify('Add at least one item', 'error');
        return;
    }
    
    if (!workerNum || !workers[workerNum]) {
        notify('Enter a valid worker number', 'error');
        return;
    }
    
    const totalPcs = billItems.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
    const worker = workers[workerNum];
    
    const bill = {
        id: 'BILL' + Date.now(),
        date: new Date().toLocaleString('en-IN'),
        customer: {name, phone, email, address},
        items: [...billItems],
        totalPcs,
        total: subtotal,
        workerNumber: workerNum,
        workerName: worker.name,
        incentive: totalPcs * 1
    };
    
    bills.push(bill);
    
    // Update customer
    if (!customers[phone]) {
        customers[phone] = {name, phone, email, address, bills: []};
    }
    customers[phone].bills.push(bill);
    
    // Update worker stats
    worker.pieces += totalPcs;
    worker.bills += 1;
    worker.incentive = worker.pieces * 1;
    
    // Update stock
    billItems.forEach(item => {
        stock[item.code].stock -= item.qty;
    });
    
    saveData();
    showBillModal(bill);
    resetForm();
    updateStockTable();
    updateWorkerTable();
    updateReports();
    notify('Bill generated successfully!', 'success');
}

function showBillModal(bill) {
    document.getElementById('printContent').innerHTML = `
        <div style="max-width:650px;margin:auto;">
            <div style="text-align:center;border-bottom:2px solid #5B5FD8;padding-bottom:1rem;margin-bottom:1.5rem;">
                <h2 style="color:#5B5FD8;">Billing System Pro</h2>
                <p style="color:#6B7280;">Thank you for your business!</p>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
                <div><strong>Bill ID:</strong> ${bill.id}</div>
                <div><strong>Date:</strong> ${bill.date}</div>
            </div>
            
            <div style="background:#F9FAFB;padding:1rem;border-radius:6px;margin-bottom:1.5rem;">
                <strong>Customer:</strong><br>
                ${bill.customer.name}<br>
                ${bill.customer.phone}<br>
                ${bill.customer.email ? bill.customer.email + '<br>' : ''}
                ${bill.customer.address || ''}
            </div>
            
            <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;">
                <thead style="background:#F9FAFB;">
                    <tr>
                        <th style="padding:0.75rem;text-align:left;border-bottom:1px solid #E5E7EB;">Item</th>
                        <th style="padding:0.75rem;text-align:left;border-bottom:1px solid #E5E7EB;">Qty</th>
                        <th style="padding:0.75rem;text-align:left;border-bottom:1px solid #E5E7EB;">Price</th>
                        <th style="padding:0.75rem;text-align:left;border-bottom:1px solid #E5E7EB;">Disc</th>
                        <th style="padding:0.75rem;text-align:left;border-bottom:1px solid #E5E7EB;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${bill.items.map(item => `
                        <tr>
                            <td style="padding:0.75rem;border-bottom:1px solid #E5E7EB;">${item.name}</td>
                            <td style="padding:0.75rem;border-bottom:1px solid #E5E7EB;">${item.qty}</td>
                            <td style="padding:0.75rem;border-bottom:1px solid #E5E7EB;">₹${item.price.toFixed(2)}</td>
                            <td style="padding:0.75rem;border-bottom:1px solid #E5E7EB;">${item.disc}%</td>
                            <td style="padding:0.75rem;border-bottom:1px solid #E5E7EB;">₹${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="text-align:right;margin-bottom:1rem;">
                <div style="margin-bottom:0.5rem;">
                    <strong>Subtotal:</strong> ₹${bill.total.toFixed(2)}
                </div>
                <div style="font-size:1.25rem;font-weight:700;color:#5B5FD8;">
                    <strong>Total:</strong> ₹${bill.total.toFixed(2)}
                </div>
            </div>
            
            <div style="background:#D1FAE5;padding:1rem;border-radius:6px;text-align:center;">
                <strong>Served by:</strong> ${bill.workerName} (${bill.workerNumber})<br>
                <span style="color:#059669;">Worker Incentive: ₹${bill.incentive.toFixed(2)} (${bill.totalPcs} pieces × ₹1)</span>
            </div>
        </div>
    `;
    document.getElementById('printModal').classList.add('active');
}

function closeModal() {
    document.getElementById('printModal').classList.remove('active');
}

function resetForm() {
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('workerNumber').value = '';
    document.getElementById('stockCode').value = '';
    document.getElementById('workerInfo').style.display = 'none';
    billItems = [];
    updateBillTable();
    document.getElementById('customerName').focus();
}

// Stock Management
function addProduct() {
    const code = document.getElementById('newCode').value.trim();
    const name = document.getElementById('newName').value.trim();
    const price = parseFloat(document.getElementById('newPrice').value);
    const stk = parseInt(document.getElementById('newStock').value);
    
    if (!code || !name || !price || isNaN(stk)) {
        notify('Fill all fields', 'error');
        return;
    }
    
    if (stock[code]) {
        notify('Product code already exists', 'error');
        return;
    }
    
    stock[code] = {code, name, price, stock: stk};
    saveData();
    updateStockTable();
    document.getElementById('newCode').value = '';
    document.getElementById('newName').value = '';
    document.getElementById('newPrice').value = '';
    document.getElementById('newStock').value = '';
    notify('Product added!', 'success');
}

function updateStockTable() {
    const tbody = document.getElementById('stockTable');
    tbody.innerHTML = Object.values(stock).map(p => `
        <tr>
            <td><strong>${p.code}</strong></td>
            <td>${p.name}</td>
            <td>₹${p.price.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>₹${(p.price * p.stock).toFixed(2)}</td>
        </tr>
    `).join('');
}

// Worker Management
function addWorker() {
    const number = document.getElementById('newWorkerNumber').value.trim();
    const name = document.getElementById('newWorkerName').value.trim();
    
    if (!number || !name) {
        notify('Fill all fields', 'error');
        return;
    }
    
    if (workers[number]) {
        notify('Worker number already exists', 'error');
        return;
    }
    
    workers[number] = {number, name, pieces: 0, bills: 0, incentive: 0};
    saveData();
    updateWorkerTable();
    document.getElementById('newWorkerNumber').value = '';
    document.getElementById('newWorkerName').value = '';
    notify('Worker added!', 'success');
}

function updateWorkerTable() {
    const tbody = document.getElementById('workerTable');
    tbody.innerHTML = Object.values(workers).map(w => `
        <tr>
            <td><strong>${w.number}</strong></td>
            <td>${w.name}</td>
            <td>${w.pieces}</td>
            <td>${w.bills}</td>
            <td style="color:#10B981;"><strong>₹${w.incentive.toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

// Customer Search
function searchCustomer() {
    const phone = document.getElementById('searchPhone').value.trim();
    const div = document.getElementById('customerResult');
    const cust = customers[phone];
    
    if (!cust) {
        div.innerHTML = '<p style="color:#EF4444;">Customer not found</p>';
        div.style.display = 'block';
        return;
    }
    
    const sorted = [...cust.bills].sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = sorted[0];
    
    div.innerHTML = `
        <h3>${cust.name}</h3>
        <p>Phone: ${cust.phone}</p>
        <p>Total Bills: ${cust.bills.length}</p>
        <p>Total Spent: ₹${cust.bills.reduce((s, b) => s + b.total, 0).toFixed(2)}</p>
        
        <div style="background:#FEF3C7;padding:1rem;border-radius:6px;border-left:4px solid #F59E0B;margin:1rem 0;">
            <h4 style="color:#F59E0B;">📋 LAST BILL</h4>
            <p><strong>ID:</strong> ${last.id}</p>
            <p><strong>Date:</strong> ${last.date}</p>
            <p><strong>Amount:</strong> ₹${last.total.toFixed(2)}</p>
            <p><strong>Items:</strong> ${last.items.length} (${last.totalPcs} pieces)</p>
            <p><strong>Worker:</strong> ${last.workerName}</p>
        </div>
        
        <h4>All Bills:</h4>
        <table>
            <thead><tr><th>Bill ID</th><th>Date</th><th>Amount</th><th>Worker</th></tr></thead>
            <tbody>
                ${sorted.map(b => `
                    <tr>
                        <td>${b.id}</td>
                        <td>${b.date}</td>
                        <td>₹${b.total.toFixed(2)}</td>
                        <td>${b.workerName}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    div.style.display = 'block';
}

// UPDATE REPORTS - WORKING VERSION
function updateReports() {
    // Total Sales
    const totalSales = bills.reduce((sum, b) => sum + b.total, 0);
    document.getElementById('repSales').textContent = '₹' + totalSales.toFixed(2);
    
    // Total Bills
    document.getElementById('repBills').textContent = bills.length;
    
    // Total Customers
    document.getElementById('repCustomers').textContent = Object.keys(customers).length;
    
    // Total Incentives
    const totalIncentives = Object.values(workers).reduce((sum, w) => sum + w.incentive, 0);
    document.getElementById('repIncentives').textContent = '₹' + totalIncentives.toFixed(2);
    
    // Recent Bills
    const tbody = document.getElementById('recentBillsTable');
    if (bills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No bills yet</td></tr>';
    } else {
        const recent = [...bills].reverse().slice(0, 10);
        tbody.innerHTML = recent.map(b => `
            <tr>
                <td><strong>${b.id}</strong></td>
                <td>${b.date}</td>
                <td>${b.customer.name}</td>
                <td>${b.customer.phone}</td>
                <td>${b.items.length} (${b.totalPcs} pcs)</td>
                <td><strong>₹${b.total.toFixed(2)}</strong></td>
                <td>${b.workerName}</td>
            </tr>
        `).join('');
    }
    
    // Top Products
    const productSales = {};
    bills.forEach(bill => {
        bill.items.forEach(item => {
            if (!productSales[item.code]) {
                productSales[item.code] = {
                    name: item.name,
                    qty: 0,
                    revenue: 0
                };
            }
            productSales[item.code].qty += item.qty;
            productSales[item.code].revenue += item.total;
        });
    });
    
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    const topProdTable = document.getElementById('topProductsTable');
    if (topProducts.length === 0) {
        topProdTable.innerHTML = '<tr><td colspan="3" class="empty-state">No sales yet</td></tr>';
    } else {
        topProdTable.innerHTML = topProducts.map(p => `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.qty} units</td>
                <td><strong>₹${p.revenue.toFixed(2)}</strong></td>
            </tr>
        `).join('');
    }
}

// Data Persistence
function saveData() {
    localStorage.setItem('billingData', JSON.stringify({
        stock,
        workers,
        customers,
        bills
    }));
}

function loadData() {
    const saved = localStorage.getItem('billingData');
    if (saved) {
        const data = JSON.parse(saved);
        stock = data.stock || stock;
        workers = data.workers || workers;
        customers = data.customers || customers;
        bills = data.bills || bills;
    }
}

// Notifications
function notify(message, type) {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s;
    `;
    div.style.background = type === 'success' ? '#10B981' : '#EF4444';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
