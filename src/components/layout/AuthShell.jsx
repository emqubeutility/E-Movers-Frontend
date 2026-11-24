import { useEffect, useState } from 'react';
import logo from '../../assets/emove-login.png';
import sceneHtml from '../../assets/login-scene.html?raw';
import { APP_NAME } from '../../lib/constants.js';
import '../../styles/login.css';

// Static artwork (sky, Dubai skyline layers, road and the truck); no user data goes into it.
// The truck stays put while the layers scroll past it (see login.css).
// The truck carries the same official logo as the page header.
const SCENE = sceneHtml.replace('{{TRUCK}}', logo);

/** Sign-in shell: a daytime skyline driving past the truck, the sign-in card (with the logo) on the right. */
export default function AuthShell({ title, subtitle, children, footer }) {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);

  // Pause the scene while the tab is hidden so it uses no CPU, GPU or battery in the background.
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return (
    <div className={`lg-page${hidden ? ' is-paused' : ''}`}>
      <div className="lg-scene" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SCENE }} />
      <div className="lg-row">
        {/* Keeps the card on the right so the skyline and truck stay in view. */}
        <section className="lg-left" />

        <main className="lg-card">
          <img className="lg-card-logo" src={logo} alt="E-Movers" />
          <h1>{title}</h1>
          <p className="lg-sub">{subtitle}</p>
          {children}
          {footer && <p className="lg-switch">{footer}</p>}
        </main>
      </div>
    </div>
  );
}
