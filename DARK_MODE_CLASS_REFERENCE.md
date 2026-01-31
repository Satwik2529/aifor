# Dark Mode Class Reference

## Common Dark Mode Patterns

Use these class patterns throughout the application for consistent dark mode styling:

### Backgrounds
```
bg-white dark:bg-gray-800          // Main cards/containers
bg-gray-50 dark:bg-gray-900        // Page backgrounds  
bg-gray-100 dark:bg-gray-700       // Secondary elements/buttons
bg-gray-200 dark:bg-gray-600       // Hover states
```

### Text Colors
```
text-gray-900 dark:text-white      // Headings
text-gray-700 dark:text-gray-300   // Body text
text-gray-500 dark:text-gray-400   // Secondary text
text-gray-600 dark:text-gray-300   // Medium emphasis text
```

### Borders
```
border-gray-200 dark:border-gray-700   // Default borders
border-gray-300 dark:border-gray-600   // Input borders
```

### Colored Backgrounds (Info Cards)
```
bg-indigo-50 dark:bg-indigo-900/30     // Indigo info cards
bg-yellow-50 dark:bg-yellow-900/30     // Warning cards
bg-green-50 dark:bg-green-900/30       // Success cards
bg-red-50 dark:bg-red-900/30           // Error cards
```

### Colored Text (Info Cards)
```
text-indigo-900 dark:text-indigo-200   // Indigo headings
text-indigo-600 dark:text-indigo-400   // Indigo accents
text-yellow-900 dark:text-yellow-200   // Warning headings
text-green-900 dark:text-green-200     // Success headings
text-red-900 dark:text-red-200         // Error headings
```

### Inputs & Forms
```
className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
```

### Modals
```
// Modal overlay stays the same
bg-gray-600 bg-opacity-50

// Modal content
bg-white dark:bg-gray-800

// Modal text
text-gray-900 dark:text-white
text-gray-700 dark:text-gray-300
```

### Tables
```
// Table container
bg-white dark:bg-gray-800

// Table headers
text-gray-500 dark:text-gray-400

// Table body
className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"

// Table cells
text-gray-900 dark:text-white
text-gray-700 dark:text-gray-300
```

### Buttons
```
// Primary
bg-indigo-600 hover:bg-indigo-700   // No dark mode change needed

// Secondary
bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
text-gray-900 dark:text-white
```

### Hover States
```
hover:bg-gray-50 dark:hover:bg-gray-700
hover:bg-gray-100 dark:hover:bg-gray-600
hover:text-gray-900 dark:hover:text-gray-100
```
