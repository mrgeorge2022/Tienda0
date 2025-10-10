// =======================
// 🍕 SCRIPT PRINCIPAL
// =======================

// URL de tu Google Apps Script
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxE5905w07prM6Om7B972nZilOZOEi_IUgX2Cixf98F9t-U8A9ClVxq5pyRjXAt5Zg/exec";

// Variables globales
let products = [];
let cart = [];
let isOpen = false;
let currentProduct = null;
let modalQuantity = 1;

// 🕒 --- Horarios por día ---
const BUSINESS_HOURS = {
  0: { open: 0, close: 24 },
  1: { open: 0, close: 24 },
  2: { open: 0, close: 24 },
  3: { open: 0, close: 24 },
  4: { open: 0, close: 24 },
  5: { open: 0, close: 24 },
  6: { open: 0, close: 24 },
};


// DOM Elements
const skeletonLoadingEl = document.getElementById("skeleton-loading");
const errorEl = document.getElementById("error-message");
const categoryBtns = document.querySelectorAll(".category-btn");
const cartFloatEl = document.getElementById("cart-float");
const cartModalEl = document.getElementById("cart-modal");
const productModalEl = document.getElementById("product-modal");

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  loadProducts();
  checkBusinessHours();
  setInterval(checkBusinessHours, 60000);
});

// ✅ Verifica si la tienda está abierta
function checkBusinessHours() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const schedule = BUSINESS_HOURS[currentDay];

  if (!schedule) {
    isOpen = false;
  } else {
    // Manejar rangos normales y rangos que cruzan la medianoche
    const open = Number(schedule.open);
    const close = Number(schedule.close);
    if (isNaN(open) || isNaN(close)) {
      isOpen = false;
    } else if (close > open) {
      // ejemplo: open 11, close 22
      isOpen = currentHour >= open && currentHour < close;
    } else if (close === open) {
      // mismo valor -> cerrado todo el día
      isOpen = false;
    } else {
      // close < open => horario que cruza medianoche, ejemplo open 18, close 2
      isOpen = currentHour >= open || currentHour < close;
    }
  }

  updateBusinessHoursDisplay();
  updateProductButtons();
}

// ✅ Muestra el estado actual
function updateBusinessHoursDisplay() {
  const now = new Date();
  const currentDay = now.getDay();
  const schedule = BUSINESS_HOURS[currentDay];
  const statusLine1 = document.getElementById("status-line1");
  const statusLine2 = document.getElementById("status-line2");

  if (!statusLine1 || !statusLine2) return;

  if (!schedule) {
    statusLine1.textContent = "La tienda está cerrada hoy.";
    statusLine1.style.color = "#e53e3e";
    statusLine2.textContent = "Abrimos mañana.";
    return;
  }

  if (isOpen) {
    // Calcular minutos restantes hasta el cierre, considerando overnight
    const nowDecimal = now.getHours() + now.getMinutes() / 60;
    const open = Number(schedule.open);
    const close = Number(schedule.close);

    let minutesToClose;
    if (close > open) {
      minutesToClose = Math.round((close - nowDecimal) * 60);
    } else {
      // close < open (overnight). Si ahora >= open contamos hasta (24 - now) + close
      if (nowDecimal >= open) {
        minutesToClose = Math.round((24 - nowDecimal + close) * 60);
      } else {
        // ahora antes de close (en la madrugada)
        minutesToClose = Math.round((close - nowDecimal) * 60);
      }
    }

    const hours = Math.floor(minutesToClose / 60);
    const mins = minutesToClose % 60;
    statusLine1.textContent = "¡La tienda está abierta!";
    statusLine1.style.color = "#48bb78";
    statusLine2.textContent = `Cierra en ${hours > 0 ? `${hours}h ` : ""}${mins}min.`;
  } else {
    let nextDay = currentDay;
    for (let i = 1; i <= 7; i++) {
      const d = (currentDay + i) % 7;
      if (BUSINESS_HOURS[d]) {
        nextDay = d;
        break;
      }
    }

    const nextSchedule = BUSINESS_HOURS[nextDay];
    statusLine1.textContent = "La tienda está cerrada.";
    statusLine1.style.color = "#e53e3e";
    if (!nextSchedule) {
      statusLine2.textContent = "No hay horario disponible próximamente.";
    } else {
      statusLine2.textContent = `Abre ${
        nextDay === currentDay ? "hoy" : `el ${getDayName(nextDay)}`
      } a las ${formatHour(nextSchedule.open)}.`;
    }
  }
}

