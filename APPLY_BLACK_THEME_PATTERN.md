# Black Theme Pattern for All Pages

Apply these patterns to every page (Expenses, Inventory, Customers, Analytics, AI Insights, Register):

## 1. Page Headers
```jsx
// OLD
<h1 className="text-2xl font-bold text-gray-900">
<p className="text-sm text-gray-500">

// NEW
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
<p className="text-sm text-gray-500 dark:text-gray-400">
```

## 2. Stat Cards Text
```jsx
// OLD
<p className="text-sm font-medium text-gray-600">
<p className="text-2xl font-bold text-gray-900">

// NEW  
<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
<p className="text-2xl font-bold text-gray-900 dark:text-white">
```

## 3. Section Headers
```jsx
// OLD
<h2 className="text-lg font-semibold">

// NEW
<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
```

## 4. Tables
```jsx
// OLD
<table className="min-w-full divide-y divide-gray-200">
<thead className="bg-gray-50">
<th className="... text-gray-500 ...">
<tbody className="bg-white divide-y divide-gray-200">
<td className="... text-gray-900">
<td className="... text-gray-500">

// NEW
<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
<thead className="bg-gray-50 dark:bg-gray-900">
<th className="... text-gray-500 dark:text-gray-400 ...">
<tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
<td className="... text-gray-900 dark:text-white">
<td className="... text-gray-500 dark:text-gray-400">
```

## 5. Modals
```jsx
// OLD
<div className="... bg-white">
<h3 className="... text-gray-900">
<label className="... text-gray-700">

// NEW
<div className="... border border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
<h3 className="... text-gray-900 dark:text-white">
<label className="... text-gray-700 dark:text-white">
```

## 6. Loading/Empty States
```jsx
// OLD
<p className="text-gray-600">
<p className="text-gray-500">

// NEW
<p className="text-gray-600 dark:text-gray-400">
<p className="text-gray-500 dark:text-gray-400">
```

## Cards
Cards use the `.card` class which already has dark mode support from index.css
