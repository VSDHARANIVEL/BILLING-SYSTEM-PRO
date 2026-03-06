from flask import Flask, render_template, request, jsonify
import sqlite3
import json
from datetime import datetime

app = Flask(__name__)

DATABASE = 'billing.db'

# Initialize database
def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Stock table
    c.execute('''CREATE TABLE IF NOT EXISTS stock
                 (code TEXT PRIMARY KEY, name TEXT, price REAL, stock INTEGER)''')
    
    # Workers table
    c.execute('''CREATE TABLE IF NOT EXISTS workers
                 (number TEXT PRIMARY KEY, name TEXT, pieces INTEGER, bills INTEGER, incentive REAL)''')
    
    # Bills table
    c.execute('''CREATE TABLE IF NOT EXISTS bills
                 (id TEXT PRIMARY KEY, date TEXT, customer_data TEXT, items_data TEXT, 
                  total_pieces INTEGER, total REAL, worker_number TEXT, worker_name TEXT, incentive REAL)''')
    
    # Customers table
    c.execute('''CREATE TABLE IF NOT EXISTS customers
                 (phone TEXT PRIMARY KEY, name TEXT, email TEXT, address TEXT, bills_data TEXT)''')
    
    # Insert default stock if empty
    c.execute('SELECT COUNT(*) FROM stock')
    if c.fetchone()[0] == 0:
        stock_data = [
            ('101', 'Laptop Dell', 45000, 50),
            ('102', 'Mouse Wireless', 350, 200),
            ('103', 'Keyboard Mechanical', 2500, 100),
            ('104', 'Monitor 24 inch', 12000, 75),
            ('105', 'USB Cable', 150, 500)
        ]
        c.executemany('INSERT INTO stock VALUES (?,?,?,?)', stock_data)
        print("✅ Default stock added")
    
    # Insert default workers if empty
    c.execute('SELECT COUNT(*) FROM workers')
    if c.fetchone()[0] == 0:
        workers_data = [
            ('01', 'Rajesh Kumar', 0, 0, 0),
            ('02', 'Priya Singh', 0, 0, 0)
        ]
        c.executemany('INSERT INTO workers VALUES (?,?,?,?,?)', workers_data)
        print("✅ Default workers added")
    
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stock/search/<code>')
def search_stock(code):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM stock WHERE code = ?', (code,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return jsonify({
            'success': True,
            'product': {
                'code': row['code'],
                'name': row['name'],
                'price': row['price'],
                'stock': row['stock']
            }
        })
    return jsonify({'success': False, 'message': 'Product not found'}), 404

@app.route('/api/stock/all')
def get_all_stock():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM stock')
    rows = c.fetchall()
    conn.close()
    
    stock = {}
    for row in rows:
        stock[row['code']] = {
            'code': row['code'],
            'name': row['name'],
            'price': row['price'],
            'stock': row['stock']
        }
    
    return jsonify({'success': True, 'stock': stock})

@app.route('/api/stock/add', methods=['POST'])
def add_stock():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    try:
        c.execute('INSERT INTO stock VALUES (?,?,?,?)',
                  (data['code'], data['name'], float(data['price']), int(data['stock'])))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'product': data})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'message': 'Product already exists'}), 400

@app.route('/api/workers/all')
def get_all_workers():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM workers')
    rows = c.fetchall()
    conn.close()
    
    workers = {}
    for row in rows:
        workers[row['number']] = {
            'number': row['number'],
            'name': row['name'],
            'pieces': row['pieces'],
            'bills': row['bills'],
            'incentive': row['incentive']
        }
    
    return jsonify({'success': True, 'workers': workers})

@app.route('/api/workers/get/<number>')
def get_worker(number):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM workers WHERE number = ?', (number,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return jsonify({
            'success': True,
            'worker': {
                'number': row['number'],
                'name': row['name'],
                'pieces': row['pieces'],
                'bills': row['bills'],
                'incentive': row['incentive']
            }
        })
    return jsonify({'success': False, 'message': 'Worker not found'}), 404

@app.route('/api/workers/add', methods=['POST'])
def add_worker():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    try:
        c.execute('INSERT INTO workers VALUES (?,?,?,?,?)',
                  (data['number'], data['name'], 0, 0, 0))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'worker': data})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'message': 'Worker already exists'}), 400