function getDayName(dayIndex) {
  const days = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  return days[dayIndex];
}

function formatHour(hourDecimal) {
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ✅ Actualiza botones de productos
function updateProductButtons() {
  const addButtons = document.querySelectorAll(".add-button");
  addButtons.forEach((btn) => {
    // El botón + es solo visual: siempre muestra '+' y solo se aplica la clase
    // 'inactive' para estilos cuando el local está cerrado.
    if (isOpen) {
      btn.classList.remove("inactive");
    } else {
      btn.classList.add("inactive");
    }
    // Asegurar símbolo visual
    btn.textContent = "+";
  });
}

// Load products from Google Sheets
async function loadProducts() {
  try {
    showLoading(true);
    const response = await fetch(APPS_SCRIPT_URL);
    const data = await response.json();
    products = data;
    showLoading(false);
    renderProducts();
  } catch (err) {
    console.error(err);
    showLoading(false);
    errorEl.style.display = "block";
  }
}

// Render products by sections
function renderProducts() {
  const categories = ["comida", "pizzas", "almuerzos", "bebidas", "postres"];

  categories.forEach((category) => {
    const grid = document.getElementById(`${category}-grid`);
    if (!grid) return;

    const filteredProducts = products.filter(
      (product) => product.categoria.toLowerCase() === category
    );

    grid.innerHTML = "";

    if (filteredProducts.length === 0) {
      grid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #718096;">
                            No hay productos en esta sección
                        </div>
                    `;
      return;
    }

    filteredProducts.forEach((product) => {
      const productCard = createProductCard(product);
      grid.appendChild(productCard);
    });
  });
}

// Create product card element
function createProductCard(product) {
  const card = document.createElement("div");
  card.className = `product-card ${!product.activo ? "inactive" : ""}`;

  const imageContent = product.imagen
    ? `<img src="${product.imagen}" alt="${product.nombre}" onerror="this.style.display='none'; this.parentElement.innerHTML='🍽️';">`
    : getCategoryEmoji(product.categoria);

  const descripcionValue =
    product.descripcion ||
    product.Descripcion ||
    product.DESCRIPCION ||
    product.descripción;

  const description =
    descripcionValue &&
    descripcionValue.toString().trim() !== "" &&
    descripcionValue !== "undefined"
      ? `<div class="product-description">${descripcionValue}</div>`
      : '<div class="product-description" style="color: red; font-size: 0.8rem;">Sin descripción disponible</div>';

  // 🔹 Siempre mostramos el botón “+” (sin clase inactive)
  card.innerHTML = `
        <div class="product-image">
            ${imageContent}
            ${
              !product.activo
                ? '<div class="unavailable-overlay">Agotado</div>'
                : ""
            }
        </div>
        <div class="product-info">
            <div class="product-name">${product.nombre}</div>
            ${description}
            <div class="product-price">${formatPrice(product.precio)}</div>
        </div>
    <div class="add-button">+</div>
        <div class="product-actions">
            <div class="closed-message" style="display: none;">
                <span id="closed-msg-${product.id}">Cerrado</span>
            </div>
        </div>
    `;

  // 🔥 Control inteligente del clic:
  card.addEventListener("click", () => {
    if (!product.activo) {
      alert("⚠️ Este producto está agotado temporalmente.");
      return;
    }

    if (!isOpen) {
      const now = new Date();
      const currentDay = now.getDay();
      const schedule = BUSINESS_HOURS[currentDay];

      if (!schedule) {
        // 🛑 Día completamente cerrado
        alert("🚪 La tienda está cerrada hoy.");
      } else {
        // ⏰ Fuera de horario
        const abre = formatHour(schedule.open);
        const cierra = formatHour(schedule.close);
        alert(
          `⏰ Estamos fuera de horario.\nTe invitamos a ver nuestro horario`
        );
      }
      return;
    }

    // ✅ Si la tienda está abierta y el producto activo → abre el modal
    openProductModal(product);
  });

  return card;
}

// Get emoji based on category
function getCategoryEmoji(categoria) {
  const emojis = {
    comida: "🍽️",
    bebida: "🥤",
    bebidas: "🥤",
    postres: "🍰",
    pizzas: "🍕",
    almuerzos: "🍛",
  };
  return emojis[categoria.toLowerCase()] || "🍽️";
}

// Format price in Colombian pesos
function formatPrice(price) {
  const numPrice = parseFloat(price);
  return (
    "$ " +
    numPrice.toLocaleString("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

// Product Modal Functions
function openProductModal(product) {
  if (!isOpen) {
    const now = new Date();
    const currentDay = now.getDay();

    if (currentDay === CLOSED_DAY) {
      alert(
        "Lo sentimos, estamos cerrados los miércoles. Abrimos mañana a las 11:00 AM"
      );
    } else {
      const timeToOpen = getTimeToOpen();
      alert(`Lo sentimos, estamos cerrados. Abrimos en: ${timeToOpen}`);
    }
    return;
  }

  if (!product.activo) {
    alert("Este producto está agotado temporalmente");
    return;
  }

  currentProduct = product;
  modalQuantity = 1;

  // Update modal content
  document.getElementById("modal-product-name").textContent = product.nombre;
  document.getElementById("modal-product-price").textContent = formatPrice(
    product.precio
  );

  const descripcionValue =
    product.descripcion ||
    product.Descripcion ||
    product.DESCRIPCION ||
    product.descripción;
  const description =
    descripcionValue &&
    descripcionValue.toString().trim() !== "" &&
    descripcionValue !== "undefined"
      ? descripcionValue
      : "Sin descripción disponible";
  document.getElementById("modal-product-description").textContent =
    description;

  // Update modal image
  const modalImage = document.getElementById("modal-product-image");
  if (product.imagen) {
    modalImage.innerHTML = `<img src="${product.imagen}" alt="${
      product.nombre
    }" onerror="this.style.display='none'; this.parentElement.innerHTML='${getCategoryEmoji(
      product.categoria
    )}';">`;
  } else {
    modalImage.innerHTML = getCategoryEmoji(product.categoria);
  }

  // Reset form
  document.getElementById("product-instructions").value = "";
  document.getElementById("modal-quantity").textContent = modalQuantity;
  updateQuantityButtons();

  // 🔥 --- NUEVO BLOQUE AGREGADO: configuración especial para pizzas o almuerzos ---
  const extraOptionsContainer = document.getElementById("extra-options");
  if (extraOptionsContainer) extraOptionsContainer.remove(); // limpiar si ya existe

  // Usamos el contenedor correcto del modal
  // Insertar justo antes del botón "Agregar al carrito"
  const modalBody = document.querySelector("#add-to-cart-modal").parentElement;
  const insertBeforeEl = document.querySelector(".quantity-section");

  if (product.config) {
    const configType = product.config.toLowerCase().trim();

    // 🍕 Configuración especial para pizzas
    if (configType === "manualpizza") {
      const pizzaOptions = document.createElement("div");
      pizzaOptions.id = "extra-options";
      pizzaOptions.innerHTML = `
        <hr style="margin: 15px 0;">
        <h4 style="margin-bottom: 8px;">🍕 Personaliza tu pizza</h4>

        <label style="font-weight: bold;">Tamaño:</label>
        <div id="pizza-size" style="margin-bottom: 10px;">
            <label><input type="checkbox" value="Personal"> Personal</label><br>
            <label><input type="checkbox" value="Mediana"> Mediana</label><br>
            <label><input type="checkbox" value="Grande"> Grande</label><br>
        </div>

        <label style="font-weight: bold;">Ingredientes:</label>
        <div id="pizza-ingredients" style="margin-bottom: 10px;">
            <label><input type="checkbox" value="Peperoni"> Peperoni</label><br>
            <label><input type="checkbox" value="Extra queso"> Extra queso</label><br>
            <label><input type="checkbox" value="Champiñones"> Champiñones</label><br>
            <label><input type="checkbox" value="Tocineta"> Tocineta</label><br>
        </div>

        <label for="pizza-extra" style="font-weight: bold;">Notas u opciones adicionales:</label>
        <textarea id="pizza-extra" placeholder="Ejemplo: mitad hawaiana, mitad mexicana" style="width: 100%; height: 60px; margin-top: 5px;"></textarea>
    `;
      modalBody.insertBefore(pizzaOptions, insertBeforeEl);
    } else if (configType === "manualalmuerzo") {
      const almuerzoOptions = document.createElement("div");
      almuerzoOptions.id = "extra-options";
      almuerzoOptions.innerHTML = `
        <hr style="margin: 15px 0;">
        <h4 style="margin-bottom: 8px;">🍛 Personaliza tu almuerzo</h4>

        <label style="font-weight: bold;">Proteína:</label>
        <div id="almuerzo-proteina" style="margin-bottom: 10px;">
            <label><input type="checkbox" value="Pollo asado"> Pollo asado</label><br>
            <label><input type="checkbox" value="Carne de res"> Carne de res</label><br>
            <label><input type="checkbox" value="Cerdo"> Cerdo</label><br>
            <label><input type="checkbox" value="Pescado"> Pescado</label><br>
        </div>

        <label style="font-weight: bold;">Acompañamiento:</label>
        <div id="almuerzo-acompanamiento" style="margin-bottom: 10px;">
            <label><input type="checkbox" value="Arroz blanco"> Arroz blanco</label><br>
            <label><input type="checkbox" value="Arroz con coco"> Arroz con coco</label><br>
            <label><input type="checkbox" value="Puré de papa"> Puré de papa</label><br>
            <label><input type="checkbox" value="Patacones"> Patacones</label><br>
        </div>

        <label style="font-weight: bold;">Bebida:</label>
        <div id="almuerzo-bebida" style="margin-bottom: 10px;">
            <label><input type="checkbox" value="Jugo natural"> Jugo natural</label><br>
            <label><input type="checkbox" value="Gaseosa"> Gaseosa</label><br>
            <label><input type="checkbox" value="Agua"> Agua</label><br>
        </div>

        <label for="almuerzo-extra" style="font-weight: bold;">Notas u observaciones:</label>
        <textarea id="almuerzo-extra" placeholder="Ejemplo: sin cebolla, jugo sin azúcar" style="width: 100%; height: 60px; margin-top: 5px;"></textarea>
    `;
      modalBody.insertBefore(almuerzoOptions, insertBeforeEl);
    }
  }
  // 🔥 --- FIN DEL BLOQUE NUEVO ---

  // Show modal
  productModalEl.classList.add("show");
}

