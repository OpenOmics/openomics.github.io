import { Fragment, useEffect, useRef, useState } from 'react';
import RollingText from './RollingText.jsx';

export default function Header({ page, links, base = '/' }) {
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
          <img className="brand-mark" src={`${base}openomics-logo.png`} width="36" height="36" alt="" />
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
          {navigation.map(({ href, label, current }, index) => (
            <Fragment key={href}>
              {index > 0 && <span className="nav-separator" aria-hidden="true">/</span>}
              <a href={href} aria-current={current ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                <RollingText>{label}</RollingText>
              </a>
            </Fragment>
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