@app.route('/api/bills/create', methods=['POST'])
def create_bill():
    data = request.json
    
    bill_id = 'BILL' + str(int(datetime.now().timestamp() * 1000))
    date = datetime.now().strftime('%d/%m/%Y %I:%M:%S %p')
    
    total_pieces = sum(item['qty'] for item in data['items'])
    total_amount = sum(item['total'] for item in data['items'])
    incentive = total_pieces * 1
    
    conn = get_db()
    c = conn.cursor()
    
    # Insert bill
    c.execute('''INSERT INTO bills VALUES (?,?,?,?,?,?,?,?,?)''',
              (bill_id, date, json.dumps(data['customer']), json.dumps(data['items']),
               total_pieces, total_amount, data['workerNumber'], data['workerName'], incentive))
    
    # Update or insert customer
    phone = data['customer']['phone']
    c.execute('SELECT bills_data FROM customers WHERE phone = ?', (phone,))
    row = c.fetchone()
    
    bill_record = {
        'id': bill_id,
        'date': date,
        'customer': data['customer'],
        'items': data['items'],
        'totalPieces': total_pieces,
        'total': total_amount,
        'workerNumber': data['workerNumber'],
        'workerName': data['workerName'],
        'incentive': incentive
    }
    
    if row:
        bills_list = json.loads(row['bills_data'])
        bills_list.append(bill_record)
        c.execute('UPDATE customers SET bills_data = ? WHERE phone = ?',
                  (json.dumps(bills_list), phone))
    else:
        c.execute('INSERT INTO customers VALUES (?,?,?,?,?)',
                  (phone, data['customer']['name'], data['customer'].get('email', ''),
                   data['customer'].get('address', ''), json.dumps([bill_record])))
    
    # Update worker stats
    c.execute('SELECT * FROM workers WHERE number = ?', (data['workerNumber'],))
    worker = c.fetchone()
    if worker:
        new_pieces = worker['pieces'] + total_pieces
        new_bills = worker['bills'] + 1
        new_incentive = new_pieces * 1
        c.execute('UPDATE workers SET pieces = ?, bills = ?, incentive = ? WHERE number = ?',
                  (new_pieces, new_bills, new_incentive, data['workerNumber']))
    
    # Update stock
    for item in data['items']:
        if 'code' in item:
            c.execute('UPDATE stock SET stock = stock - ? WHERE code = ?',
                      (item['qty'], item['code']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'bill': bill_record})

@app.route('/api/customers/search/<phone>')
def search_customer(phone):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM customers WHERE phone = ?', (phone,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return jsonify({
            'success': True,
            'customer': {
                'name': row['name'],
                'phone': row['phone'],
                'email': row['email'],
                'address': row['address'],
                'bills': json.loads(row['bills_data'])
            }
        })
    return jsonify({'success': False, 'message': 'Customer not found'}), 404

@app.route('/api/reports/summary')
def get_reports():
    conn = get_db()
    c = conn.cursor()
    
    # Get all bills
    c.execute('SELECT * FROM bills ORDER BY date DESC')
    bill_rows = c.fetchall()
    
    bills = []
    for row in bill_rows:
        bills.append({
            'id': row['id'],
            'date': row['date'],
            'customer': json.loads(row['customer_data']),
            'items': json.loads(row['items_data']),
            'totalPieces': row['total_pieces'],
            'total': row['total'],
            'workerNumber': row['worker_number'],
            'workerName': row['worker_name'],
            'incentive': row['incentive']
        })
    
    # Get stats
    c.execute('SELECT SUM(total) FROM bills')
    total_sales = c.fetchone()[0] or 0
    
    c.execute('SELECT COUNT(*) FROM bills')
    total_bills = c.fetchone()[0]
    
    c.execute('SELECT COUNT(*) FROM customers')
    total_customers = c.fetchone()[0]
    
    c.execute('SELECT SUM(incentive) FROM workers')
    total_incentives = c.fetchone()[0] or 0
    
    c.execute('SELECT SUM(price * stock) FROM stock')
    stock_value = c.fetchone()[0] or 0
    
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
    
    conn.close()
    
    return jsonify({
        'success': True,
        'summary': {
            'totalSales': total_sales,
            'totalBills': total_bills,
            'totalCustomers': total_customers,
            'totalIncentives': total_incentives,
            'stockValue': stock_value,
            'recentBills': bills[:10],
            'topProducts': top_products
        }
    })

if __name__ == '__main__':
    print("\n" + "="*80)
    print(" "*25 + "🌐 CENTRALIZED BILLING SYSTEM")
    print("="*80)
    print("\n💾 DATABASE: billing.db (SQLite)")
    print("   ✅ ALL devices see the SAME data!")
    print("   ✅ Bills saved permanently")
    print("\n🌐 SERVER RUNNING ON:")
    print("   This Computer:    http://localhost:5000")
    print("   Network Access:   http://0.0.0.0:5000")
    print("\n📱 ACCESS FROM OTHER DEVICES:")
    print("   1. Find your IP address:")
    print("      Windows: ipconfig")
    print("      Mac/Linux: ifconfig")
    print("   2. On other devices, open browser to:")
    print("      http://YOUR_IP_ADDRESS:5000")
    print("   3. Example: http://192.168.1.100:5000")
    print("\n✨ FEATURES:")
    print("   • Same exact design")
    print("   • Enter key navigation")
    print("   • Stock codes (3 digits)")
    print("   • Worker numbers")
    print("   • ₹1 per piece incentive")
    print("   • All devices share data!")
    print("\n⌨️  Press CTRL+C to stop server")
    print("="*80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