function closeProductModal() {
  productModalEl.classList.remove("show");
  currentProduct = null;
  modalQuantity = 1;
}

function increaseQuantity() {
  modalQuantity++;
  document.getElementById("modal-quantity").textContent = modalQuantity;
  updateQuantityButtons();
}

function decreaseQuantity() {
  if (modalQuantity > 1) {
    modalQuantity--;
    document.getElementById("modal-quantity").textContent = modalQuantity;
    updateQuantityButtons();
  }
}

function updateQuantityButtons() {
  const decreaseBtn = document.getElementById("decrease-btn");
  decreaseBtn.disabled = modalQuantity <= 1;
}

function addToCartFromModal() {
  if (!currentProduct || !isOpen) return;

  // --- CAPTURAR OPCIONES DE PIZZA Y ALMUERZO ---
  let extraInstructions = "";

  if (currentProduct.config) {
    const configType = currentProduct.config.toLowerCase().trim();

    if (configType === "manualpizza") {
      const sizes = Array.from(
        document.querySelectorAll('#pizza-size input[type="checkbox"]:checked')
      ).map((i) => i.value);
      const ingredients = Array.from(
        document.querySelectorAll(
          '#pizza-ingredients input[type="checkbox"]:checked'
        )
      ).map((i) => i.value);
      const notes = document.getElementById("pizza-extra")?.value.trim();

      if (sizes.length > 0) extraInstructions += `Tamaño: ${sizes.join(", ")}`;
      if (ingredients.length > 0)
        extraInstructions += `${
          extraInstructions ? " | " : ""
        }Ingredientes: ${ingredients.join(", ")}`;
      if (notes)
        extraInstructions += `${extraInstructions ? " | " : ""}Notas: ${notes}`;
    }

    if (configType === "manualalmuerzo") {
      const proteinas = Array.from(
        document.querySelectorAll(
          '#almuerzo-proteina input[type="checkbox"]:checked'
        )
      ).map((i) => i.value);
      const acomp = Array.from(
        document.querySelectorAll(
          '#almuerzo-acompanamiento input[type="checkbox"]:checked'
        )
      ).map((i) => i.value);
      const bebidas = Array.from(
        document.querySelectorAll(
          '#almuerzo-bebida input[type="checkbox"]:checked'
        )
      ).map((i) => i.value);
      const extra = document.getElementById("almuerzo-extra")?.value.trim();

      if (proteinas.length > 0)
        extraInstructions += `Proteína: ${proteinas.join(", ")}`;
      if (acomp.length > 0)
        extraInstructions += `${
          extraInstructions ? " | " : ""
        }Acompañamiento: ${acomp.join(", ")}`;
      if (bebidas.length > 0)
        extraInstructions += `${
          extraInstructions ? " | " : ""
        }Bebida: ${bebidas.join(", ")}`;
      if (extra)
        extraInstructions += `${extraInstructions ? " | " : ""}Notas: ${extra}`;
    }
  }
  // --- FIN CAPTURA ---

  const instructions = [
    document.getElementById("product-instructions").value.trim(),
    extraInstructions,
  ]
    .filter(Boolean)
    .join(" | ");

  // Create unique ID for items with instructions
  const itemId = instructions
    ? `${currentProduct.id}_${Date.now()}`
    : currentProduct.id;

  const existingItem = cart.find(
    (item) =>
      item.id === currentProduct.id && item.instructions === instructions
  );

  if (existingItem && !instructions) {
    // If no instructions and item exists, just increase quantity
    existingItem.quantity += modalQuantity;
  } else {
    // Add new item or item with different instructions
    cart.push({
      id: itemId,
      originalId: currentProduct.id,
      name: currentProduct.nombre,
      price: parseFloat(currentProduct.precio),
      quantity: modalQuantity,
      instructions: instructions,
    });
  }

  updateCartDisplay();

  // Show success feedback
  const button = document.getElementById("add-to-cart-modal");
  const originalText = button.textContent;
  button.textContent = "¡Agregado!";
  button.style.background = "#48bb78";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "";
    closeProductModal();
  }, 1000);
}

