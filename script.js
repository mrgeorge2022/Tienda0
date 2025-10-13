// =======================
// 🍕 SCRIPT PRINCIPAL
// =======================

// URL de tu Google Apps Script
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxE5905w07prM6Om7B972nZilOZOEi_IUgX2Cixf98F9t-U8A9ClVxq5pyRjXAt5Zg/exec";

// Variables globales
let products = [];
let cart = [];
let currentProduct = null;
let modalQuantity = 1;


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
});

// Nota: la lógica de horario fue eliminada; la tienda siempre permite interacción local



// ✅ Actualiza botones de productos
function updateProductButtons() {
  const addButtons = document.querySelectorAll(".add-button");
  addButtons.forEach((btn) => {
    // El botón + es solo visual: siempre muestra '+' y solo se aplica la clase
    // 'inactive' para estilos cuando el local está cerrado.
    // Mantener siempre habilitado visualmente; la disponibilidad real viene de product.activo
    btn.classList.remove("inactive");
    // Asegurar símbolo visual
    btn.textContent = "+";
  });
}

// Load products from Google Sheets
async function loadProducts() {
  try {
    showLoading(true);
    // Pedimos explícitamente la hoja Productos para evitar confusiones con otras hojas
    const url = `${APPS_SCRIPT_URL}?sheet=Productos`;
    const response = await fetch(url);

    // Clonar y registrar texto crudo para depuración (no afecta al parseo)
    const rawText = await response.clone().text();
    try {
      console.groupCollapsed('Carga productos - respuesta cruda');
      console.log(rawText.slice(0, 2000));
      console.groupEnd();
    } catch (e) {}

    let data;
    try {
      data = await response.json();
    } catch (err) {
      // Si la respuesta no es JSON (p. ej. JSONP), intentar parsear como texto y extraer JSON
      data = tryParsePossibleJSONP(rawText);
    }

    // Normalizar: si viene como array de arrays (filas), convertir a array de objetos
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      const rows = data.slice();
      const headers = rows.shift().map((h) => String(h).trim());
      data = rows.map((r) => {
        const obj = {};
        headers.forEach((hh, i) => {
          obj[hh] = r[i];
        });
        return obj;
      });
    }

    // Asegurar que sea un array de objetos
    if (!Array.isArray(data)) {
      console.error('La respuesta de productos no es un array:', data);
      throw new Error('Formato de datos de productos inesperado');
    }

    // Normalizar claves comunes (minusculas) y tipos
    // Helper: normalizar clave (quita acentos, espacios y pasa a minusculas)
    const normalizeKey = (k) =>
      String(k || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, '')
        .toLowerCase();

    products = data.map((row, idx) => {
      const p = {};
      // construir mapa de claves normalizadas -> valor
      const keyMap = {};
      Object.keys(row).forEach((k) => {
        keyMap[normalizeKey(k)] = row[k];
      });

      const getNormalized = (aliases) => {
        for (const a of aliases) {
          const nk = normalizeKey(a);
          if (keyMap[nk] !== undefined) return keyMap[nk];
        }
        return undefined;
      };

      p.id = getNormalized(['id', 'ID', 'Id']) ?? idx;
      p.nombre = getNormalized(['nombre', 'Nombre', 'NAME', 'name', 'producto', 'Producto']) ?? '';
      p.categoria = getNormalized(['categoria', 'Categoria', 'CATEGORIA']) ?? '';
      p.precio = getNormalized(['precio', 'Precio', 'price']) ?? 0;
      const activoRaw = getNormalized(['activo', 'Activo']);
      p.activo = activoRaw === true || String(activoRaw).toUpperCase() === 'TRUE' || activoRaw === 1 || String(activoRaw) === '1';
      p.imagen = getNormalized(['imagen', 'Imagen', 'image']) || '';
      p.descripcion = getNormalized(['descripcion', 'Descripcion', 'Descripción', 'descripcion']) || '';
      p.config = getNormalized(['config', 'Config']) || '';
      return p;
    });
    // Si no hay productos, mostrar pista útil para depuración
    if (!products || products.length === 0) {
      console.warn('No se cargaron productos. Respuesta cruda (primeros 1000 chars):', rawText.slice(0, 1000));
      errorEl.style.display = 'block';
      errorEl.textContent = 'No se encontraron productos en la respuesta. Revisa la consola (raw response) o asegúrate de que la hoja "Productos" exista y tenga datos.';
    }
    showLoading(false);
    renderProducts();
  } catch (err) {
    console.error(err);
    showLoading(false);
    errorEl.style.display = "block";
  }
}

