# CSS Architecture Documentation

## Overview
This directory contains all CSS files for the Penetration Testing Platform web interface. The CSS is organized into modular files for better maintainability and performance.

## File Structure

### 1. main.css (Base Styles)
- **Purpose**: Core styles and base layout
- **Contains**:
  - CSS Variables (colors, spacing, shadows)
  - Reset and base styles
  - Sidebar navigation
  - Header and main content layout
  - Basic card and button styles
  - Stats grid and activity lists
  - Modal and toast notifications
  - Responsive breakpoints

### 2. enhancements.css (Enhanced Components)
- **Purpose**: Enhanced UI components and utilities
- **Contains**:
  - Enhanced form controls with validation
  - Button variants and sizes
  - Card variants (primary, success, danger, etc.)
  - Enhanced tables (striped, hover, bordered)
  - Progress bars and alerts
  - Tooltips and dropdowns
  - List groups and breadcrumbs
  - Tabs and accordions
  - Utility classes (display, flex, spacing, text, etc.)
  - Responsive utilities
  - Animation classes
  - Hover effects
  - Print styles
  - Accessibility features

### 3. components.css (Shared Components)
- **Purpose**: Reusable component styles
- **Contains**:
  - Button groups and icon buttons
  - Loading buttons
  - Form floating labels
  - Input groups
  - Form validation styles
  - Card images and titles
  - Card decks
  - Table responsive wrappers
  - Toast notifications
  - Loading screens and spinners
  - Skeleton loaders
  - Status indicators
  - Severity badges
  - Pagination
  - Modal dialogs

### 4. pages.css (Page-Specific Styles)
- **Purpose**: Styles specific to each page
- **Contains**:
  - Dashboard page styles
  - Web scan page styles
  - Phishing campaign page styles
  - Network analysis page styles
  - Reports page styles
  - Authorizations page styles
  - Audit logs page styles
  - Vulnerability details modal
  - Responsive design for pages
  - Print styles for pages

### 5. performance.css (Performance Optimizations)
- **Purpose**: Performance-focused CSS
- **Contains**:
  - Critical CSS for above-the-fold content
  - Font loading optimizations
  - GPU acceleration for animations
  - Image optimization
  - Lazy loading styles
  - Content visibility API
  - CSS containment
  - Reduced paint areas
  - Scroll optimizations
  - Resource hints documentation

## CSS Variables

### Colors
```css
--primary-color: #667eea
--secondary-color: #764ba2
--success-color: #10b981
--danger-color: #ef4444
--warning-color: #f59e0b
--info-color: #3b82f6
--dark-color: #1e293b
--light-color: #f8fafc
--border-color: #e2e8f0
--text-color: #334155
```

### Severity Colors
```css
--critical-color: #dc2626
--high-color: #f97316
--medium-color: #eab308
--low-color: #3b82f6
```

### Spacing
```css
--spacing-xs: 0.25rem
--spacing-sm: 0.5rem
--spacing-md: 1rem
--spacing-lg: 1.5rem
--spacing-xl: 2rem
```

### Border Radius
```css
--radius-sm: 0.25rem
--radius-md: 0.5rem
--radius-lg: 0.75rem
--radius-xl: 1rem
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

## RTL Support
All styles are designed with RTL (Right-to-Left) support for Arabic language:
- Text alignment defaults to right
- Margins and paddings are mirrored
- Icons and navigation are positioned for RTL
- Flexbox and grid layouts work correctly in RTL

## Responsive Design
The interface is fully responsive with breakpoints at:
- **Mobile**: < 576px
- **Tablet**: 576px - 768px
- **Desktop**: 768px - 992px
- **Large Desktop**: > 992px

## Performance Optimizations

### 1. Critical CSS
- Above-the-fold styles are prioritized
- Font loading uses `font-display: swap`
- GPU acceleration for animations

### 2. Layout Optimization
- CSS containment for isolated components
- Content visibility API for off-screen content
- Fixed table layout for better performance

### 3. Animation Optimization
- Transitions limited to `transform` and `opacity`
- Reduced motion support for accessibility
- Will-change property for animated elements

### 4. Image Optimization
- Lazy loading support
- Responsive images with max-width
- SVG optimization

## Accessibility Features

### 1. Screen Reader Support
- `.sr-only` class for screen reader only content
- `.sr-only-focusable` for keyboard navigation
- Proper ARIA labels and roles

### 2. Keyboard Navigation
- Focus visible styles for keyboard users
- Skip to main content link
- Proper tab order

### 3. High Contrast Mode
- Support for `prefers-contrast: high`
- Enhanced borders and outlines

### 4. Reduced Motion
- Support for `prefers-reduced-motion`
- Minimal animations for users who prefer reduced motion

## Browser Support
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Best Practices

### 1. Class Naming
- Use kebab-case for class names
- Use BEM methodology where appropriate
- Prefix utility classes with purpose (e.g., `d-flex`, `text-center`)

### 2. Specificity
- Avoid using `!important` unless necessary
- Keep specificity low for easier overrides
- Use classes over IDs for styling

### 3. Performance
- Minimize use of expensive properties (box-shadow, filter)
- Use CSS transforms instead of position changes
- Limit number of repaints and reflows

### 4. Maintainability
- Group related styles together
- Comment complex or non-obvious code
- Use CSS variables for repeated values

## Future Improvements
- [ ] Implement CSS-in-JS for dynamic theming
- [ ] Add dark mode support
- [ ] Create minified production builds
- [ ] Implement CSS modules for better scoping
- [ ] Add more animation presets
- [ ] Create a component library documentation

## Contributing
When adding new styles:
1. Determine which file the styles belong to
2. Follow existing naming conventions
3. Add comments for complex styles
4. Test in all supported browsers
5. Ensure RTL compatibility
6. Check accessibility compliance
7. Optimize for performance