// Cart functions
function addToCart(productId) {
  // This function is now used only for quantity adjustments in cart
  const product = products.find(
    (p) => p.id === productId || p.id === productId.split("_")[0]
  );
  if (!product || !product.activo) return;

  const existingItem = cart.find(
    (item) => item.id === productId || item.originalId === productId
  );

  if (existingItem) {
    existingItem.quantity += 1;
    updateCartDisplay();
    renderCartItems();
  }
}

function removeFromCart(productId) {
  const itemIndex = cart.findIndex((item) => item.id === productId);
  if (itemIndex > -1) {
    if (cart[itemIndex].quantity > 1) {
      cart[itemIndex].quantity -= 1;
    } else {
      cart.splice(itemIndex, 1);
    }
    updateCartDisplay();
    renderCartItems();
  }
}

function updateCartDisplay() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  document.getElementById("cart-count").textContent = `${totalItems} producto${
    totalItems !== 1 ? "s" : ""
  }`;
  document.getElementById("cart-total").textContent = formatPrice(totalPrice);
  document.getElementById(
    "cart-total-modal"
  ).textContent = `Total: ${formatPrice(totalPrice)}`;

  if (totalItems > 0) {
    cartFloatEl.classList.add("show");
  } else {
    cartFloatEl.classList.remove("show");
  }
}

