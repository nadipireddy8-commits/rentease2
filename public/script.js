console.log("Script Loded");
// REGISTER
function safeParse(key) {
  const data = localStorage.getItem(key);
  if (!data || data === "undefined") return null;
  return JSON.parse(data);
}

async function register() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (res.ok) {
        alert("Registered Successfully!");
        window.location.href = "login.html";
    } else {
        alert(data.message);
    }
}

// LOGIN
console.log("Script loaded");

async function login(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const res = await fetch("/api/users/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Login successful");

            // Save token
            localStorage.setItem("token", data.token);

            // Redirect
            window.location.href = "products.html";
        } else {
            alert(data.message || "Invalid email or password");
        }

    } catch (error) {
        alert("Server error");
    }
}
async function loadAllRentals() {

    const token = localStorage.getItem("token");

    if (!token) return;

    try {
        const res = await fetch("/api/rentals", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const rentals = await res.json();

        if (!Array.isArray(rentals)) return;

        const div = document.getElementById("adminRentals");
        div.innerHTML = "";

        rentals.forEach(r => {
            div.innerHTML += `<p>${r._id} - ${r.status}</p>`;
        });

    } catch (err) {
        console.error(err);
    }
}
// LOAD PRODUCTS WITH FILTER
// Load products
async function loadProducts() {
  const res = await fetch("/api/products");
  const products = await res.json();

  const container = document.getElementById("product-list");
  container.innerHTML = "";

  products.forEach(product => {
    container.innerHTML += `
      <div class="card">
        <img src="${product.image}" class="product-img"/>
        <h3>${product.name}</h3>
        <p>Category: ${product.category}</p>
        <p class="rent">Rent: ₹${product.price}</p>
        <button onclick="addToCart('${product._id}')">
          Add to Cart
        </button>
      </div>
    `;
  });
}






// ===============================
// ADD TO CART
// ===============================
function addToCart(productId) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Avoid duplicates
  if (!cart.includes(productId)) {
    cart.push(productId);
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  console.log("Cart after adding:", localStorage.getItem("cart"));
  alert("Product added to cart!");
}

// ===============================
// LOAD CART
// ===============================


async function loadCart() {
    const cartContainer = document.getElementById("cart-items");
    if(!cartContainer)return;
    cartContainer.innerHTML = "";

    

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (cart.length === 0) {
        cartContainer.innerHTML = "<h3>Your cart is empty</h3>";
        return;
    }

    try {
        const response = await fetch("/api/products");
        const products = await response.json();

        // count quantities
        const cartCount = {};
        cart.forEach(id => {
            cartCount[id] = (cartCount[id] || 0) + 1;
        });

        Object.keys(cartCount).forEach(productId => {
            const product = products.find(p => p._id === productId);

            if (product) {
                cartContainer.innerHTML += `
                    <div class="product-card">
                        <img src="${product.image}" width="200">
                        <h3>${product.name}</h3>
                        <p>₹${product.rent}</p>
                        <p>Quantity: ${cartCount[productId]}</p>
                        <button onclick="removeFromCart('${productId}')"
                                style="background:red;color:white;padding:6px 10px;border:none;cursor:pointer;">
                            Delete
                        </button>
                    </div>
                `;
            }
        });

    } catch (error) {
        console.error("Error loading cart:", error);
    }
}

function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const index = cart.indexOf(productId);
    if (index > -1) {
        cart.splice(index, 1);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
}

loadCart();


// ===============================
// CHECKOUT
// ===============================
async function checkout() {
    const token = localStorage.getItem("token");
    const cartIds = JSON.parse(localStorage.getItem("cart")) || [];

    if (!token) {
        alert("Please login first");
        return;
    }

    if (cartIds.length === 0) {
        alert("Cart is empty");
        return;
    }

    try {
        // Get full product details
        const response = await fetch("/api/products");
        const products = await response.json();

        // Convert cart IDs into proper cartItems structure
        const cartItems = [];

        cartIds.forEach(id => {
            const product = products.find(p => p._id === id);
            if (product) {
                cartItems.push({
                    _id: product._id,
                    name: product.name,
                    price: product.rent,   // IMPORTANT: you are using rent field
                    quantity: 1
                });
            }
        });

        const res = await fetch("/api/payments/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ cartItems })
        });

        const data = await res.json();

        if (res.ok && data.id) {
            const stripe = Stripe("pk_test_51T1VYnEl5zU5gb2fLCMzHZS2PV71rZFiXORD2i89E9v4qPemWAvOhRoxE9U0MZrtWgtesUNOPJ1lmvR1Gh78Nug000Gj0MEM7M"); 
            await stripe.redirectToCheckout({ sessionId: data.id });
        } else {
            console.log(data);
            alert(data.message || "Payment failed");
        }

    } catch (error) {
        console.error("Checkout error:", error);
        alert("Something went wrong");
    }
}
// LOAD RENTALS
async function loadRentals() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("/api/rentals", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        // If unauthorized
        if (!res.ok) {
            if (res.status === 401) {
                alert("Session expired. Please login again.");
                localStorage.removeItem("token");
                window.location.href = "login.html";
                return;
            }
            throw new Error("Failed to fetch rentals");
        }

        const rentals = await res.json();
        console.log("Rentals recieved:",rentals);

        // Make sure it's an array
        if (!Array.isArray(rentals)) {
            console.error("Invalid rentals response:", rentals);
            return;
        }

        const activeDiv = document.getElementById("activeRentals");
        const historyDiv = document.getElementById("rentalHistory");

        if (!activeDiv || !historyDiv) return;

        activeDiv.innerHTML = "";
        historyDiv.innerHTML = "";

        rentals.forEach(rental => {
            const card = document.createElement("div");
            card.className = "card";

            if (rental.status.toLowerCase() === "Active") {

                card.innerHTML = `
                    <p><strong>Rental ID:</strong> ${rental._id}</p>
                    <p><strong>Status:</strong> ${rental.status}</p>
                    <button onclick="returnProduct('${rental._id}')">
                        Return
                    </button>
                `;

                activeDiv.appendChild(card);

            } else {

                card.innerHTML = `
                    <p><strong>Rental ID:</strong> ${rental._id}</p>
                    <p><strong>Status:</strong> ${rental.status}</p>
                    <p><strong>Returned On:</strong> ${
                        rental.returnDate
                            ? new Date(rental.returnDate).toDateString()
                            : "N/A"
                    }</p>
                `;

                historyDiv.appendChild(card);
            }
        });

    } catch (error) {
        console.error("Error loading rentals:", error);
        alert("Could not load rentals.");
    }
}

