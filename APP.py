from flask import Flask, render_template
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    print("\n" + "="*70)
    print(" "*20 + "🚀 BILLING SYSTEM PRO")
    print("="*70)
    print("\n✨ FEATURES:")
    print("   • Press ENTER to move between ALL fields")
    print("   • Type 3-digit code → Product loads automatically")
    print("   • Enter worker NUMBER → Assigns to worker")
    print("   • ₹1 incentive per piece for workers")
    print("   • NO GST calculation")
    print("   • Complete reports with charts")
    print("\n🌐 SERVER:")
    print("   URL: http://localhost:5000")
    print("   Press Ctrl+C to stop")
    print("\n" + "="*70)
    print("🎯 OPEN BROWSER: http://localhost:5000")
    print("="*70 + "\n")
    
    app.run(debug=True, port=5000, host='127.0.0.1')
