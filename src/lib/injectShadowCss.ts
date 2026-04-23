// Shadow DOM CSS injection for PowerSchool integration
// Prevents CSS conflicts between PowerSchool and our plugin

export function injectShadowCss(shadowRoot: ShadowRoot, additionalCss: string = '') {
  // Create a style element
  const style = document.createElement('style');
  
  // Base CSS for ELD Progress Report - includes our design system
  const baseCss = `
    :host {
      --font-sans: 'Nunito', 'Segoe UI', system-ui, -apple-system, sans-serif;
      --font-mono: 'DM Mono', 'Courier New', monospace;
      font-family: var(--font-sans);
      font-size: 15px;
      line-height: 1.55;

      /* Colors */
      --color-navy: #1a3a5c;
      --color-gold: #f5bc14;
      --color-blue: #1976d2;
      --color-blue-light: #e3f2fd;
      --color-error: #c62828;
      --color-error-bg: #ffebee;
      --color-surface: #fff;
      --color-surface-alt: #f5f5f5;
      --color-border: #ddd;
      --color-shadow: 0 2px 4px rgba(0,0,0,0.08);

      /* Sizing */
      --radius-sm: 4px;
      --radius-md: 8px;
      --shadow-sm: 0 2px 4px rgba(0,0,0,0.08);
      --max-width: 1200px;
    }

    /* Reset and base styles */
    * {
      box-sizing: border-box;
    }

    /* Ensure our components render properly in shadow DOM */
    main {
      background: var(--color-surface-alt);
      font-family: var(--font-sans);
      min-height: 100vh;
    }

    .eld, .eld-header, .stats, .table-wrap {
      background: var(--color-surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      color: var(--color-navy);
      max-width: var(--max-width);
      margin: 0 auto;
    }

    .btn {
      background: var(--color-blue);
      color: white;
      border-radius: var(--radius-sm);
      padding: 6px 16px;
      border: none;
      font-family: var(--font-sans);
      font-size: 13px;
      transition: background 0.15s;
      cursor: pointer;
    }

    .btn:hover {
      background: #1565c0;
    }
  `;

  // Combine base CSS with any additional CSS
  style.textContent = baseCss + additionalCss;

  // Inject into shadow root
  shadowRoot.appendChild(style);

  console.log('[ELD] Shadow DOM CSS injected');
}