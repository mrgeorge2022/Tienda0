// Archivo: productos-variable.js
// Propósito: centralizar funciones reutilizables para productos con configuración
// como pizzas y almuerzos. El archivo expone un objeto global `ProductosVariable`
// con métodos para renderizar opciones y recoger las instrucciones seleccionadas.

(function () {
  /**
   * Renderiza las opciones de configuración para un producto dentro del modal.
   * Inserta un contenedor con id `extra-options` antes de la sección de instrucciones
   * si existe. Soporta tipos: 'manualpizza' y 'manualalmuerzo'.
   * @param {string} configType Raw config string del producto (p. ej. 'manualpizza')
   */
  function renderProductConfigOptions(configType) {
    removeProductConfigOptions();
    if (!configType) return;
    const type = String(configType).toLowerCase().trim();
    const modalContainer = document.querySelector(
      "#product-modal .product-modal-content"
    );
    const instructionsSection = document.querySelector(".instructions-section");
    if (!modalContainer || !instructionsSection) return;

    const customOptions = document.createElement("div");
    customOptions.id = "extra-options";
    customOptions.style.marginTop = "10px";

    if (type === "manualpizza") {
      customOptions.innerHTML = `
      <h4 style="margin-bottom: 8px;">Personaliza tu pizza</h4>

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
    } else if (type === "manualalmuerzo") {
      customOptions.innerHTML = `
      <h4 style="margin-bottom: 8px;">Personaliza tu almuerzo</h4>

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
    } else {
      // Tipo no reconocido: crear un contenedor neutro para ser personalizado más tarde
      customOptions.innerHTML = `<div style="color:#666; font-size:0.9rem;">Opciones adicionales disponibles</div>`;
    }

    modalContainer.insertBefore(customOptions, instructionsSection);
  }

  /**
   * Elimina el contenedor `extra-options` del modal si existe.
   */
  function removeProductConfigOptions() {
    const existing = document.getElementById("extra-options");
    if (existing) existing.remove();
  }

  /**
   * Recoge las instrucciones seleccionadas por el usuario dentro del modal
   * a partir de los controles generados por `renderProductConfigOptions`.
   * Devuelve una cadena con las instrucciones concatenadas o una cadena vacía.
   * @returns {string}
   */
  function collectProductConfigInstructions() {
    const parts = [];

    // Pizza
    const pizzaSize = Array.from(
      document.querySelectorAll('#pizza-size input[type="checkbox"]:checked')
    ).map((i) => i.value);
    const pizzaIngredients = Array.from(
      document.querySelectorAll(
        '#pizza-ingredients input[type="checkbox"]:checked'
      )
    ).map((i) => i.value);
    const pizzaNotes = document.getElementById("pizza-extra")?.value?.trim();
    if (pizzaSize.length) parts.push(`Tamaño: ${pizzaSize.join(", ")}`);
    if (pizzaIngredients.length)
      parts.push(`Ingredientes: ${pizzaIngredients.join(", ")}`);
    if (pizzaNotes) parts.push(`Notas: ${pizzaNotes}`);

    // Almuerzo
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
    const almExtra = document.getElementById("almuerzo-extra")?.value?.trim();
    if (proteinas.length) parts.push(`Proteína: ${proteinas.join(", ")}`);
    if (acomp.length) parts.push(`Acompañamiento: ${acomp.join(", ")}`);
    if (bebidas.length) parts.push(`Bebida: ${bebidas.join(", ")}`);
    if (almExtra) parts.push(`Notas: ${almExtra}`);

    return parts.join(" | ");
  }

  // Exponer en window para que `script.js` lo pueda usar sin cambiar el resto del proyecto
  window.ProductosVariable = {
    renderProductConfigOptions,
    removeProductConfigOptions,
    collectProductConfigInstructions,
  };
})();
