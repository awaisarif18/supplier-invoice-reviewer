import { createRoot } from 'react-dom/client';
import { Landing } from './Landing';
import { reviewPath, samples } from './data';
import '@fontsource/instrument-serif/latin-400.css';
import './landing.css';

const linkedCase = samples.find(sample => `#${sample.id}` === location.hash);
if (linkedCase) {
  location.replace(reviewPath(linkedCase.id));
} else {
  createRoot(document.getElementById('root')!).render(<Landing />);
}