async function loadAllRentals() {

    const token = localStorage.getItem("token");

    if (!token) return;

    try {
        const res = await fetch("/api/rentals", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const rentals = await res.json();

        if (!Array.isArray(rentals)) return;

        const div = document.getElementById("adminRentals");
        div.innerHTML = "";

        rentals.forEach(r => {
            div.innerHTML += `<p>${r._id} - ${r.status}</p>`;
        });

    } catch (err) {
        console.error(err);
    }
}

// ADMIN VIEW MAINTENANCE
async function loadMaintenance() {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Login required");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("/api/maintenance", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!res.ok) {
            throw new Error("Failed to fetch maintenance");
        }

        const requests = await res.json();

        if (!Array.isArray(requests)) {
            console.error("Invalid response:", requests);
            return;
        }

        const div = document.getElementById("adminMaintenance");
        div.innerHTML = "";

        requests.forEach(r => {
            div.innerHTML += `
                <p>Rental: ${r.rentalId} - Issue: ${r.issue}</p>
            `;
        });

    } catch (err) {
        console.error(err);
        alert("Error loading maintenance");
    }
}

// AUTO LOAD
if (document.getElementById("product-list")) loadProducts();
if (document.getElementById("cartItems")) loadCart();
if (document.getElementById("activeRentals")) loadRentals();
if (document.getElementById("adminRentals")) loadAllRentals();
if (document.getElementById("adminMaintenance")) loadMaintenance();

window.addProduct = async function () {
  const name = document.getElementById("pName").value;
  const category = document.getElementById("pCategory").value;
  const rent = document.getElementById("pRent").value;
  const deposit = document.getElementById("pDeposit").value;
  const image = document.getElementById("pImage").value;

  const res = await fetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      category,
      rent,
      deposit,
      image
    })
  });

  if (res.ok) {
    alert("Product Added Successfully!");
    window.location.href = "index.html"; // go to homepage
  } else {
    alert("Error adding product!");
  }
};

window.returnProduct = async function(id) {
  await fetch(`/api/rentals/return/${id}`, {
  method: "PUT",
  headers: {
    "Authorization": localStorage.getItem("token")
  }
  });

  alert("Product Returned!");
  loadRentals();
};
async function clearHistory() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    if (!confirm("Are you sure you want to clear rental history?")) {
        return;
    }

    try {
        const res = await fetch("/api/rentals/clear-history", {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            throw new Error("Failed to clear history");
        }

        alert("History cleared successfully");
        loadRentals();

    } catch (err) {
        console.error(err);
        alert("Error clearing history");
    }
}

window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);

  if (params.get("success") === "true") {
    await createRentalsFromCart();
  }

  loadRentals();
});
async function createRentalsFromCart() {
  const token = localStorage.getItem("token");
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (!cart.length) return;

  for (const productId of cart) {
    await fetch("/api/rentals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        productId,
        tenure: 7   // fixed 7 days for now
      })
    });
  }

  localStorage.removeItem("cart");
}
// Runs only on success page
window.addEventListener("DOMContentLoaded", async () => {
  if (window.location.pathname.includes("success.html")) {
    await createRentalsFromCart();
  }
});
