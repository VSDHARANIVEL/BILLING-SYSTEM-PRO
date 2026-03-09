// Global variables
let billItems = [];
let currentProduct = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEnterKeys();
    loadInitialData();
});

function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN');
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-IN');
}

// ENTER KEY NAVIGATION - COMPLETE
function setupEnterKeys() {
    document.getElementById('customerName').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('customerPhone').focus(); }
    };
    
    document.getElementById('customerPhone').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('customerEmail').focus(); }
    };
    
    document.getElementById('customerEmail').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('customerAddress').focus(); }
    };
    
    document.getElementById('customerAddress').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('stockCode').focus(); }
    };
    
    document.getElementById('stockCode').oninput = (e) => {
        if (e.target.value.length === 3) searchStock(e.target.value);
    };
    
    document.getElementById('stockCode').onkeypress = (e) => {
        if (e.key === 'Enter' && currentProduct) { e.preventDefault(); document.getElementById('itemQuantity').focus(); }
    };
    
    document.getElementById('itemQuantity').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('itemPrice').focus(); }
    };
    
    document.getElementById('itemPrice').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('itemDiscount').focus(); }
    };
    
    document.getElementById('itemDiscount').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addItem(); }
    };
    
    document.getElementById('workerNumber').oninput = (e) => checkWorker(e.target.value);
    
    document.getElementById('workerNumber').onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); generateBill(); }
    };
}

// Search stock by code
async function searchStock(code) {
    try {
        const response = await fetch(`/api/stock/search/${code}`);
        const data = await response.json();
        
        if (data.success) {
            currentProduct = data.product;
            document.getElementById('productDetails').style.display = 'block';
            document.getElementById('productName').textContent = data.product.name;
            document.getElementById('productPrice').textContent = data.product.price.toFixed(2);
            document.getElementById('productStock').textContent = data.product.stock;
            document.getElementById('itemPrice').value = data.product.price;
            document.getElementById('itemQuantity').focus();
        } else {
            document.getElementById('productDetails').style.display = 'none';
            currentProduct = null;
        }
    } catch (error) {
        console.error('Error:', error);
        notify('Error searching product', 'error');
    }
}

