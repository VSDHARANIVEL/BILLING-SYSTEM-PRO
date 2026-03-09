from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

# Data directory
DATA_DIR = 'data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# File paths
STOCK_FILE = os.path.join(DATA_DIR, 'stock.json')
WORKERS_FILE = os.path.join(DATA_DIR, 'workers.json')
BILLS_FILE = os.path.join(DATA_DIR, 'bills.json')
CUSTOMERS_FILE = os.path.join(DATA_DIR, 'customers.json')

# Initialize data files
def init_files():
    # Stock
    if not os.path.exists(STOCK_FILE):
        stock = {
            '101': {'code':'101', 'name':'Laptop Dell', 'price':45000, 'stock':50},
            '102': {'code':'102', 'name':'Mouse Wireless', 'price':350, 'stock':200},
            '103': {'code':'103', 'name':'Keyboard Mechanical', 'price':2500, 'stock':100},
            '104': {'code':'104', 'name':'Monitor 24 inch', 'price':12000, 'stock':75},
            '105': {'code':'105', 'name':'USB Cable', 'price':150, 'stock':500}
        }
        with open(STOCK_FILE, 'w') as f:
            json.dump(stock, f, indent=2)
    
    # Workers
    if not os.path.exists(WORKERS_FILE):
        workers = {
            '01': {'number':'01', 'name':'Rajesh Kumar', 'pieces':0, 'bills':0, 'incentive':0},
            '02': {'number':'02', 'name':'Priya Singh', 'pieces':0, 'bills':0, 'incentive':0}
        }
        with open(WORKERS_FILE, 'w') as f:
            json.dump(workers, f, indent=2)
    
    # Bills
    if not os.path.exists(BILLS_FILE):
        with open(BILLS_FILE, 'w') as f:
            json.dump([], f)
    
    # Customers
    if not os.path.exists(CUSTOMERS_FILE):
        with open(CUSTOMERS_FILE, 'w') as f:
            json.dump({}, f)

init_files()

