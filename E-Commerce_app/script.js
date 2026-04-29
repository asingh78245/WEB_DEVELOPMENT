const products = [
  { id: 1, name: "Wireless Headphones", price: 1499, desc: "Noise-cancelling, 30hr battery.",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80" },
  { id: 2, name: "Mechanical Keyboard",  price: 2999, desc: "RGB backlit, tactile switches.",
    img: "https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=400&q=80" },
  { id: 3, name: "USB-C Hub",            price: 899,  desc: "7-in-1 multiport adapter.",
    img: "https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400&q=80" },
  { id: 4, name: "Laptop Stand",         price: 699,  desc: "Ergonomic aluminium build.",
    img: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80" },
  { id: 5, name: "Webcam HD 1080p",      price: 1199, desc: "Auto-focus, built-in mic.",
    img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80" },
  { id: 6, name: "Smart Watch",          price: 3499, desc: "Health tracking, GPS, AMOLED.",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80" },
];

let cart = {}; 

function renderProducts() {
  const container = document.getElementById('products');
  container.innerHTML = products.map(p => `
    <div class="card">
      <img src="${p.img}" alt="${p.name}">
      <div class="card-body">
        <h4>${p.name}</h4>
        <p>${p.desc}</p>
        <div class="price">₹${p.price}</div>
        <button onclick="addToCart(${p.id})">Add to Cart</button>
      </div>
    </div>`).join('');
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
}

function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

function removeItem(id) {
  delete cart[id];
  renderCart();
}

function renderCart() {
  const totalQty = Object.values(cart).reduce((s, q) => s + q, 0);
  document.getElementById('cart-count').textContent = totalQty;

  const itemsDiv = document.getElementById('cart-items');
  const entries = Object.entries(cart);

  if (!entries.length) {
    itemsDiv.innerHTML = '<p class="empty-msg">No items yet.</p>';
    document.getElementById('total').textContent = 0;
    return;
  }

  let total = 0;
  itemsDiv.innerHTML = entries.map(([id, qty]) => {
    const p = products.find(x => x.id == id);
    const sub = p.price * qty;
    total += sub;
    return `
      <div class="cart-item">
        <span>${p.name}</span>
        <div class="qty-ctrl">
          <button onclick="changeQty(${id}, -1)">−</button>
          <span>${qty}</span>
          <button onclick="changeQty(${id}, +1)">+</button>
          <button class="rm" onclick="removeItem(${id})">✕</button>
        </div>
      </div>
      <div style="font-size:.8rem;color:#888;text-align:right;padding-bottom:6px;">₹${sub}</div>`;
  }).join('');

  document.getElementById('total').textContent = total;
}

function toggleCart() {
  document.getElementById('cart').classList.toggle('open');
  document.getElementById('overlay').style.display =
    document.getElementById('cart').classList.contains('open') ? 'block' : 'none';
}

function checkout() {
  if (!Object.keys(cart).length) return alert('Your cart is empty!');
  toggleCart();
  document.getElementById('modal').classList.add('active');
  document.getElementById('confirm-msg').textContent = '';
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

function placeOrder() {
  const name = document.getElementById('cust-name').value.trim();
  const addr = document.getElementById('cust-addr').value.trim();
  if (!name || !addr) return alert('Please fill in all fields.');
  document.getElementById('confirm-msg').textContent =
    `✅ Order placed! Thank you, ${name}. We'll deliver to: ${addr}`;
  cart = {};
  renderCart();
  setTimeout(closeModal, 2500);
}

renderProducts();
