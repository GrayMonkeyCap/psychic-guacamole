import { useCallback, useEffect, useState } from 'react';
import FirstLevel from './FirstLevel';
import CampaignHome from './CampaignHome';

const isLevel = () => ['#factory-trial', '#system-lab', '#url-shortener'].includes(window.location.hash);

export default function App() {
  const [screen, setScreen] = useState(() => isLevel() ? 'level' : 'campaign');
  const [forceTutorial, setForceTutorial] = useState(false);

  useEffect(() => {
    const route = () => setScreen(isLevel() ? 'level' : 'campaign');
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const openLevel = useCallback((tutorial = false) => {
    setForceTutorial(tutorial);
    window.history.replaceState(null, '', '#system-lab');
    setScreen('level');
  }, []);

  const exit = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname);
    setScreen('campaign');
  }, []);

  const recordResult = useCallback(result => {
    try {
      const previous = Math.max(0, Math.min(3, Number(localStorage.getItem('system-sandbox:url-shortener:stars')) || 0));
      localStorage.setItem('system-sandbox:url-shortener:stars', String(Math.max(previous, result.stars)));
    } catch { /* Progress saving is optional. */ }
  }, []);

  return screen === 'campaign'
    ? <CampaignHome onOpenLevel={() => openLevel()} onOpenTutorial={() => openLevel(true)} />
    : <FirstLevel onExit={exit} onLevelResult={recordResult} forceTutorial={forceTutorial} />;
}
