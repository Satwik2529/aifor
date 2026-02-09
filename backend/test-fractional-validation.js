/**
 * Test script to verify fractional quantity validation
 * Tests the normalize and isValidQuantity functions
 */

const { normalize, isValidQuantity } = require('./src/utils/quantityHelper');

console.log('=== Testing Fractional Quantity Validation ===\n');

// Test cases
const testCases = [
    { input: 10.5, expected: true, description: 'Fractional number 10.5' },
    { input: 2.5, expected: true, description: 'Fractional number 2.5' },
    { input: 0.5, expected: true, description: 'Fractional number 0.5' },
    { input: 0.001, expected: true, description: 'Minimum fractional 0.001' },
    { input: 100, expected: true, description: 'Whole number 100' },
    { input: 0, expected: false, description: 'Zero' },
    { input: -5, expected: false, description: 'Negative number' },
    { input: NaN, expected: false, description: 'NaN' },
    { input: null, expected: false, description: 'null' },
    { input: undefined, expected: false, description: 'undefined' },
    { input: '', expected: false, description: 'Empty string' },
];

console.log('Testing isValidQuantity function:\n');
testCases.forEach(test => {
    const result = isValidQuantity(test.input);
    const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.description}: ${test.input} => ${result}`);
});

console.log('\n=== Testing normalize function ===\n');

const normalizeTests = [
    { input: 10.5, expected: 10.5, description: '10.5 stays 10.5' },
    { input: 2.5555, expected: 2.556, description: '2.5555 rounds to 2.556' },
    { input: 0.5, expected: 0.5, description: '0.5 stays 0.5' },
    { input: 10.999999, expected: 11.0, description: '10.999999 rounds to 11.0' },
    { input: 100, expected: 100, description: '100 stays 100' },
];

normalizeTests.forEach(test => {
    const result = normalize(test.input);
    const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.description}: ${test.input} => ${result} (expected: ${test.expected})`);
});

console.log('\n=== Testing parseFloat behavior ===\n');

const parseTests = [
    '10.5',
    '2.5',
    '0.5',
    '10.',
    '10',
    '',
    'abc',
];

parseTests.forEach(input => {
    const parsed = parseFloat(input);
    const isValid = isValidQuantity(parsed);
    console.log(`Input: "${input}" => Parsed: ${parsed} => Valid: ${isValid}`);
});

console.log('\n=== Test Complete ===');
