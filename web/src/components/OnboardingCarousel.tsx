import { useState } from 'react';
import './onboarding.css';

interface Slide {
  image: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    image: '/onboarding/onboarding-1.png',
    title: 'Faso Tontine, dans votre navigateur',
    body: 'Retrouvez vos groupes d’épargne où que vous soyez, sans rien installer.',
  },
  {
    image: '/onboarding/onboarding-2.png',
    title: 'Toute votre activité, d’un coup d’œil',
    body: 'Tontines, cotisations, messages et demandes réunis dans un seul tableau de bord.',
  },
  {
    image: '/onboarding/onboarding-3.png',
    title: 'Gardez le contact avec votre réseau',
    body: 'Échangez avec vos groupes, suivez les demandes d’adhésion, restez informé en direct.',
  },
  {
    image: '/onboarding/onboarding-4.png',
    title: 'Vos informations en sécurité',
    body: 'Vérification d’identité et protection des données à chaque étape.',
  },
];

export default function OnboardingCarousel({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  function next() {
    if (isLast) {
      onFinish();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-panel">
        <div className="onboarding-slide">
          <img src={slide.image} alt="" className="onboarding-image" />
          <h2 className="onboarding-title">{slide.title}</h2>
          <p className="onboarding-body">{slide.body}</p>
        </div>

        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`onboarding-dot${i === step ? ' onboarding-dot-active' : ''}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          {!isLast && (
            <button type="button" className="onboarding-skip" onClick={onFinish}>
              Passer
            </button>
          )}
          <div className="onboarding-spacer" />
          <button type="button" className="onboarding-next" onClick={next}>
            {isLast ? 'Commencer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
}