function tryParsePossibleJSONP(txt) {
  // Si txt es JSONP del tipo callback({...}) o callback([...]) extraer el contenido
  try {
    const m = txt.match(/^\s*([a-zA-Z0-9_$.]+)\s*\((([\s\S]*)?)\)\s*;?\s*$/);
    if (m && m[2]) {
      return JSON.parse(m[2]);
    }
    // Si no es JSONP, intentar JSON.parse directo
    return JSON.parse(txt);
  } catch (e) {
    console.warn('No se pudo parsear respuesta como JSON/JSONP', e);
    return [];
  }
}

// Render products by sections
function renderProducts() {
const categories = [
  "almuerzos",
  "perros",
  "hamburguesas",
  "salchipapas",
  "picadas",
  "pizzas",
  "bebidas",
  "acompanantes"
];


  categories.forEach((category) => {
    const grid = document.getElementById(`${category}-grid`);
    if (!grid) return;

    const filteredProducts = products.filter((product) => {
      try {
        const cat = (product.categoria || '').toString().toLowerCase();
        return cat === category;
      } catch (e) {
        return false;
      }
    });

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
    // Siempre permitimos abrir el modal si el producto está activo

updateAddToCartButton(); // 🔥 actualiza el texto del botón con precio inicial
productModalEl.classList.add("show");



    // ✅ Si la tienda está abierta y el producto activo → abre el modal
    openProductModal(product);
  });

  return card;
}

