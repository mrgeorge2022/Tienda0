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
/**
 * Inicializa la aplicación cuando el DOM está listo.
 * Actualmente llama a `loadProducts` para cargar los productos desde Google Sheets.
 */
document.addEventListener("DOMContentLoaded", function () {
  loadProducts();
});

// Nota: la lógica de horario fue eliminada; la tienda siempre permite interacción local

// ✅ Actualiza botones de productos
/**
 * updateProductButtons
 * --------------------
 * Actualiza el aspecto de los botones "+" en las tarjetas de producto.
 * Nota: el botón es puramente visual aquí; la lógica de disponibilidad
 * real viene de la propiedad `product.activo`.
 */
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
/**
 * loadProducts
 * ------------
 * Hace una petición al Web App de Google Apps Script solicitando la
 * hoja `Productos`. Soporta respuestas JSON, JSONP o arrays de filas
 * (array de arrays). Normaliza las claves y construye el array `products`.
 * Muestra mensajes de error en la UI si la carga falla o no hay datos.
 */
async function loadProducts() {
  try {
    showLoading(true);
    // Pedimos explícitamente la hoja Productos para evitar confusiones con otras hojas
    const url = `${APPS_SCRIPT_URL}?sheet=Productos`;
    const response = await fetch(url);

    // Clonar y registrar texto crudo para depuración (no afecta al parseo)
    const rawText = await response.clone().text();
    try {
      console.groupCollapsed("Carga productos - respuesta cruda");
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
      console.error("La respuesta de productos no es un array:", data);
      throw new Error("Formato de datos de productos inesperado");
    }

    // Normalizar claves comunes (minusculas) y tipos
    // Helper: normalizar clave (quita acentos, espacios y pasa a minusculas)
    const normalizeKey = (k) =>
      String(k || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, "")
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

      p.id = getNormalized(["id", "ID", "Id"]) ?? idx;
      p.nombre =
        getNormalized([
          "nombre",
          "Nombre",
          "NAME",
          "name",
          "producto",
          "Producto",
        ]) ?? "";
      p.categoria =
        getNormalized(["categoria", "Categoria", "CATEGORIA"]) ?? "";
      p.precio = getNormalized(["precio", "Precio", "price"]) ?? 0;
      const activoRaw = getNormalized(["activo", "Activo"]);
      p.activo =
        activoRaw === true ||
        String(activoRaw).toUpperCase() === "TRUE" ||
        activoRaw === 1 ||
        String(activoRaw) === "1";
      p.imagen = getNormalized(["imagen", "Imagen", "image"]) || "";
      p.descripcion =
        getNormalized([
          "descripcion",
          "Descripcion",
          "Descripción",
          "descripcion",
        ]) || "";
      p.config = getNormalized(["config", "Config"]) || "";
      return p;
    });
    // Si no hay productos, mostrar pista útil para depuración
    if (!products || products.length === 0) {
      console.warn(
        "No se cargaron productos. Respuesta cruda (primeros 1000 chars):",
        rawText.slice(0, 1000)
      );
      errorEl.style.display = "block";
      errorEl.textContent =
        'No se encontraron productos en la respuesta. Revisa la consola (raw response) o asegúrate de que la hoja "Productos" exista y tenga datos.';
    }
    showLoading(false);
    renderProducts();
  } catch (err) {
    console.error(err);
    showLoading(false);
    errorEl.style.display = "block";
  }
}

/**
 * tryParsePossibleJSONP
 * ----------------------
 * Intenta parsear texto que puede ser JSON o JSONP.
 * Si detecta JSONP del tipo callback(...), extrae el payload y lo parsea.
 * Devuelve un array/objeto parseado o un array vacío en caso de fallar.
 * @param {string} txt - Texto crudo de la respuesta HTTP
 * @returns {any} Objeto/array parseado o []
 */
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
    console.warn("No se pudo parsear respuesta como JSON/JSONP", e);
    return [];
  }
}

