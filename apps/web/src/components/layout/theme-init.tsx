import Script from 'next/script';

// Run before body content can paint, including a new document on locale navigation.
// The theme provider remains the owner of live preferences and System changes.
const themeInit = `(()=>{try{const stored=localStorage.getItem('theme');const theme=stored==='dark'||stored==='light'?stored:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';const root=document.documentElement;root.classList.remove('light','dark');root.classList.add(theme);root.dataset.theme=theme;root.style.colorScheme=theme}catch{const theme=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.classList.add(theme);document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}})();`;

export function ThemeInit() {
  // This locale layout is the document root and owns the html/head elements.
  // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
  return <Script id="amc-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInit }} />;
}