# Helper functions
def load_json(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except:
        return {} if 'customers' in filepath or 'workers' in filepath or 'stock' in filepath else []

def save_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stock/search/<code>')
def search_stock(code):
    stock = load_json(STOCK_FILE)
    if code in stock:
        return jsonify({'success': True, 'product': stock[code]})
    return jsonify({'success': False, 'message': 'Product not found'}), 404

@app.route('/api/stock/all')
def get_all_stock():
    stock = load_json(STOCK_FILE)
    return jsonify({'success': True, 'stock': stock})

@app.route('/api/stock/add', methods=['POST'])
def add_stock():
    data = request.json
    stock = load_json(STOCK_FILE)
    code = data['code']
    
    if code in stock:
        return jsonify({'success': False, 'message': 'Product already exists'}), 400
    
    stock[code] = {
        'code': code,
        'name': data['name'],
        'price': float(data['price']),
        'stock': int(data['stock'])
    }
    save_json(STOCK_FILE, stock)
    return jsonify({'success': True, 'product': stock[code]})

@app.route('/api/workers/all')
def get_all_workers():
    workers = load_json(WORKERS_FILE)
    return jsonify({'success': True, 'workers': workers})

@app.route('/api/workers/get/<number>')
def get_worker(number):
    workers = load_json(WORKERS_FILE)
    if number in workers:
        return jsonify({'success': True, 'worker': workers[number]})
    return jsonify({'success': False, 'message': 'Worker not found'}), 404

@app.route('/api/workers/add', methods=['POST'])
def add_worker():
    data = request.json
    workers = load_json(WORKERS_FILE)
    number = data['number']
    
    if number in workers:
        return jsonify({'success': False, 'message': 'Worker already exists'}), 400
    
    workers[number] = {
        'number': number,
        'name': data['name'],
        'pieces': 0,
        'bills': 0,
        'incentive': 0
    }
    save_json(WORKERS_FILE, workers)
    return jsonify({'success': True, 'worker': workers[number]})

@app.route('/api/bills/create', methods=['POST'])
def create_bill():
    data = request.json
    
    # Generate bill ID
    bill_id = 'BILL' + str(int(datetime.now().timestamp() * 1000))
    
    # Calculate totals
    total_pieces = sum(item['qty'] for item in data['items'])
    total_amount = sum(item['total'] for item in data['items'])
    
    bill = {
        'id': bill_id,
        'date': datetime.now().strftime('%d/%m/%Y %I:%M:%S %p'),
        'customer': data['customer'],
        'items': data['items'],
        'totalPieces': total_pieces,
        'total': total_amount,
        'workerNumber': data['workerNumber'],
        'workerName': data['workerName'],
        'incentive': total_pieces * 1  # ₹1 per piece
    }
    
    # Save bill
    bills = load_json(BILLS_FILE)
    bills.append(bill)
    save_json(BILLS_FILE, bills)
    
    # Update customer
    customers = load_json(CUSTOMERS_FILE)
    phone = data['customer']['phone']
    if phone not in customers:
        customers[phone] = {
            'name': data['customer']['name'],
            'phone': phone,
            'email': data['customer'].get('email', ''),
            'address': data['customer'].get('address', ''),
            'bills': []
        }
    customers[phone]['bills'].append(bill)
    save_json(CUSTOMERS_FILE, customers)
    
    # Update worker
    workers = load_json(WORKERS_FILE)
    worker_num = data['workerNumber']
    if worker_num in workers:
        workers[worker_num]['pieces'] += total_pieces
        workers[worker_num]['bills'] += 1
        workers[worker_num]['incentive'] = workers[worker_num]['pieces'] * 1
        save_json(WORKERS_FILE, workers)
    
    # Update stock
    stock = load_json(STOCK_FILE)
    for item in data['items']:
        if 'code' in item and item['code'] in stock:
            stock[item['code']]['stock'] -= item['qty']
            if stock[item['code']]['stock'] < 0:
                stock[item['code']]['stock'] = 0
    save_json(STOCK_FILE, stock)
    
    return jsonify({'success': True, 'bill': bill})

@app.route('/api/customers/search/<phone>')
def search_customer(phone):
    customers = load_json(CUSTOMERS_FILE)
    if phone in customers:
        return jsonify({'success': True, 'customer': customers[phone]})
    return jsonify({'success': False, 'message': 'Customer not found'}), 404

@app.route('/api/reports/summary')
def get_reports():
    bills = load_json(BILLS_FILE)
    customers = load_json(CUSTOMERS_FILE)
    workers = load_json(WORKERS_FILE)
    stock = load_json(STOCK_FILE)
    
    total_sales = sum(bill['total'] for bill in bills)
    total_incentives = sum(w['incentive'] for w in workers.values())
    stock_value = sum(p['price'] * p['stock'] for p in stock.values())
    
    # Top products
    product_stats = {}
    for bill in bills:
        for item in bill['items']:
            name = item['name']
            if name not in product_stats:
                product_stats[name] = {'name': name, 'qty': 0, 'revenue': 0}
            product_stats[name]['qty'] += item['qty']
            product_stats[name]['revenue'] += item['total']
    
    top_products = sorted(product_stats.values(), key=lambda x: x['revenue'], reverse=True)[:5]
    
    return jsonify({
        'success': True,
        'summary': {
            'totalSales': total_sales,
            'totalBills': len(bills),
            'totalCustomers': len(customers),
            'totalIncentives': total_incentives,
            'stockValue': stock_value,
            'recentBills': list(reversed(bills))[:10],
            'topProducts': top_products
        }
    })

if __name__ == '__main__':
    print("\n" + "="*80)
    print(" "*25 + "🚀 BILLING SYSTEM PRO")
    print("="*80)
    print("\n✨ SERVER RUNNING:")
    print("   🌐 Local:   http://localhost:5000")
    print("   🌐 Network: http://127.0.0.1:5000")
    print("\n📋 FEATURES:")
    print("   ✓ Press ENTER to navigate between fields")
    print("   ✓ Type 3-digit stock code for instant product load")
    print("   ✓ Enter worker number for automatic assignment")
    print("   ✓ ₹1 per piece incentive calculation")
    print("   ✓ Complete reports and analytics")
    print("\n⌨️  Press CTRL+C to stop server")
    print("="*80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
