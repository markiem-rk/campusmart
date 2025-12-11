import os
import json
import datetime
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from groq import Groq

# Initialize Flask App
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev_key_campusmart_123')

# Database Configuration (Render/Neon Compatibility)
database_url = os.environ.get('DATABASE_URL', 'sqlite:///campusmart.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# -------------------------------------------------------------------------
# Database Models
# -------------------------------------------------------------------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='staff')
    email = db.Column(db.String(120), nullable=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, nullable=True)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    total = db.Column(db.Float, nullable=False)
    item_count = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.now)
    # Relationship to items could be added here if detailed history is needed

# -------------------------------------------------------------------------
# AI Client (Groq)
# -------------------------------------------------------------------------

def get_ai_client():
    api_key = os.environ.get('API_KEY') or os.environ.get('GROQ_API_KEY')
    if not api_key:
        return None
    return Groq(api_key=api_key)

# -------------------------------------------------------------------------
# Helper Functions & CLI Commands
# -------------------------------------------------------------------------

@app.before_request
def load_logged_in_user():
    user_id = session.get('user_id')
    if user_id is None:
        g.user = None
    else:
        g.user = User.query.get(user_id)

def login_required(view):
    import functools
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('login'))
        return view(**kwargs)
    return wrapped_view

@app.cli.command("init-db")
def init_db_command():
    """Clear the existing data and create new tables."""
    with app.app_context():
        db.create_all()
        # Create default admin if not exists
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin', 
                password=generate_password_hash('password123', method='scrypt'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print("Initialized database with default admin user.")
        else:
            print("Database already initialized.")

@app.cli.command("hash-db")
def hash_existing_db():
    """Securely hash existing DB passwords if they aren't already."""
    with app.app_context():
        user_list = User.query.all()
        count = 0
        for user in user_list:
            if not user.password.startswith('scrypt:'):
                user.password = generate_password_hash(user.password, method='scrypt')
                count += 1
        db.session.commit()
        print(f"Updated {count} users to scrypt hashing.")

@app.cli.command("import-csv")
def import_csv_command():
    """Import users from users.csv."""
    import csv
    filename = 'users.csv'
    if not os.path.exists(filename):
        print(f"File {filename} not found.")
        return

    with app.app_context():
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            count = 0
            for row in reader:
                if len(row) < 3: continue
                username = row[1]
                password = row[2]
                email = row[3] if len(row) > 3 else None
                
                if not User.query.filter_by(username=username).first():
                    # Hash password before saving
                    hashed = generate_password_hash(password, method='scrypt')
                    new_user = User(username=username, password=hashed, email=email)
                    db.session.add(new_user)
                    count += 1
            db.session.commit()
            print(f"Imported {count} new users.")

# -------------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------------

@app.route('/')
def index():
    if g.user:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=('GET', 'POST'))
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        error = None

        user = User.query.filter_by(username=username).first()

        if user is None:
            error = 'Incorrect username.'
        elif not check_password_hash(user.password, password):
            error = 'Incorrect password.'

        if error is None:
            session.clear()
            session['user_id'] = user.id
            return redirect(url_for('dashboard'))

        flash(error)

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Gather metrics
    products = Product.query.all()
    transactions = Transaction.query.order_by(Transaction.timestamp.desc()).limit(10).all()
    
    total_revenue = db.session.query(db.func.sum(Transaction.total)).scalar() or 0
    total_items = sum(p.stock for p in products)
    low_stock = sum(1 for p in products if p.stock < 10)
    
    return render_template('dashboard.html', 
                           page='dashboard',
                           total_revenue=total_revenue,
                           total_items=total_items,
                           low_stock=low_stock,
                           transactions=transactions)

