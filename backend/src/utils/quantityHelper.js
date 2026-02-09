/**
 * Quantity Helper - Safe handling of fractional quantities
 * Prevents floating-point errors and normalizes units
 * Production-grade inventory math for retail systems
 */

/**
 * Normalize quantity to 3 decimal places
 * Prevents JS floating point errors (e.g., 0.1 + 0.2 = 0.30000000000000004)
 * @param {number} num - Quantity to normalize
 * @returns {number} - Normalized quantity
 */
const normalize = (num) => {
    return Number(Number(num).toFixed(3));
};

/**
 * Convert grams to kilograms
 * @param {number} grams - Weight in grams
 * @returns {number} - Weight in kg (normalized)
 */
const gramsToKg = (grams) => {
    return normalize(grams / 1000);
};

/**
 * Convert milliliters to liters
 * @param {number} ml - Volume in milliliters
 * @returns {number} - Volume in liters (normalized)
 */
const mlToLiters = (ml) => {
    return normalize(ml / 1000);
};

/**
 * Validate quantity is positive and safe
 * @param {number} quantity - Quantity to validate
 * @returns {boolean} - True if valid
 */
const isValidQuantity = (quantity) => {
    return typeof quantity === 'number' && 
           !isNaN(quantity) && 
           quantity > 0 && 
           isFinite(quantity);
};

/**
 * Check if quantity is fractional (for UI hints)
 * @param {string} unit - Unit type
 * @returns {boolean} - True if unit supports fractions
 */
const supportsFractional = (unit) => {
    return ['kg', 'litre', 'liter'].includes(unit?.toLowerCase());
};

/**
 * Normalize quantity based on unit
 * Converts input to base unit if needed
 * @param {number} quantity - Input quantity
 * @param {string} unit - Unit type
 * @param {string} inputUnit - Optional: if user entered in different unit (e.g., 'gram' when base is 'kg')
 * @returns {number} - Normalized quantity in base unit
 */
const normalizeQuantity = (quantity, unit, inputUnit = null) => {
    // If no conversion needed, just normalize
    if (!inputUnit || inputUnit === unit) {
        return normalize(quantity);
    }

    // Convert grams to kg
    if (inputUnit === 'gram' && unit === 'kg') {
        return gramsToKg(quantity);
    }

    // Convert ml to liters
    if (inputUnit === 'ml' && (unit === 'litre' || unit === 'liter')) {
        return mlToLiters(quantity);
    }

    // No conversion needed
    return normalize(quantity);
};

/**
 * Calculate total price with fractional quantities
 * @param {number} quantity - Quantity sold
 * @param {number} pricePerUnit - Price per base unit
 * @returns {number} - Total price (normalized)
 */
const calculatePrice = (quantity, pricePerUnit) => {
    return normalize(quantity * pricePerUnit);
};

/**
 * Check if stock is sufficient for sale
 * @param {number} availableStock - Current stock
 * @param {number} requestedQty - Requested quantity
 * @returns {boolean} - True if sufficient
 */
const hasSufficientStock = (availableStock, requestedQty) => {
    return normalize(availableStock) >= normalize(requestedQty);
};

/**
 * Calculate new stock after deduction
 * @param {number} currentStock - Current stock
 * @param {number} deductQty - Quantity to deduct
 * @returns {number} - New stock (normalized)
 */
const deductStock = (currentStock, deductQty) => {
    const newStock = normalize(currentStock - deductQty);
    return newStock < 0 ? 0 : newStock; // Prevent negative stock
};

/**
 * Format quantity for display
 * @param {number} quantity - Quantity to format
 * @param {string} unit - Unit type
 * @returns {string} - Formatted string (e.g., "2.5 kg", "5 pieces")
 */
const formatQuantity = (quantity, unit = 'piece') => {
    const normalized = normalize(quantity);
    
    // For pieces, show as integer if whole number
    if (unit === 'piece' && Number.isInteger(normalized)) {
        return `${normalized} ${unit}${normalized !== 1 ? 's' : ''}`;
    }
    
    // For fractional units, show up to 3 decimals
    return `${normalized} ${unit}`;
};

module.exports = {
    normalize,
    gramsToKg,
    mlToLiters,
    isValidQuantity,
    supportsFractional,
    normalizeQuantity,
    calculatePrice,
    hasSufficientStock,
    deductStock,
    formatQuantity
};
