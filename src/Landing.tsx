import { Brand, LinkArrow } from './Brand';
import { oldRate, reviewPath } from './data';
import { LiveExample } from './LiveExample';

const samplePath = reviewPath(oldRate.id);

export function Landing() {
  return <div className="landing">
    <header className="site-header wrap">
      <Brand />
      <a className="header-link" href="#sample-cases">Sample cases</a>
    </header>
    <main>
      <section className="hero wrap" aria-labelledby="landing-title">
        <div className="hero-copy">
          <h1 id="landing-title">Spot an overcharge<br /> <em>before you pay.</em></h1>
          <p>A café was billed $12 per bag of coffee. Its supplier had agreed to $10. Change the numbers to see the difference.</p>
          <a className="primary" href={reviewPath('upload')}>Check an invoice <LinkArrow /></a>
          <a className="text-link" href={samplePath}>See the $200 example</a>
        </div>
        <LiveExample />
      </section>
      <section id="sample-cases" className="samples">
        <div className="wrap sample-grid">
          <div><h2>Three ways a check can go</h2><p>Each example checks one line of a bill against the supplier’s price on the invoice date. Open any case to change its inputs.</p></div>
          <ul>
            <li><a href={samplePath}><span><strong>Old rate</strong><small>The café was charged $12 per bag instead of $10.</small></span><LinkArrow /></a></li>
            <li><a href={reviewPath('correct-rate')}><span><strong>Correct rate</strong><small>The café was charged the agreed $10 per bag.</small></span><LinkArrow /></a></li>
            <li><a href={reviewPath('missing-clause')}><span><strong>Missing clause</strong><small>The agreement does not give a price for decaf.</small></span><LinkArrow /></a></li>
          </ul>
        </div>
      </section>
    </main>
    <footer className="wrap site-footer"><p>Supplier Invoice Reviewer · Fictional café example</p><a href="https://github.com/awaisarif18/supplier-invoice-reviewer">Source code</a></footer>
  </div>;
}