// Check worker
async function checkWorker(number) {
    try {
        const response = await fetch(`/api/workers/get/${number}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('workerInfo').style.display = 'block';
            document.getElementById('workerName').textContent = data.worker.name;
            const pieces = billItems.reduce((s,i) => s + i.qty, 0);
            document.getElementById('workerIncentive').textContent = pieces;
        } else {
            document.getElementById('workerInfo').style.display = 'none';
        }
    } catch (error) {
        document.getElementById('workerInfo').style.display = 'none';
    }
}

// Add item to bill
function addItem() {
    if (!currentProduct) {
        notify('Please enter a valid stock code', 'error');
        return;
    }
    
    const qty = parseInt(document.getElementById('itemQuantity').value);
    const price = parseFloat(document.getElementById('itemPrice').value);
    const disc = parseFloat(document.getElementById('itemDiscount').value) || 0;
    
    if (qty > currentProduct.stock) {
        notify('Not enough stock available', 'error');
        return;
    }
    
    const total = (qty * price) * (1 - disc/100);
    
    billItems.push({
        id: Date.now(),
        code: currentProduct.code,
        name: currentProduct.name,
        qty, price, disc, total
    });
    
    updateBillTable();
    document.getElementById('stockCode').value = '';
    document.getElementById('productDetails').style.display = 'none';
    currentProduct = null;
    document.getElementById('stockCode').focus();
    notify('Item added!', 'success');
}

function removeItem(id) {
    billItems = billItems.filter(i => i.id !== id);
    updateBillTable();
}

function updateBillTable() {
    const tbody = document.getElementById('billTableBody');
    
    if (billItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No items added</td></tr>';
        document.getElementById('subtotal').textContent = '₹0.00';
        document.getElementById('total').textContent = '₹0.00';
        return;
    }
    
    tbody.innerHTML = billItems.map(i => `
        <tr>
            <td>${i.name}</td>
            <td>${i.qty}</td>
            <td>₹${i.price.toFixed(2)}</td>
            <td>${i.disc}%</td>
            <td>₹${i.total.toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="removeItem(${i.id})">Remove</button></td>
        </tr>
    `).join('');
    
    const subtotal = billItems.reduce((s,i) => s + i.total, 0);
    document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('total').textContent = '₹' + subtotal.toFixed(2);
}

// Generate bill
async function generateBill() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const workerNum = document.getElementById('workerNumber').value.trim();
    
    if (!name || !phone || billItems.length === 0 || !workerNum) {
        notify('Fill all required fields and add items', 'error');
        return;
    }
    
    try {
        const workerResponse = await fetch(`/api/workers/get/${workerNum}`);
        const workerData = await workerResponse.json();
        
        if (!workerData.success) {
            notify('Invalid worker number', 'error');
            return;
        }
        
        const billData = {
            customer: { name, phone, email, address },
            items: billItems,
            workerNumber: workerNum,
            workerName: workerData.worker.name
        };
        
        const response = await fetch('/api/bills/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showBillModal(data.bill);
            resetForm();
            notify('Bill generated successfully!', 'success');
        } else {
            notify('Error generating bill', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        notify('Error generating bill', 'error');
    }
}

function showBillModal(bill) {
    document.getElementById('printContent').innerHTML = `
        <div style="max-width:650px;margin:auto;">
            <h2 style="text-align:center;color:#5B5FD8;margin-bottom:1rem;">Billing System Pro</h2>
            <p><strong>Bill ID:</strong> ${bill.id}</p>
            <p><strong>Date:</strong> ${bill.date}</p>
            <hr style="margin:1rem 0;">
            <p><strong>Customer:</strong> ${bill.customer.name}</p>
            <p><strong>Phone:</strong> ${bill.customer.phone}</p>
            ${bill.customer.email ? `<p><strong>Email:</strong> ${bill.customer.email}</p>` : ''}
            ${bill.customer.address ? `<p><strong>Address:</strong> ${bill.customer.address}</p>` : ''}
            <hr style="margin:1rem 0;">
            <table style="width:100%;border-collapse:collapse;">
                <tr style="background:#f5f5f5;"><th style="padding:0.5rem;text-align:left;">Item</th><th>Qty</th><th>Price</th><th>Disc</th><th>Total</th></tr>
                ${bill.items.map(i => `<tr><td style="padding:0.5rem;">${i.name}</td><td>${i.qty}</td><td>₹${i.price.toFixed(2)}</td><td>${i.disc}%</td><td>₹${i.total.toFixed(2)}</td></tr>`).join('')}
            </table>
            <hr style="margin:1rem 0;">
            <p style="text-align:right;font-size:1.2rem;"><strong>Total: ₹${bill.total.toFixed(2)}</strong></p>
            <div style="background:#d1fae5;padding:1rem;border-radius:6px;margin-top:1rem;">
                <p><strong>Served by:</strong> ${bill.workerName} (${bill.workerNumber})</p>
                <p><strong>Worker Incentive:</strong> ₹${bill.incentive} (${bill.totalPieces} pieces × ₹1)</p>
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

// Add product
async function addProduct() {
    const code = document.getElementById('newProductCode').value.trim();
    const name = document.getElementById('newProductName').value.trim();
    const price = parseFloat(document.getElementById('newProductPrice').value);
    const stock = parseInt(document.getElementById('newProductStock').value);
    
    if (!code || !name || !price || stock < 0) {
        notify('Fill all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/stock/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name, price, stock })
        });
        
        const data = await response.json();
        
        if (data.success) {
            notify('Product added!', 'success');
            document.getElementById('newProductCode').value = '';
            document.getElementById('newProductName').value = '';
            document.getElementById('newProductPrice').value = '';
            document.getElementById('newProductStock').value = '';
            loadStock();
        } else {
            notify(data.message, 'error');
        }
    } catch (error) {
        notify('Error adding product', 'error');
    }
}

// Load stock
async function loadStock() {
    try {
        const response = await fetch('/api/stock/all');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('stockTableBody');
            tbody.innerHTML = Object.values(data.stock).map(p => `
                <tr>
                    <td><strong>${p.code}</strong></td>
                    <td>${p.name}</td>
                    <td>₹${p.price.toFixed(2)}</td>
                    <td>${p.stock}</td>
                    <td>₹${(p.price * p.stock).toFixed(2)}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading stock:', error);
    }
}

// Add worker
async function addWorker() {
    const number = document.getElementById('newWorkerNumber').value.trim();
    const name = document.getElementById('newWorkerName').value.trim();
    
    if (!number || !name) {
        notify('Fill all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/workers/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number, name })
        });
        
        const data = await response.json();
        
        if (data.success) {
            notify('Worker added!', 'success');
            document.getElementById('newWorkerNumber').value = '';
            document.getElementById('newWorkerName').value = '';
            loadWorkers();
        } else {
            notify(data.message, 'error');
        }
    } catch (error) {
        notify('Error adding worker', 'error');
    }
}

// Load workers
async function loadWorkers() {
    try {
        const response = await fetch('/api/workers/all');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('workersTableBody');
            tbody.innerHTML = Object.values(data.workers).map(w => `
                <tr>
                    <td><strong>${w.number}</strong></td>
                    <td>${w.name}</td>
                    <td>${w.pieces}</td>
                    <td>${w.bills}</td>
                    <td style="color:#10B981;"><strong>₹${w.incentive.toFixed(2)}</strong></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

// Search customer
async function searchCustomer() {
    const phone = document.getElementById('searchPhone').value.trim();
    
    if (!phone) {
        notify('Enter phone number', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/customers/search/${phone}`);
        const data = await response.json();
        
        const div = document.getElementById('customerResult');
        
        if (data.success) {
            const c = data.customer;
            const sorted = [...c.bills].sort((a,b) => new Date(b.date) - new Date(a.date));
            const last = sorted[0];
            
            div.innerHTML = `
                <h3>${c.name}</h3>
                <p>Phone: ${c.phone}</p>
                <p>Total Bills: ${c.bills.length}</p>
                <div style="background:#FEF3C7;padding:1rem;border-radius:6px;margin:1rem 0;">
                    <h4 style="color:#F59E0B;">📋 LAST BILL</h4>
                    <p><strong>ID:</strong> ${last.id}</p>
                    <p><strong>Date:</strong> ${last.date}</p>
                    <p><strong>Amount:</strong> ₹${last.total.toFixed(2)}</p>
                    <p><strong>Worker:</strong> ${last.workerName}</p>
                </div>
            `;
            div.style.display = 'block';
        } else {
            div.innerHTML = '<p style="color:#EF4444;">Customer not found</p>';
            div.style.display = 'block';
        }
    } catch (error) {
        notify('Error searching customer', 'error');
    }
}

// Load reports
async function loadReports() {
    try {
        const response = await fetch('/api/reports/summary');
        const data = await response.json();
        
        if (data.success) {
            const s = data.summary;
            document.getElementById('repTotalSales').textContent = '₹' + s.totalSales.toFixed(2);
            document.getElementById('repTotalBills').textContent = s.totalBills;
            document.getElementById('repTotalCustomers').textContent = s.totalCustomers;
            document.getElementById('repTotalIncentives').textContent = '₹' + s.totalIncentives.toFixed(2);
            
            // Recent bills
            const recentBody = document.getElementById('recentBillsBody');
            if (s.recentBills.length === 0) {
                recentBody.innerHTML = '<tr><td colspan="7" class="empty-state">No bills yet</td></tr>';
            } else {
                recentBody.innerHTML = s.recentBills.map(b => `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.date}</td>
                        <td>${b.customer.name}</td>
                        <td>${b.customer.phone}</td>
                        <td>${b.items.length} (${b.totalPieces} pcs)</td>
                        <td><strong>₹${b.total.toFixed(2)}</strong></td>
                        <td>${b.workerName}</td>
                    </tr>
                `).join('');
            }
            
            // Top products
            const topBody = document.getElementById('topProductsBody');
            if (s.topProducts.length === 0) {
                topBody.innerHTML = '<tr><td colspan="3" class="empty-state">No sales yet</td></tr>';
            } else {
                topBody.innerHTML = s.topProducts.map(p => `
                    <tr>
                        <td><strong>${p.name}</strong></td>
                        <td>${p.qty} units</td>
                        <td><strong>₹${p.revenue.toFixed(2)}</strong></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Show section
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    event.target.classList.add('active');
    
    if (name === 'stock') loadStock();
    if (name === 'incentives') loadWorkers();
    if (name === 'reports') loadReports();
}

// Load initial data
function loadInitialData() {
    loadStock();
    loadWorkers();
}

// Notification
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
    `;
    div.style.background = type === 'success' ? '#10B981' : '#EF4444';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