// ✅ Get emoji based on category
function getCategoryEmoji(categoria) {
  const emojis = {
    recomendados: "⭐",
    almuerzos: "🍛",
    perros: "🌭",
    hamburguesas: "🍔",
    salchipapas: "🍟",
    picadas: "🥩",
    pizzas: "🍕",
    bebidas: "🥤",
    acompañantes: "🍚",
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
  // Modal abierto sin restricciones de horario (la disponibilidad por producto sigue)

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




  

// 🔥 --- BLOQUE CORREGIDO: configuración especial para pizzas o almuerzos ---
const existingExtraOptions = document.getElementById("extra-options");
if (existingExtraOptions) existingExtraOptions.remove(); // limpiar si ya existe

// Seleccionamos el cuerpo principal del modal
const modalContainer = document.querySelector("#product-modal .product-modal-content");

// Buscamos la sección de instrucciones ya existente
const instructionsSection = document.querySelector(".instructions-section");

// Si el producto tiene configuración personalizada
if (product.config) {
  const configType = product.config.toLowerCase().trim();
  const customOptions = document.createElement("div");
  customOptions.id = "extra-options";
  customOptions.style.marginTop = "10px";

  if (configType === "manualpizza") {
    customOptions.innerHTML = `
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
    `;
  }

  else if (configType === "manualalmuerzo") {
    customOptions.innerHTML = `
      <h4 style="margin-bottom: 8px;">🍽️ Personaliza tu almuerzo</h4>

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
    `;
  }

  // ✅ Insertar las opciones personalizables justo ANTES de la sección de instrucciones
  if (instructionsSection && modalContainer) {
    modalContainer.insertBefore(customOptions, instructionsSection);
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
  updateAddToCartButton(); // 🔥 actualiza el precio del botón
}

function decreaseQuantity() {
  if (modalQuantity > 1) {
    modalQuantity--;
    document.getElementById("modal-quantity").textContent = modalQuantity;
    updateQuantityButtons();
    updateAddToCartButton(); // 🔥 actualiza el precio del botón
  }
}


function updateQuantityButtons() {
  const decreaseBtn = document.getElementById("decrease-btn");
  decreaseBtn.disabled = modalQuantity <= 1;
}

function updateAddToCartButton() {
  if (!currentProduct) return;
  const total = parseFloat(currentProduct.precio) * modalQuantity;
  const button = document.getElementById("add-to-cart-modal");
  button.innerHTML = `Agregar <span id="modal-product-price">${formatPrice(total)}</span>`;
}



function addToCartFromModal() {
  if (!currentProduct) return;

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
  }, 500);
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
    .map((item) => {
      // Buscar el producto original para obtener la imagen
      const product = products.find(
        (p) => p.id === item.originalId || p.id === item.id
      );

      const imageHTML = product?.imagen
        ? `<img src="${product.imagen}" alt="${item.name}" class="cart-item-image" 
             onerror="this.style.display='none';">`
        : `<div class="cart-item-placeholder">🍽️</div>`;

      return `
        <div class="cart-item">
          <div class="item-left">
            ${imageHTML}
            <div class="item-info">
              <div class="item-name">${item.name}</div>
              ${
                item.instructions
                  ? `<div class="item-instructions">${item.instructions}</div>`
                  : ""
              }
              <div class="item-price">${formatPrice(item.price)} c/u</div>
            </div>
          </div>
          <div class="item-controls">
            <button class="quantity-btn" onclick="removeFromCart('${item.id}')">-</button>
            <span class="quantity">${item.quantity}</span>
            <button class="quantity-btn" onclick="addToCart('${item.id}')">+</button>
          </div>
        </div>
      `;
    })
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























// ==================================================
// ✅ SCROLL CATEGORÍAS MEJORADO Y COMPATIBLE
// ==================================================

let manualScroll = false;
let scrollTimeout = null;

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  const buttons = document.querySelectorAll(".category-btn");

  // Indica que el movimiento viene de un clic manual
  manualScroll = true;
  clearTimeout(scrollTimeout);

  // Actualizar el botón activo
  buttons.forEach(btn => btn.classList.remove("active"));
  const clickedButton = Array.from(buttons).find(btn =>
    btn.getAttribute("onclick")?.includes(sectionId)
  );
  if (clickedButton) clickedButton.classList.add("active");

// 🟩 Hacer scroll a la sección (dejando espacio por el header fijo)
if (sectionId === "todos") {
  window.scrollTo({ top: 0, behavior: "smooth" });
} else if (section) {
  const headerOffset = 210; // ajusta si tu header es más alto o más bajo
  const elementPosition = section.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - headerOffset;
  window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}


  // Después de 800ms, vuelve a modo automático
  scrollTimeout = setTimeout(() => (manualScroll = false), 800);
}

// ==================================================
// 🔹 ACTUALIZAR BOTÓN ACTIVO EN SCROLL
// ==================================================
window.addEventListener("scroll", () => {
  if (manualScroll) return; // no hacer nada si el scroll fue manual

  const sections = document.querySelectorAll("section[id]");
  const buttons = document.querySelectorAll(".category-btn");
  let current = "";
  const scrollY = window.scrollY;

  // Detectar la sección visible
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 330;
    if (scrollY >= sectionTop) current = section.getAttribute("id");
  });

  // Actualizar el botón activo
  buttons.forEach(btn => btn.classList.remove("active"));
  const activeBtn = Array.from(buttons).find(btn =>
    btn.getAttribute("onclick")?.includes(current)
  );
  if (activeBtn) {
    activeBtn.classList.add("active");

    // Centrar el botón activo si el contenedor es horizontal
    const categories = document.querySelector(".categories");
    if (categories) {
      const btnRect = activeBtn.getBoundingClientRect();
      const containerRect = categories.getBoundingClientRect();
      if (btnRect.left < containerRect.left || btnRect.right > containerRect.right) {
        categories.scrollTo({
          left: activeBtn.offsetLeft - containerRect.width / 2 + activeBtn.offsetWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }
});

// ==================================================
// 🔹 UTILIDADES DE ESTADO (loading / error)
// ==================================================
function showLoading(show) {
  skeletonLoadingEl.style.display = show ? "grid" : "none";
  document.querySelector(".menu-sections").style.display = show ? "none" : "block";
}

function showError() {
  errorEl.style.display = "block";
}

function hideError() {
  errorEl.style.display = "none";
}

// ==================================================
// 🔹 CIERRE DE MODALES AL HACER CLICK FUERA
// ==================================================
cartModalEl.addEventListener("click", e => {
  if (e.target === cartModalEl) closeCart();
});

productModalEl.addEventListener("click", e => {
  if (e.target === productModalEl) closeProductModal();
});