@app.route('/inventory', methods=('GET', 'POST'))
@login_required
def inventory():
    if request.method == 'POST':
        name = request.form['name']
        category = request.form['category']
        price = float(request.form['price'])
        stock = int(request.form['stock'])
        description = request.form.get('description', '')

        new_prod = Product(name=name, category=category, price=price, stock=stock, description=description)
        db.session.add(new_prod)
        db.session.commit()
        return redirect(url_for('inventory'))

    products = Product.query.order_by(Product.name).all()
    return render_template('inventory.html', page='inventory', products=products)

@app.route('/inventory/delete/<int:id>', methods=['POST'])
@login_required
def delete_product(id):
    product = Product.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()
    return redirect(url_for('inventory'))

@app.route('/pos')
@login_required
def pos():
    products = Product.query.filter(Product.stock > 0).order_by(Product.name).all()
    return render_template('pos.html', page='pos', products=products)

# -------------------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------------------

@app.route('/api/transaction', methods=['POST'])
@login_required
def create_transaction():
    data = request.json
    cart_items = data.get('items', [])
    
    if not cart_items:
        return jsonify({'error': 'Cart is empty'}), 400

    total = 0
    item_count = 0
    
    try:
        # Process items and deduct stock
        for item in cart_items:
            product = Product.query.get(item['id'])
            if not product:
                continue
            
            qty = item['quantity']
            if product.stock < qty:
                return jsonify({'error': f'Not enough stock for {product.name}'}), 400
            
            product.stock -= qty
            total += product.price * qty
            item_count += qty
        
        # Record Transaction
        tx = Transaction(total=total, item_count=item_count)
        db.session.add(tx)
        db.session.commit()
        
        return jsonify({'success': True, 'id': tx.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-description', methods=['POST'])
@login_required
def generate_description():
    data = request.json
    name = data.get('name')
    category = data.get('category')
    
    client = get_ai_client()
    if not client:
        return jsonify({'description': 'AI API Key not configured.'})

    try:
        prompt = f"Write a short, catchy, 1-sentence description for a university store product.\nProduct: {name}\nCategory: {category}\nKeep it appealing to students."
        
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-70b-8192",
        )
        description = completion.choices[0].message.content.strip()
        return jsonify({'description': description})
    except Exception as e:
        print(f"AI Error: {e}")
        return jsonify({'description': 'Could not generate description.'})

@app.route('/api/analyze-business', methods=['POST'])
@login_required
def analyze_business():
    client = get_ai_client()
    if not client:
        return jsonify({'insight': 'AI API Key not configured.'})

    try:
        # Fetch summary data
        total_rev = db.session.query(db.func.sum(Transaction.total)).scalar() or 0
        tx_count = Transaction.query.count()
        low_stock_items = Product.query.filter(Product.stock < 10).limit(5).all()
        low_stock_names = ", ".join([p.name for p in low_stock_items])

        prompt = f"""
        Analyze this retail data for CampusMart:
        - Total Revenue: ${total_rev:.2f}
        - Total Transactions: {tx_count}
        - Low Stock Items: {low_stock_names or "None"}
        
        Provide a concise (max 3 bullet points) business insight summary focusing on action items for the store manager.
        """

        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-70b-8192",
        )
        insight = completion.choices[0].message.content.strip()
        return jsonify({'insight': insight})
    except Exception as e:
        print(f"AI Error: {e}")
        return jsonify({'insight': 'Analysis unavailable.'})

# -------------------------------------------------------------------------
# Auto-Initialize Database on Startup (For Cloud Deployments)
# -------------------------------------------------------------------------
with app.app_context():
    db.create_all()
    # Create default admin if user table is empty
    if not User.query.first():
        try:
            admin = User(
                username='admin', 
                password=generate_password_hash('password123', method='scrypt'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print(">>> Auto-created admin user.")
        except Exception as e:
            print(f">>> Error creating admin: {e}")

if __name__ == '__main__':
    # Log environment for debugging
    print(f"Starting app with Python {os.sys.version}")
    app.run(host='0.0.0.0', port=5000, debug=True)
