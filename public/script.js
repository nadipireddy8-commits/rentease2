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
        console.log("login response:", data);

        if (res.ok) {
            alert("Login successful");

            // Save token
            localStorage.setItem("token", data.token);

            // FIX: Save as "userId" (capital D) not "userid"
            localStorage.setItem("userId", data.user._id);
            
            // Also save email for display purposes
            localStorage.setItem("userEmail", data.user.email);

            console.log("Saved userId:", data.user._id);
            console.log("Saved token:", data.token);

            // Redirect to products page
            window.location.href = "products.html";
        } else {
            alert(data.message || "Invalid email or password");
        }

    } catch (error) {
        console.error("Login error:", error);
        alert("Server error. Please try again.");
    }
}

// Optional: Add logout function
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    window.location.href = "login.html";
}

// Check login status on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page that requires login
    const currentPage = window.location.pathname.split('/').pop();
    const protectedPages = ['rentals.html', 'cart.html', 'orders.html'];
    
    if (protectedPages.includes(currentPage)) {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        if (!token || !userId) {
            console.log('No token or userId found, redirecting to login');
            window.location.href = 'login.html';
        }
    }
});
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

// LOAD RENTALS
// script.js - Complete corrected file

// scripts/rentals.js

// Wait for DOM to load

// rentals.js content - add this to your rentals.html or in a separate file
document.addEventListener('DOMContentLoaded', function() {
    loadRentals();
});

async function loadRentals() {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    
    console.log("Loading rentals for user:", userId);
    
    const rentalsList = document.getElementById("rentalsList");
    
    if (!userId || !token) {
        rentalsList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p>Please log in to view your rentals.</p>
                <a href="login.html" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login</a>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`/api/rentals?userId=${userId}`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch rentals");
        }

        const rentals = await response.json();
        console.log("Rentals received:", rentals);

        rentalsList.innerHTML = "";

        if (rentals.length === 0) {
            rentalsList.innerHTML = `
                <div style="text-align: center; padding: 40px; background: white; border-radius: 8px;">
                    <p>No active rentals found.</p>
                    <a href="products.html" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">
                        Browse Products
                    </a>
                </div>
            `;
            return;
        }

        rentals.forEach(rental => {
            const rentalDiv = document.createElement('div');
            rentalDiv.style.cssText = `
                background: white;
                padding: 20px;
                margin: 15px 0;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 20px;
            `;
            
            rentalDiv.innerHTML = `
                <img src="${rental.productImage || 'https://via.placeholder.com/100'}" 
                     alt="${rental.productName}" 
                     style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0;">${rental.productName}</h3>
                    <p><strong>Days:</strong> ${rental.days}</p>
                    <p><strong>Total Price:</strong> ₹${rental.totalPrice}</p>
                    <p style="color: #666; font-size: 12px;">Rental ID: ${rental._id}</p>
                </div>
                <button onclick="cancelRental('${rental._id}')" 
                        style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            `;
            
            rentalsList.appendChild(rentalDiv);
        });

    } catch (error) {
        console.error("Error loading rentals:", error);
        rentalsList.innerHTML = `<p style="color: red;">Error loading rentals: ${error.message}</p>`;
    }
}

async function cancelRental(rentalId) {
    if (!confirm("Are you sure you want to cancel this rental?")) return;
    
    const token = localStorage.getItem("token");
    
    try {
        const response = await fetch(`/api/rentals/${rentalId}`, {
            method: 'DELETE',
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        
        if (response.ok) {
            alert("Rental cancelled");
            loadRentals();
        } else {
            alert("Failed to cancel rental");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error cancelling rental");
    }
}


// Cancel rental function
async function cancelRental(rentalId) {
    if (!confirm("Are you sure you want to cancel this rental?")) {
        return;
    }
    
    const token = localStorage.getItem("token");
    
    try {
        const response = await fetch(`/api/rentals/${rentalId}`, {
            method: 'DELETE',
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        
        if (response.ok) {
            alert("Rental cancelled successfully");
            loadRentals(); // Reload the rentals list
        } else {
            const error = await response.json();
            throw new Error(error.message || "Failed to cancel rental");
        }
    } catch (error) {
        console.error("Error cancelling rental:", error);
        alert("Error cancelling rental: " + error.message);
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