function openCart() {
  cartModalEl.classList.add("show");
  renderCartItems();
}

function closeCart() {
  cartModalEl.classList.remove("show");
}

function renderCartItems() {
  const cartItemsEl = document.getElementById("cart-items");

  if (cart.length === 0) {
    cartItemsEl.innerHTML =
      '<p style="text-align: center; color: #718096; padding: 20px;">Tu carrito está vacío</p>';
    return;
  }

  cartItemsEl.innerHTML = cart
    .map(
      (item) => `
                <div class="cart-item">
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        ${
                          item.instructions
                            ? `<div style="font-size: 0.8rem; color: #718096; font-style: italic; margin-top: 2px;">${item.instructions}</div>`
                            : ""
                        }
                        <div class="item-price">${formatPrice(
                          item.price
                        )} c/u</div>
                    </div>
                    <div class="item-controls">
                        <button class="quantity-btn" onclick="removeFromCart('${
                          item.id
                        }')">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="addToCart('${
                          item.id
                        }')">+</button>
                    </div>
                </div>
            `
    )
    .join("");
}

function clearCart() {
  if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
    cart = [];
    updateCartDisplay();
    renderCartItems();
  }
}

function checkout() {
  if (cart.length === 0) {
    alert("Tu carrito está vacío");
    return;
  }

  if (!isOpen) {
    const now = new Date();
    const currentDay = now.getDay();

    if (currentDay === CLOSED_DAY) {
      alert(
        "Lo sentimos, estamos cerrados los miércoles. Abrimos mañana a las 11:00 AM"
      );
    } else {
      const timeToOpen = getTimeToOpen();
      alert(`Lo sentimos, estamos cerrados. Abrimos en: ${timeToOpen}`);
    }
    return;
  }

  const orderSummary = cart
    .map(
      (item) =>
        `${item.quantity}x ${item.name} - ${formatPrice(
          item.price * item.quantity
        )}`
    )
    .join("\n");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const message = `🍽️ *Nuevo Pedido*\n\n${orderSummary}\n\n*Total: ${formatPrice(
    total
  )}*`;

  // Here you would typically send the order to your system
  alert(
    `Pedido confirmado:\n\n${orderSummary}\n\nTotal: ${formatPrice(
      total
    )}\n\n¡Gracias por tu pedido!`
  );

  // Clear cart after successful order
  cart = [];
  updateCartDisplay();
  closeCart();
}

// Scroll to section function
function scrollToSection(sectionId) {
  categoryBtns.forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  if (sectionId === "todos") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  }
}

// Show/hide loading state
function showLoading(show) {
  skeletonLoadingEl.style.display = show ? "grid" : "none";
  document.querySelector(".menu-sections").style.display = show
    ? "none"
    : "block";
}

// Show error message
function showError() {
  errorEl.style.display = "block";
}

// Hide error message
function hideError() {
  errorEl.style.display = "none";
}

// Close modals when clicking outside
cartModalEl.addEventListener("click", function (e) {
  if (e.target === cartModalEl) {
    closeCart();
  }
});

productModalEl.addEventListener("click", function (e) {
  if (e.target === productModalEl) {
    closeProductModal();
  }
});
