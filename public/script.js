const API_URL = "https://rentease3-backend.onrender.com";
console.log("Script Loaded");

// ===============================
// UTILITY FUNCTIONS
// ===============================
function safeParse(key) {
    const data = localStorage.getItem(key);
    if (!data || data === "undefined") return null;
    return JSON.parse(data);
}

// ===============================
// REGISTER
// ===============================
async function register() {
    const name = document.getElementById("regName")?.value;
    const email = document.getElementById("regEmail")?.value;
    const password = document.getElementById("regPassword")?.value;

    if (!name || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/users/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Registered Successfully!");
            window.location.href = "login.html";
        } else {
            alert(data.message || "Registration failed");
        }
    } catch (error) {
        console.error("Register error:", error);
        alert("Server error. Please try again.");
    }
}

// ===============================
// LOGIN
// ===============================
async function login(event) {
    event.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        console.log("Login response:", data);

        if (res.ok) {
            alert("Login successful");

            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.user?._id || data.userId);
            localStorage.setItem("userEmail", data.user?.email || email);

            console.log("Saved userId:", localStorage.getItem("userId"));
            console.log("Saved token:", localStorage.getItem("token"));

            window.location.href = "products.html";
        } else {
            alert(data.message || "Invalid email or password");
        }

    } catch (error) {
        console.error("Login error:", error);
        alert("Server error. Please try again.");
    }
}

// ===============================
// LOGOUT
// ===============================
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("cart");
    localStorage.removeItem("checkoutItem");
    window.location.href = "login.html";
}

// ===============================
// CHECK LOGIN STATUS
// ===============================
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    const protectedPages = ['rentals.html', 'cart.html', 'orders.html', 'checkout.html'];
    
    if (protectedPages.includes(currentPage)) {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        if (!token || !userId) {
            console.log('No token or userId found, redirecting to login');
            window.location.href = 'login.html';
        }
    }
});

// ===============================
// LOAD ALL RENTALS (ADMIN)
// ===============================
async function loadAllRentals() {
    const token = localStorage.getItem("token");
    const adminDiv = document.getElementById("adminRentals");
    
    if (!adminDiv) return;
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/api/rentals`, {
            headers: { "Authorization": "Bearer " + token }
        });

        const rentals = await res.json();

        if (!Array.isArray(rentals)) return;

        adminDiv.innerHTML = "";

        rentals.forEach(r => {
            adminDiv.innerHTML += `<p>${r._id} - ${r.status || 'Active'}</p>`;
        });

    } catch (err) {
        console.error("Error loading all rentals:", err);
    }
}

// ===============================
// LOAD PRODUCTS
// ===============================
async function loadProducts() {
    const productContainer = document.getElementById("product-list");
    if (!productContainer) return;
    
    try {
        const res = await fetch(`${API_URL}/api/products`);
        const products = await res.json();

        productContainer.innerHTML = "";

        products.forEach(product => {
            productContainer.innerHTML += `
                <div class="card">
                    <img src="${product.image || '/images/placeholder.jpg'}" class="product-img" alt="${product.name}"/>
                    <h3>${product.name}</h3>
                    <p>Category: ${product.category}</p>
                    <p class="rent">Rent: ₹${product.rent || product.price}</p>
                    <button onclick="addToCart('${product._id}')">Add to Cart</button>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

// ===============================
// ADD TO CART
// ===============================
function addToCart(productId) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (!cart.includes(productId)) {
        cart.push(productId);
        localStorage.setItem("cart", JSON.stringify(cart));
    }

    console.log("Cart:", cart);
    alert("Product added to cart!");
}

