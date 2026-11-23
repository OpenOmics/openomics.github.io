import { useEffect, useRef, useState } from 'react';
import RollingText from './RollingText.jsx';

export default function Header({ page, links }) {
  const navigation = [
    { href: links.approach, label: 'Our approach' },
    { href: links.pipelines, label: 'The pipelines', current: page === 'pipelines' },
    { href: links.gettingStarted, label: 'Get started' },
    { href: links.community, label: 'Community' },
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  return (
    <header>
      <div className="wrap header-row">
        <a className="brand" href={links.home} aria-label="OpenOmics home">
          <span className="brand-mark" aria-hidden="true" />
          OpenOmics
        </a>
        <button
          ref={menuButton}
          className="menu-toggle"
          id="menuToggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close −' : 'Menu +'}
        </button>
        <nav className={`nav${menuOpen ? ' open' : ''}`} id="nav" aria-label="Main navigation">
          {navigation.map(({ href, label, current }) => (
            <a key={href} href={href} aria-current={current ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
              <RollingText>{label}</RollingText>
            </a>
          ))}
          <a
            className="nav-git"
            href="https://github.com/OpenOmics"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
