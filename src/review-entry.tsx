import { createRoot } from 'react-dom/client';
import { ReviewPage } from './ReviewPage';
import './review.css';

const root = document.getElementById('root')!;
createRoot(root).render(<ReviewPage caseId={root.dataset.case ?? ''} />);
