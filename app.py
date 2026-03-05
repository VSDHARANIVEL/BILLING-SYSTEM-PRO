from flask import Flask, render_template, request, jsonify
import psycopg2
import os
from datetime import datetime

app = Flask(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db():
    return psycopg2.connect(DATABASE_URL)

# Create tables if not exists
def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS stock(
        code VARCHAR PRIMARY KEY,
        name TEXT,
        price FLOAT,
        stock INTEGER
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS workers(
        number VARCHAR PRIMARY KEY,
        name TEXT,
        pieces INTEGER,
        bills INTEGER,
        incentive FLOAT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS customers(
        phone VARCHAR PRIMARY KEY,
        name TEXT,
        email TEXT,
        address TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS bills(
        id VARCHAR PRIMARY KEY,
        date TEXT,
        customer_phone VARCHAR,
        worker_number VARCHAR,
        total_pieces INTEGER,
        total FLOAT
    )
    """)

    conn.commit()
    cur.close()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

# SEARCH STOCK
@app.route('/api/stock/search/<code>')
def search_stock(code):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT code,name,price,stock FROM stock WHERE code=%s",(code,))
    row = cur.fetchone()

    cur.close()
    conn.close()

    if row:
        product={
            "code":row[0],
            "name":row[1],
            "price":row[2],
            "stock":row[3]
        }
        return jsonify({"success":True,"product":product})

    return jsonify({"success":False,"message":"Product not found"}),404


# ADD STOCK
@app.route('/api/stock/add',methods=["POST"])
def add_stock():

    data=request.json
    conn=get_db()
    cur=conn.cursor()

    cur.execute("SELECT code FROM stock WHERE code=%s",(data["code"],))
    if cur.fetchone():
        return jsonify({"success":False,"message":"Product already exists"}),400

    cur.execute("""
        INSERT INTO stock(code,name,price,stock)
        VALUES(%s,%s,%s,%s)
    """,(data["code"],data["name"],data["price"],data["stock"]))

    conn.commit()
    cur.close()
    conn.close()

   
    return jsonify({"success":True})


# GET WORKERS
@app.route('/api/workers/all')
def get_workers():

    conn=get_db()
    cur=conn.cursor()

    cur.execute("SELECT number,name,pieces,bills,incentive FROM workers")
    rows=cur.fetchall()

    workers={}
    for r in rows:
        workers[r[0]]={
            "number":r[0],
            "name":r[1],
            "pieces":r[2],
            "bills":r[3],
            "incentive":r[4]
        }

    cur.close()
    conn.close()

    return jsonify({"success":True,"workers":workers})


# CREATE BILL
@app.route('/api/bills/create',methods=["POST"])
def create_bill():

    data=request.json

    bill_id="BILL"+str(int(datetime.now().timestamp()*1000))

    total_pieces=sum(i["qty"] for i in data["items"])
    total_amount=sum(i["total"] for i in data["items"])

    conn=get_db()
    cur=conn.cursor()

    # save customer
    phone=data["customer"]["phone"]

    cur.execute("SELECT phone FROM customers WHERE phone=%s",(phone,))
    if not cur.fetchone():

        cur.execute("""
        INSERT INTO customers(phone,name,email,address)
        VALUES(%s,%s,%s,%s)
        """,(
            phone,
            data["customer"]["name"],
            data["customer"].get("email",""),
            data["customer"].get("address","")
        ))

    # save bill
    cur.execute("""
        INSERT INTO bills(id,date,customer_phone,worker_number,total_pieces,total)
        VALUES(%s,%s,%s,%s,%s,%s)
    """,(
        bill_id,
        datetime.now().strftime('%d/%m/%Y %I:%M:%S %p'),
        phone,
        data["workerNumber"],
        total_pieces,
        total_amount
    ))

    # update stock
    for item in data["items"]:
        cur.execute("""
        UPDATE stock
        SET stock = stock - %s
        WHERE code=%s
        """,(item["qty"],item["code"]))

    # update worker
    cur.execute("""
        UPDATE workers
        SET pieces = pieces + %s,
            bills = bills + 1,
            incentive = incentive + %s
        WHERE number=%s
    """,(total_pieces,total_pieces*1,data["workerNumber"]))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        "success":True,
        "bill":{
            "id":bill_id,
            "total":total_amount,
            "totalPieces":total_pieces
        }
    })


if __name__=="__main__":
    app.run(host="0.0.0.0",port=5000)
