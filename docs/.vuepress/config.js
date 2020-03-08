module.exports = {
  title: 'Aloes - Device manager',
  base: '/device-manager/',
  dest: 'public',
  themeConfig: {
    logo: '/logo.png',
    repo: 'https://framagit.org/aloes/device-manager',
    repoLabel: 'Git',
    docsDir: 'docs',
    nav: [{ text: 'Readme', link: '/readme/' }, { text: 'API', link: '/api/' }],
    sidebar: [
      ['/readme/', 'Readme'],
      ['/api/', 'API'],
      ['/lib/', 'Libraries'],
      ['/services/', 'Services'],
    ],
    serviceWorker: {
      updatePopup: true, // Boolean | Object, default to undefined.
      // If set to true, the default text config will be:
      updatePopup: {
        message: 'New content is available.',
        buttonText: 'Refresh',
      },
    },
  },
};