// Render products by sections
/**
 * renderProducts
 * --------------
 * Recorre las categorías definidas y renderiza las tarjetas de producto
 * correspondientes dentro del grid de cada categoría. Si no hay productos
 * para una sección, muestra un mensaje de 'No hay productos'.
 */
function renderProducts() {
  const categories = [
    "almuerzos",
    "perros",
    "hamburguesas",
    "salchipapas",
    "picadas",
    "pizzas",
    "bebidas",
    "acompanantes",
  ];

  categories.forEach((category) => {
    const grid = document.getElementById(`${category}-grid`);
    if (!grid) return;

    const filteredProducts = products.filter((product) => {
      try {
        const cat = (product.categoria || "").toString().toLowerCase();
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
/**
 * createProductCard
 * -----------------
 * Crea y devuelve un elemento DOM `.product-card` para el objeto `product`.
 * Incluye imagen, nombre, descripción, precio y el botón de añadir.
 * El click en la tarjeta abre el modal si el producto está activo.
 * @param {Object} product - Objeto con propiedades del producto
 * @returns {HTMLElement} Nodo DOM de la tarjeta del producto
 */
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
/**
 * getCategoryEmoji
 * ----------------
 * Devuelve un emoji representativo según la categoría.
 * @param {string} categoria
 * @returns {string} emoji
 */
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
/**
 * formatPrice
 * -----------
 * Formatea un número a formato de moneda (COP) sin decimales.
 * @param {number|string} price
 * @returns {string}
 */
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
/**
 * openProductModal
 * ----------------
 * Rellena y muestra el modal de producto con los datos del `product`.
 * También inserta opciones extra para productos con `config` (pizzas/almuerzos).
 * @param {Object} product
 */
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
const modalImage = document.getElementById("modal-image-content");
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

  // 🔥 --- BLOQUE DE CONFIGURACIÓN: delegar a ProductosVariable ---
  try {
    // Limpiar opciones previas si el helper está disponible
    if (window.ProductosVariable && typeof window.ProductosVariable.removeProductConfigOptions === 'function') {
      window.ProductosVariable.removeProductConfigOptions();
    } else {
      // fallback: eliminar nodo extra-options si existe
      const existing = document.getElementById('extra-options');
      if (existing) existing.remove();
    }

    // Si el producto tiene configuración, pedir al helper que la renderice
    if (product.config && window.ProductosVariable && typeof window.ProductosVariable.renderProductConfigOptions === 'function') {
      window.ProductosVariable.renderProductConfigOptions(product.config);
    }
  } catch (e) {
    console.warn('Error al renderizar opciones de producto variables:', e);
  }
  // 🔥 --- FIN DEL BLOQUE DE CONFIGURACIÓN ---

  // Show modal
  productModalEl.classList.add("show");
}

/**
 * closeProductModal
 * -----------------
 * Cierra el modal de producto y resetea el estado local relacionado.
 */
function closeProductModal() {
  productModalEl.classList.remove("show");
  currentProduct = null;
  modalQuantity = 1;
}

/**
 * increaseQuantity
 * ----------------
 * Incrementa la cantidad seleccionada en el modal y actualiza UI.
 */
function increaseQuantity() {
  modalQuantity++;
  document.getElementById("modal-quantity").textContent = modalQuantity;
  updateQuantityButtons();
  updateAddToCartButton(); // 🔥 actualiza el precio del botón
}

/**
 * decreaseQuantity
 * ----------------
 * Decrementa la cantidad (mínimo 1) y actualiza la UI del modal.
 */
function decreaseQuantity() {
  if (modalQuantity > 1) {
    modalQuantity--;
    document.getElementById("modal-quantity").textContent = modalQuantity;
    updateQuantityButtons();
    updateAddToCartButton(); // 🔥 actualiza el precio del botón
  }
}

/**
 * updateQuantityButtons
 * ---------------------
 * Habilita/deshabilita el botón de decrementar cantidad según el valor actual.
 */
function updateQuantityButtons() {
  const decreaseBtn = document.getElementById("decrease-btn");
  decreaseBtn.disabled = modalQuantity <= 1;
}

/**
 * updateAddToCartButton
 * ---------------------
 * Actualiza el texto del botón 'Agregar' dentro del modal para mostrar el precio total
 * en función de la cantidad seleccionada.
 */
function updateAddToCartButton() {
  if (!currentProduct) return;
  const total = parseFloat(currentProduct.precio) * modalQuantity;
  const button = document.getElementById("add-to-cart-modal");
  button.innerHTML = `Agregar ${formatPrice(total)}`;
}


/**
 * addToCartFromModal
 * ------------------
 * Toma los datos seleccionados en el modal (cantidad, instrucciones extras)
 * y añade el ítem al carrito. Si ya existe un ítem sin instrucciones, aumenta
 * su cantidad. Si tiene instrucciones diferentes, crea una línea nueva.
 */
function addToCartFromModal() {
  if (!currentProduct) return;

  // --- CAPTURAR OPCIONES DE CONFIGURACIÓN ---
  let extraInstructions = "";
  try {
    if (window.ProductosVariable && typeof window.ProductosVariable.collectProductConfigInstructions === 'function') {
      extraInstructions = window.ProductosVariable.collectProductConfigInstructions();
    } else {
      // Fallback: leer manualmente campos conocidos si el helper no está presente
      const pizzaSize = Array.from(document.querySelectorAll('#pizza-size input[type="checkbox"]:checked')).map(i => i.value);
      const pizzaIngredients = Array.from(document.querySelectorAll('#pizza-ingredients input[type="checkbox"]:checked')).map(i => i.value);
      const pizzaNotes = document.getElementById('pizza-extra')?.value?.trim();
      const proteinas = Array.from(document.querySelectorAll('#almuerzo-proteina input[type="checkbox"]:checked')).map(i => i.value);
      const acomp = Array.from(document.querySelectorAll('#almuerzo-acompanamiento input[type="checkbox"]:checked')).map(i => i.value);
      const bebidas = Array.from(document.querySelectorAll('#almuerzo-bebida input[type="checkbox"]:checked')).map(i => i.value);
      const almExtra = document.getElementById('almuerzo-extra')?.value?.trim();
      const parts = [];
      if (pizzaSize.length) parts.push(`Tamaño: ${pizzaSize.join(', ')}`);
      if (pizzaIngredients.length) parts.push(`Ingredientes: ${pizzaIngredients.join(', ')}`);
      if (pizzaNotes) parts.push(`Notas: ${pizzaNotes}`);
      if (proteinas.length) parts.push(`Proteína: ${proteinas.join(', ')}`);
      if (acomp.length) parts.push(`Acompañamiento: ${acomp.join(', ')}`);
      if (bebidas.length) parts.push(`Bebida: ${bebidas.join(', ')}`);
      if (almExtra) parts.push(`Notas: ${almExtra}`);
      extraInstructions = parts.join(' | ');
    }
  } catch (e) {
    console.warn('Error al recoger opciones variables:', e);
    extraInstructions = '';
  }

  const instructions = [document.getElementById("product-instructions").value.trim(), extraInstructions].filter(Boolean).join(" | ");

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
/**
 * addToCart
 * ---------
 * Añade 1 unidad del producto identificado por `productId` al carrito.
 * Se utiliza para los controles rápidos (+) en la lista del carrito.
 * @param {string} productId
 */
function addToCart(productId) {
  // Try to find the cart line by exact id (cart item id)
  const asStr = String(productId);

  const cartItem = cart.find((it) => String(it.id) === asStr);
  if (cartItem) {
    // If the cart line exists, increment its quantity
    cartItem.quantity = (cartItem.quantity || 0) + 1;
    updateCartDisplay();
    renderCartItems();
    return;
  }

  // If not found in cart, try to find the product in the products list
  // productId may be a suffixed id like '123_1600000000', so compare by original part too
  const originalId = asStr.split("_")[0];
  const product = products.find(
    (p) => String(p.id) === asStr || String(p.id) === originalId
  );
  if (!product || !product.activo) return;

  // Add as a new cart line
  cart.push({
    id: String(product.id),
    originalId: product.id,
    name: product.nombre,
    price: parseFloat(product.precio),
    quantity: 1,
    instructions: "",
  });
  updateCartDisplay();
  renderCartItems();
}

/**
 * removeFromCart
 * --------------
 * Resta una unidad del ítem del carrito. Si la cantidad llega a 0 elimina
 * la línea del carrito.
 * @param {string} productId
 */
function removeFromCart(productId) {
  const asStr = String(productId);
  console.debug("removeFromCart called with:", asStr, "current cart:", cart);

  // 1) Try exact match against cart item id
  let itemIndex = cart.findIndex((item) => String(item.id) === asStr);

  // 2) If not found, try match against originalId
  if (itemIndex === -1) {
    itemIndex = cart.findIndex((item) => String(item.originalId) === asStr);
  }

  // 3) If still not found, try matching using the prefix before '_' (for suffixed ids)
  if (itemIndex === -1) {
    const prefix = asStr.split("_")[0];
    itemIndex = cart.findIndex((item) => String(item.originalId) === prefix || String(item.id).split("_")[0] === prefix);
  }

  if (itemIndex === -1) {
    console.warn("removeFromCart: item not found for id", asStr);
    return;
  }

  if (cart[itemIndex].quantity > 1) {
    cart[itemIndex].quantity -= 1;
  } else {
    // remove item entirely when quantity reaches 0
    cart.splice(itemIndex, 1);
  }

  // Siempre actualizar la UI
  updateCartDisplay();
  renderCartItems();
}

// carrito flotante y modal
/**
 * updateCartDisplay
 * -----------------
 * Actualiza la UI del carrito flotante: recuenta items, calcula el total
 * y ajusta la visibilidad/estado del botón flotante.
 */
function updateCartDisplay() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const cartCountEl = document.getElementById("cart-count");
  const cartTotalEl = document.getElementById("cart-total");
  const cartTotalModalEl = document.getElementById("cart-total-modal");

  if (totalItems > 0) {
    // ✅ Hay productos: mostrar cantidad y total
    cartFloatEl.classList.add("show-info");
    cartCountEl.textContent = `${totalItems} producto${totalItems !== 1 ? "s" : ""}`;
    cartTotalEl.textContent = formatPrice(totalPrice);
    cartTotalModalEl.textContent = `Total: ${formatPrice(totalPrice)}`;
  } else {
    // 🟡 Carrito vacío: solo mostrar la imagen
    cartFloatEl.classList.remove("show-info");
    cartCountEl.textContent = "";
    cartTotalEl.textContent = "";
    cartTotalModalEl.textContent = "";
  }
}


/**
 * openCart
 * --------
 * Muestra el modal del carrito y renderiza los items actuales.
 */
function openCart() {
  cartModalEl.classList.add("show");
  renderCartItems();
}

/**
 * closeCart
 * ---------
 * Cierra el modal del carrito.
 */
function closeCart() {
  cartModalEl.classList.remove("show");
}

/**
 * renderCartItems
 * ----------------
 * Renderiza las líneas del carrito dentro del modal del carrito. Si el
 * carrito está vacío, muestra mensaje correspondiente.
 */
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
            <button class="quantity-btn decrease-btn" data-id="${item.id}">-</button>
            <span class="quantity">${item.quantity}</span>
            <button class="quantity-btn increase-btn" data-id="${item.id}">+</button>
          </div>
        </div>
      `;
    })
    .join("");

  // Delegated click handler for increase/decrease buttons
  cartItemsEl.onclick = function (e) {
    const btn = e.target.closest('.quantity-btn');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (btn.classList.contains('decrease-btn')) {
      removeFromCart(id);
    } else if (btn.classList.contains('increase-btn')) {
      addToCart(id);
    }
  };
}

/**
 * clearCart
 * ---------
 * Vacía el carrito después de una confirmación del usuario.
 */
function clearCart() {
  if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
    cart = [];
    updateCartDisplay();
    renderCartItems();
  }
}

/**
 * checkout
 * --------
 * Simula el envío del pedido: muestra un resumen y limpia el carrito.
 * Aquí podría integrarse el envío real (API, WhatsApp, etc.).
 */
function checkout() {
  if (cart.length === 0) {
    alert("Tu carrito está vacío");
    return;
  }

  // 🔥 En lugar de confirmar pedido de inmediato,
  // abrimos el nuevo modal de tipo de entrega
  openDeliveryModal();
}


const deliveryModalEl = document.getElementById("delivery-modal");

function openDeliveryModal() {
  // 💾 Obtener el total mostrado en el modal del carrito
  const totalText = document.getElementById("cart-total-modal").textContent;
  const match = totalText.match(/[\d,.]+/);
  let cartTotal = 0;

  if (match) {
    cartTotal = Number(match[0].replace(/[.,]/g, ""));
  }

  localStorage.setItem("cartTotal", cartTotal);
  console.log("💾 Subtotal leído del DOM y guardado:", cartTotal);

  // Abrir modal
  closeCart();
  deliveryModalEl.classList.add("show");
}

function closeDeliveryModal() {
  const deliveryModalEl = document.getElementById("delivery-modal");
  if (deliveryModalEl) {
    deliveryModalEl.classList.remove("show");
  }
}

function selectDeliveryType(type) {
  closeDeliveryModal();

  const cartTotal = localStorage.getItem("cartTotal") || 0;
  console.log("🧾 Total cargado desde localStorage:", cartTotal);

  if (type === "Recoger en tienda" || type === "Mesa") {
    openCustomerModal(type);
  } else if (type === "Domicilio") {
    console.log("➡️ Redirigiendo a domicilio.html...");
    window.location.href = "domicilio.html";
  }

  console.log(`Pedido preparado (${type}), pendiente de envío final.`);
}

// ==========================================
// 🧍 MODAL DE DATOS DEL CLIENTE
// ==========================================
const customerModalEl = document.getElementById("customer-modal");
const customerForm = document.getElementById("customer-form");
const mesaField = document.getElementById("mesa-field");
let currentDeliveryType = ""; // Guardará si es tienda o mesa

function openCustomerModal(type) {
  currentDeliveryType = type;
  document.getElementById("customer-modal-title").textContent =
    type === "Mesa" ? "Pedido en mesa 🍽️" : "Recoger en tienda 🏬";

  // Mostrar o esconder campo de mesa según el tipo
  mesaField.style.display = type === "Mesa" ? "block" : "none";

  // Limpiar formulario
  customerForm.reset();
  customerModalEl.classList.add("show");
}

function closeCustomerModal() {
  customerModalEl.classList.remove("show");
}

// Manejar envío del formulario
customerForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("customer-name").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  const mesa = document.getElementById("customer-mesa").value.trim();

  if (!name || !phone) {
    alert("Por favor, ingresa tu nombre y número de teléfono.");
    return;
  }

  // Construir resumen del pedido
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderSummary = cart
    .map(
      (item) =>
        `${item.quantity}x ${item.name} - ${formatPrice(
          item.price * item.quantity
        )}`
    )
    .join("\n");

  let message = `🍽️ *Nuevo Pedido (${currentDeliveryType})*\n\n👤 *Nombre:* ${name}\n📞 *Teléfono:* ${phone}`;
  if (currentDeliveryType === "Mesa") {
    message += `\n🍽️ *Mesa:* ${mesa || "Sin número"}`;
  }
  message += `\n\n${orderSummary}\n\n*Total: ${formatPrice(total)}*`;

  // Mostrar confirmación (luego se conectará con WhatsApp o base de datos)
  alert(`✅ Pedido registrado:\n\n${message}`);

  // Limpiar todo
  cart = [];
  updateCartDisplay();
  closeCustomerModal();
});




// ==================================================
// ✅ SCROLL CATEGORÍAS MEJORADO Y COMPATIBLE
// ==================================================

let manualScroll = false;
let scrollTimeout = null;

/**
 * scrollToSection
 * ---------------
 * Hace scroll suave hacia una sección de la página y marca el botón
 * de categoría correspondiente como activo. Evita que el listener de
 * scroll automático cambie el estado durante la navegación manual.
 * @param {string} sectionId
 */
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  const buttons = document.querySelectorAll(".category-btn");

  // Indica que el movimiento viene de un clic manual
  manualScroll = true;
  clearTimeout(scrollTimeout);

  // Actualizar el botón activo
  buttons.forEach((btn) => btn.classList.remove("active"));
  const clickedButton = Array.from(buttons).find((btn) =>
    btn.getAttribute("onclick")?.includes(sectionId)
  );
  if (clickedButton) clickedButton.classList.add("active");

  // 🟩 Hacer scroll a la sección (dejando espacio por el header fijo)
  if (sectionId === "todos") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (section) {
    const headerOffset = 210; // ajusta si tu header es más alto o más bajo
    const elementPosition =
      section.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - headerOffset;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
  }

  // Después de 800ms, vuelve a modo automático
  scrollTimeout = setTimeout(() => (manualScroll = false), 800);
}

// ==================================================
// 🔹 ACTUALIZAR BOTÓN ACTIVO EN SCROLL
// ==================================================
/**
 * listener de scroll
 * ------------------
 * Actualiza el botón de categoría activo basado en la sección visible.
 * También centra el botón activo en su contenedor si es necesario.
 */
window.addEventListener("scroll", () => {
  if (manualScroll) return; // no hacer nada si el scroll fue manual

  const sections = document.querySelectorAll("section[id]");
  const buttons = document.querySelectorAll(".category-btn");
  let current = "";
  const scrollY = window.scrollY;

  // Detectar la sección visible
  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 330;
    if (scrollY >= sectionTop) current = section.getAttribute("id");
  });

  // Actualizar el botón activo
  buttons.forEach((btn) => btn.classList.remove("active"));
  const activeBtn = Array.from(buttons).find((btn) =>
    btn.getAttribute("onclick")?.includes(current)
  );
  if (activeBtn) {
    activeBtn.classList.add("active");

    // Centrar el botón activo si el contenedor es horizontal
    const categories = document.querySelector(".categories");
    if (categories) {
      const btnRect = activeBtn.getBoundingClientRect();
      const containerRect = categories.getBoundingClientRect();
      if (
        btnRect.left < containerRect.left ||
        btnRect.right > containerRect.right
      ) {
        categories.scrollTo({
          left:
            activeBtn.offsetLeft -
            containerRect.width / 2 +
            activeBtn.offsetWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }
});

// ==================================================
// 🔹 UTILIDADES DE ESTADO (loading / error)
// ==================================================
/**
 * showLoading
 * -----------
 * Muestra/oculta la interfaz de carga (skeleton) y la sección de menú.
 * @param {boolean} show
 */
function showLoading(show) {
  skeletonLoadingEl.style.display = show ? "grid" : "none";
  document.querySelector(".menu-sections").style.display = show
    ? "none"
    : "block";
}

/**
 * showError
 * ---------
 * Muestra el elemento de error en la UI.
 */
function showError() {
  errorEl.style.display = "block";
}

/**
 * hideError
 * ---------
 * Oculta el elemento de error en la UI.
 */
function hideError() {
  errorEl.style.display = "none";
}

// ==================================================
// 🔹 CIERRE DE MODALES AL HACER CLICK FUERA
// ==================================================
cartModalEl.addEventListener("click", (e) => {
  if (e.target === cartModalEl) closeCart();
});

productModalEl.addEventListener("click", (e) => {
  if (e.target === productModalEl) closeProductModal();
});
