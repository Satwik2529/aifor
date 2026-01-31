# PowerShell script to apply black theme to all pages
# Run this from the frontend\src\pages directory

$files = @("Expenses.jsx", "Inventory.jsx", "Customers.jsx", "Analytics.jsx", "AIInsights.jsx", "RegisterNew.jsx")

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file..."
        
        # Read content
        $content = Get-Content $file -Raw
        
        # Apply replacements
        $content = $content -replace 'text-2xl font-bold text-gray-900"', 'text-2xl font-bold text-gray-900 dark:text-white"'
        $content = $content -replace 'text-lg font-semibold"', 'text-lg font-semibold text-gray-900 dark:text-white"'
        $content = $content -replace 'text-lg font-medium text-gray-900"', 'text-lg font-medium text-gray-900 dark:text-white"'
        $content = $content -replace 'text-sm text-gray-500"', 'text-sm text-gray-500 dark:text-gray-400"'
        $content = $content -replace 'text-sm font-medium text-gray-600"', 'text-sm font-medium text-gray-600 dark:text-gray-400"'
        $content = $content -replace 'text-gray-600"', 'text-gray-600 dark:text-gray-400"'
        $content = $content -replace 'divide-y divide-gray-200">', 'divide-y divide-gray-200 dark:divide-gray-800">'
        $content = $content -replace 'bg-gray-50">', 'bg-gray-50 dark:bg-gray-900">'
        $content = $content -replace 'text-xs font-medium text-gray-500 ', 'text-xs font-medium text-gray-500 dark:text-gray-400 '
        $content = $content -replace 'bg-white divide-y divide-gray-200">', 'bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">'
        $content = $content -replace 'text-sm text-gray-900">', 'text-sm text-gray-900 dark:text-white">'
        $content = $content -replace 'text-sm font-medium text-gray-700">', 'text-sm font-medium text-gray-700 dark:text-white">'
        $content = $content -replace 'border w-11/12', 'border border-gray-200 dark:border-gray-800 w-11/12'
        $content = $content -replace 'bg-white">', 'bg-white dark:bg-black">'
        
        # Write back
        Set-Content $file -Value $content -NoNewline
        Write-Host "✓ Updated $file"
    }
}

Write-Host "`nDone! All pages updated with black theme."