// ===============================
// LOAD CART
// ===============================
async function loadCart() {
    const cartContainer = document.getElementById("cart-items");
    if (!cartContainer) return;
    
    cartContainer.innerHTML = "";

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (cart.length === 0) {
        cartContainer.innerHTML = "<h3>Your cart is empty</h3>";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/products`);
        const products = await response.json();

        const cartCount = {};
        cart.forEach(id => {
            cartCount[id] = (cartCount[id] || 0) + 1;
        });

        Object.keys(cartCount).forEach(productId => {
            const product = products.find(p => p._id === productId);

            if (product) {
                cartContainer.innerHTML += `
                    <div class="product-card">
                        <img src="${product.image || '/images/placeholder.jpg'}" width="200" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <p>₹${product.rent || product.price}</p>
                        <p>Quantity: ${cartCount[productId]}</p>
                        <button onclick="removeFromCart('${productId}')"
                                style="background:red;color:white;padding:6px 10px;border:none;cursor:pointer;">
                            Remove
                        </button>
                    </div>
                `;
            }
        });

    } catch (error) {
        console.error("Error loading cart:", error);
    }
}

// ===============================
// REMOVE FROM CART
// ===============================
function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const index = cart.indexOf(productId);
    if (index > -1) {
        cart.splice(index, 1);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
}

// ===============================
// LOAD RENTALS (USER)
// ===============================
async function loadRentals() {
    const rentalsList = document.getElementById("rentalsList");
    if (!rentalsList) return;
    
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    
    console.log("Loading rentals for user:", userId);

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
        const response = await fetch(`${API_URL}/api/rentals?userId=${userId}`, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!response.ok) throw new Error("Failed to fetch rentals");

        const rentals = await response.json();
        console.log("Rentals received:", rentals);

        rentalsList.innerHTML = "";

        if (rentals.length === 0) {
            rentalsList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p>No active rentals found.</p>
                    <a href="products.html" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse Products</a>
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
        if (rentalsList) {
            rentalsList.innerHTML = `<p style="color: red;">Error loading rentals: ${error.message}</p>`;
        }
    }
}

// ===============================
// CANCEL RENTAL (SINGLE FUNCTION)
// ===============================
async function cancelRental(rentalId) {
    if (!confirm("Are you sure you want to cancel this rental?")) return;
    
    const token = localStorage.getItem("token");
    
    try {
        const response = await fetch(`${API_URL}/api/rentals/${rentalId}`, {
            method: 'DELETE',
            headers: { "Authorization": "Bearer " + token }
        });
        
        if (response.ok) {
            alert("Rental cancelled successfully");
            loadRentals();
        } else {
            const error = await response.json().catch(() => ({}));
            alert(error.message || "Failed to cancel rental");
        }
    } catch (error) {
        console.error("Error cancelling rental:", error);
        alert("Error cancelling rental: " + error.message);
    }
}

// ===============================
// ADMIN MAINTENANCE
// ===============================
async function loadMaintenance() {
    const token = localStorage.getItem("token");
    const adminDiv = document.getElementById("adminMaintenance");
    
    if (!adminDiv) return;

    if (!token) {
        alert("Login required");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/maintenance`, {
            headers: { "Authorization": "Bearer " + token }
        });

        if (!res.ok) throw new Error("Failed to fetch maintenance");

        const requests = await res.json();

        if (!Array.isArray(requests)) return;

        adminDiv.innerHTML = "";

        requests.forEach(r => {
            adminDiv.innerHTML += `<p>Rental: ${r.rentalId} - Issue: ${r.issue}</p>`;
        });

    } catch (err) {
        console.error("Error loading maintenance:", err);
    }
}

// ===============================
// ADD PRODUCT (ADMIN)
// ===============================
window.addProduct = async function() {
    const name = document.getElementById("pName")?.value;
    const category = document.getElementById("pCategory")?.value;
    const rent = document.getElementById("pRent")?.value;
    const deposit = document.getElementById("pDeposit")?.value;
    const image = document.getElementById("pImage")?.value;

    if (!name || !category || !rent || !deposit) {
        alert("Please fill all required fields");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, category, rent, deposit, image })
        });

        if (res.ok) {
            alert("Product Added Successfully!");
            window.location.href = "index.html";
        } else {
            alert("Error adding product!");
        }
    } catch (error) {
        console.error("Error adding product:", error);
        alert("Server error");
    }
};

// ===============================
// RETURN PRODUCT
// ===============================
window.returnProduct = async function(id) {
    const token = localStorage.getItem("token");
    
    try {
        await fetch(`${API_URL}/api/rentals/return/${id}`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token }
        });

        alert("Product Returned!");
        loadRentals();
    } catch (error) {
        console.error("Error returning product:", error);
    }
};

// ===============================
// CLEAR HISTORY
// ===============================
async function clearHistory() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    if (!confirm("Are you sure you want to clear rental history?")) return;

    try {
        const res = await fetch(`${API_URL}/api/rentals/clear-history`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Failed to clear history");

        alert("History cleared successfully");
        loadRentals();

    } catch (err) {
        console.error("Error clearing history:", err);
        alert("Error clearing history");
    }
}

// ===============================
// CREATE RENTALS FROM CART
// ===============================
async function createRentalsFromCart() {
    const token = localStorage.getItem("token");
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    if (!cart.length) return;

    for (const productId of cart) {
        try {
            await fetch(`${API_URL}/api/rentals`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token
                },
                body: JSON.stringify({
                    productId,
                    days: 7
                })
            });
        } catch (error) {
            console.error("Error creating rental:", error);
        }
    }

    localStorage.removeItem("cart");
}

// ===============================
// AUTO-LOAD FUNCTIONS BASED ON PAGE
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    // Check for success page
    if (window.location.pathname.includes("success.html")) {
        createRentalsFromCart();
    }

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
        createRentalsFromCart();
        loadRentals();
    }
});

// Auto-load based on element existence
if (document.getElementById("product-list")) loadProducts();
if (document.getElementById("cart-items")) loadCart();
if (document.getElementById("adminRentals")) loadAllRentals();
if (document.getElementById("adminMaintenance")) loadMaintenance();
if (document.getElementById("rentalsList")) loadRentals();