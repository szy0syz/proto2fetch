import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'proto2fetch',
  description: 'Generate TypeScript-friendly API client from protobuf definitions with ky HTTP client',
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/guide/' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Quick Start', link: '/guide/quick-start' }
        ]
      },
      {
        text: 'Features',
        items: [
          { text: 'Code Generation', link: '/guide/code-generation' },
          { text: 'Authentication', link: '/guide/authentication' },
          { text: 'Error Handling', link: '/guide/error-handling' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'CLI Commands', link: '/api/cli' },
          { text: 'Runtime API', link: '/api/runtime' },
          { text: 'Configuration', link: '/api/configuration' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Basic Usage', link: '/examples/basic' },
          { text: 'Authentication', link: '/examples/auth' },
          { text: 'Advanced Usage', link: '/examples/advanced' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/szy0syz/proto2fetch' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present szy0syz'
    }
  }
})